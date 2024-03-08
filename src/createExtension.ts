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

/* D
const createDebounce = (ms: number) => (fn: () => void) => {
	let timeout: NodeJS.Timeout;

	return () => {
		clearTimeout(timeout);
		timeout = setTimeout(fn, ms);
	};
};

const debounce = createDebounce(500);
*/

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

	let watchTime = 0;
	let lastDisplayedTime = 0;
	let currentTime = 0;
	let urlWatched: string | undefined;

	const timeUpdate = (e: Event) => {
		const newCurrentTime = (e.target as HTMLVideoElement).currentTime;

		const dt = newCurrentTime - currentTime;
		currentTime = newCurrentTime;

		if (dt > 0) {
			watchTime += dt;
		}

		if (watchTime - lastDisplayedTime > 10) {
			lastDisplayedTime = watchTime;
			log('watch time:', watchTime);
		}
	};

	api.addOnLogoutListener(() => {
		triggerUpdate({config: undefined});
	});

	const watchVideoEvents = (video: HTMLVideoElement, url: string) => {
		video.removeEventListener('timeupdate', timeUpdate);
		video.addEventListener('timeupdate', timeUpdate);
		urlWatched = url;
	};

	const saveWatchTime = () => {
		if (urlWatched) {
			if (watchTime > 0) {
				log('saving watch time for', urlWatched, 'with', watchTime, 'seconds');
				const event = new WatchTimeEvent(watchTime);
				event.url = urlWatched;
				api.postEvent(event, true).then(() => {
					log('watch time event sent successfully');
				}, err => {
					console.error('failed to send watch time event', err);
				});

				watchTime = 0;
				lastDisplayedTime = 0;
			}
		}
	};

	const onUnload = () => {
		saveWatchTime();
	};

	const setupVideoWatching = (url: string) => {
		if (isVideoPage(url)) {
			log('looking for a video element on', url);
			const video = document.querySelector('video');

			if (video) {
				log('video element found:', video);
				watchVideoEvents(video, url);
				document.removeEventListener('unload', onUnload);
				document.addEventListener('unload', onUnload);
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

	const checkLoggedInYouTube = () => {
		isLoggedInForSure().then(loggedIn => {
			const isLoggedIn = loggedIn === 'yes';
			saveToLocalStorage('loggedInYouTube', isLoggedIn ? 'true' : 'false');

			if (state.loggedInYouTube !== isLoggedIn) {
				triggerUpdate({loggedInYouTube: isLoggedIn});
			}
		}).catch(err => {
			console.error('error checking if logged in to YouTube', err);
		});
	};

	// D const checkLoggedInYouTubeDebounced = debounce(checkLoggedInYouTube);

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

		// D checkLoggedInYouTubeDebounced();

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

	const doTriggerUpdate = (newState: Partial<SubAppState>) => {
		log('new state received:', newState);

		const updatedState = {...state, ...newState};

		if (newState.url !== state.url && newState.url) {
			saveWatchTime();
			setupVideoWatching(newState.url);
		}

		if (newState.config) {
			updatedState.loggedInExtension = true;

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

		if (!updatedState.loggedInYouTube) {
			removeLoaderMask();
		}

		if (Object.prototype.hasOwnProperty.call(newState, 'config') && !newState.config) {
			updatedState.loggedInExtension = false;
			saveToLocalStorage('config', '');
		}

		for (const app of subAppInstances) {
			app.onUpdate(updatedState, state).catch(err => {
				removeLoaderMask();
				console.error('Error updating sub-app', app.getName(), ':', err);
			});
		}

		Object.assign(state, updatedState);
	};

	const triggerUpdate = (newState: Partial<SubAppState>) => {
		try {
			doTriggerUpdate(newState);
		} catch (err) {
			console.error('Error triggering apps update:', err);
			removeLoaderMask();
		}
	};

	const doStart = async () => {
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

		checkLoggedInYouTube();

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
	};

	const start = async () => {
		try {
			await doStart();
		} catch (err) {
			removeLoaderMask();
			console.error('Failed to start extension:', err);
		}
	};

	return {
		start,
	};
};

export default createExtension;
