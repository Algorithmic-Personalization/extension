import type SubAppCreator from './SubApp';
import {type SubAppInstance, type SubAppState} from './SubApp';
import {type Api} from './api';
import {type ParticipantConfig} from './common/models/experimentConfig';
import {log, isLoggedInForSure, saveToLocalStorage, getFromLocalStorage} from './lib';

type ElementToWaitFor = {
	selector: string;
	resolve: (elt: Element) => void;
	timeout: NodeJS.Timeout;
};

const loadPersistedConfig = () => {
	const item = getFromLocalStorage('config');
	if (item) {
		return JSON.parse(item) as ParticipantConfig;
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
	};

	api.addOnLogoutListener(() => {
		triggerUpdate({config: undefined});
	});

	let previousUrl: string | undefined;

	const onUrlChange = (url: string) => {
		log('URL changed to', url);
		triggerUpdate({url});
	};

	const observer = new MutationObserver(() => {
		if (location.href !== previousUrl) {
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
		Object.assign(state, newState);

		if (newState.config) {
			state.loggedInExtension = true;
			saveToLocalStorage('config', JSON.stringify(newState.config));
		}

		if (Object.prototype.hasOwnProperty.call(newState, 'config') && !newState.config) {
			state.loggedInExtension = false;
			saveToLocalStorage('config', '');
		}

		Object.assign(state, newState);

		for (const app of subAppInstances) {
			app.onUpdate(state).then(() => {
				log('Sub-app', app.getName(), 'updated successfully');
			}, err => {
				console.error('Error updating sub-app', app.getName(), ':', err);
			});
		}
	};

	const start = async () => {
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
