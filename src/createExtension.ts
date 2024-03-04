import type SubAppCreator from './SubApp';
import {type SubAppInstance, type SubAppState} from './SubApp';
import {type Api} from './api';
import {type ParticipantConfig} from './common/models/experimentConfig';
import WatchTimeEvent from './common/models/watchTimeEvent';
import {
	log,
	isLoggedInForSure,
	saveToLocalStorage,
	getFromLocalStorage,
	removeLoaderMask,
	isVideoPage,
} from './lib';

type ElementToWaitFor = {
	selector: string;
	resolve: (elt: Element) => void;
	timeout: NodeJS.Timeout;
};

const loadPersistedConfig = () => {
	const item = getFromLocalStorage('config');

	try {
		if (item) {
			return JSON.parse(item) as ParticipantConfig;
		}
	} catch (err) {
		log('Error parsing config from local storage:', {err, item});
		return undefined;
	}

	return undefined;
};

export const createExtension = (api: Api) => (subApps: SubAppCreator[]) => {
	let elementsToWaitFor: ElementToWaitFor[] = [];
	const subAppInstances: SubAppInstance[] = [];

	const config = loadPersistedConfig();

	const state: SubAppState = {
		loggedInYouTube: getFromLocalStorage('loggedInYouTube') === 'true',
		config,
		loggedInExtension: Boolean(config),
		url: location.href,
	};

	api.addOnLogoutListener(() => {
		triggerUpdate({config: undefined});
	});

	const watchVideoEvents = (video: HTMLVideoElement, url: string) => {
		let {currentTime} = video;
		let watchTime = 0;
		let lastDisplayedTime = 0;
		const {src} = video;

		const timeUpdate = () => {
			const newCurrentTime = video.currentTime;

			const dt = newCurrentTime - currentTime;

			if (dt > 0) {
				watchTime += dt;
			}

			if (watchTime - lastDisplayedTime > 10) {
				lastDisplayedTime = watchTime;
				log('watch time:', watchTime);
			}

			currentTime = video.currentTime;
		};

		video.addEventListener('timeupdate', timeUpdate);

		window.addEventListener('beforeunload', () => {
			saveWatchTime();
		});

		const saveWatchTime = () => {
			const wt = new WatchTimeEvent(watchTime);
			wt.url = url;
			watchTime = 0;

			api.postEvent(wt, true).then(() => {
				log('watch time event sent successfully');
			}, err => {
				console.error('failed to send watch time event', err);
			});
		};

		const loadedMetadata = () => {
			log('video metadata loaded', video);
			if (video.src !== src) {
				log('video source changed to', video.src);
				saveWatchTime();
				video.removeEventListener('loadedmetadata', loadedMetadata);
				video.removeEventListener('timeupdate', timeUpdate);
			}
		};

		video.addEventListener('loadedmetadata', loadedMetadata);

		log('watching video events on', video);
	};

	const setupVideoWatching = (url: string) => {
		if (isVideoPage(url)) {
			log('looking for a video element on', url);
			const video = document.querySelector('video');

			if (video) {
				log('video element found:', video);
				watchVideoEvents(video, url);
			} else {
				log('no video element found');
			}
		}
	};

	let previousUrl: string | undefined;

	const onUrlChange = (url: string) => {
		log('URL changed to', url);
		triggerUpdate({url});
	};

	const observer = new MutationObserver(_e => {
		/* Useless I think
		for (const change of e) {
			for (const v of Array.from(change.addedNodes)) {
				if (v.nodeName === 'VIDEO') {
					watchVideoEvents(v as HTMLVideoElement);
				}
			}
		}
		*/

		if (location.href !== previousUrl) {
			api.sendPageView();
			onUrlChange(location.href);
			previousUrl = location.href;
		}

		elementsToWaitFor = elementsToWaitFor.filter(({selector, resolve, timeout}) => {
			const elt = document.querySelector(selector);

			if (elt) {
				resolve(elt);
				clearTimeout(timeout);
				return false;
			}

			return true;
		});
	});

	const getElement = async (selector: string, timeoutMs = 10000): Promise<Element> => {
		const select = () => document.querySelector(selector);

		const elt = select();

		if (elt) {
			return elt;
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Timeout waiting for element with selector: ' + selector));
			}, timeoutMs);

			elementsToWaitFor.push({selector, resolve, timeout});
		});
	};

	const triggerUpdate = (newState: Partial<SubAppState>) => {
		log('new state received:', newState);

		const updatedState = {...state, ...newState};

		if (newState.url !== state.url && newState.url) {
			setupVideoWatching(newState.url);
		}

		if (newState.config) {
			state.loggedInExtension = true;

			if (!state.config) {
				saveToLocalStorage('config', JSON.stringify(newState.config));
			}
		}

		if (updatedState.config) {
			if (updatedState.config.arm === 'control') {
				removeLoaderMask();
			}

			if (updatedState.config.phase !== 1) {
				removeLoaderMask();
			}
		} else {
			removeLoaderMask();
		}

		if (Object.prototype.hasOwnProperty.call(newState, 'config') && !newState.config) {
			state.loggedInExtension = false;
			saveToLocalStorage('config', '');
		}

		for (const app of subAppInstances) {
			app.onUpdate(updatedState, state).then(() => {
				log('Sub-app', app.getName(), 'updated successfully');
			}, err => {
				console.error('Error updating sub-app', app.getName(), ':', err);
			});

			Object.assign(state, updatedState);
		}
	};

	const start = async () => {
		setupVideoWatching(state.url ?? '');

		getElement('yt-icon#logo-icon').then(elt => {
			log('YouTube logo found', elt);
			elt.addEventListener('click', e => {
				log('home link clicked');
				e.preventDefault();
				window.location.href = 'https://www.youtube.com/';
			});
		}, err => {
			console.error('Error getting home link:', err);
		});

		log('Starting extension with', subApps.length, 'sub-apps');
		log('Observing document for changes');
		observer.observe(document.documentElement, {childList: true, subtree: true});

		for (const app of subApps) {
			const instance = app({
				api,
				getElement,
				triggerUpdate,
			});

			subAppInstances.push(instance);

			triggerUpdate(state);
		}

		isLoggedInForSure().then(loggedIn => {
			const isLoggedIn = loggedIn === 'yes';
			saveToLocalStorage('loggedInYouTube', isLoggedIn ? 'true' : 'false');

			if (state.loggedInYouTube !== isLoggedIn) {
				triggerUpdate({loggedInYouTube: isLoggedIn});
			}
		}).catch(err => {
			log('error', 'checking if logged in', err);
		});

		if (api.getAuth()) {
			if (!state.config) {
				api.getConfig().then(cfg => {
					if (cfg.kind === 'Success') {
						triggerUpdate({config: cfg.value});
					} else {
						console.error('could not get config:', cfg.message);
					}
				}, err => {
					throw err as Error;
				});
			}

			api.newSession().then(uuid => {
				log('New session created:', uuid);
			}, err => {
				console.error('Error creating new session:', err);
			});
		}
		// TODO: watch for logout and disable API in that case
	};

	return {
		start,
	};
};

export default createExtension;
