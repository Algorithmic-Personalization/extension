import type SubAppCreator from './SubApp';
import {type SubAppInstance, type SubAppState} from './SubApp';
import {type Api} from './api';
import {log, isLoggedInForSure, saveToLocalStorage, getFromLocalStorage} from './lib';

type ElementToWaitFor = {
	selector: string;
	resolve: (elt: Element) => void;
	timeout: NodeJS.Timeout;
};

export const createExtension = (api: Api) => (subApps: SubAppCreator[]) => {
	let elementsToWaitFor: ElementToWaitFor[] = [];
	const subAppInstances: SubAppInstance[] = [];
	const state: SubAppState = {
		loggedInYouTube: getFromLocalStorage('loggedInYouTube') === 'true',
	};

	let previousUrl: string | undefined;

	const onUrlChange = (url: string) => {
		log('URL changed to', url);
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
		}

		for (const app of subAppInstances) {
			app.onUpdate(state);
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

			instance.setup(state).then(_elements => {
				log('Sub-app', instance.getName(), 'setup complete');
			}).catch(err => {
				log('error', 'setting up sub-app', instance.getName(), err);
			});
		}

		isLoggedInForSure().then(loggedIn => {
			const isLoggedIn = loggedIn === 'yes';
			saveToLocalStorage('loggedInYouTube', isLoggedIn ? 'true' : 'false');

			if (state.loggedInYouTube !== isLoggedIn) {
				state.loggedInYouTube = isLoggedIn;

				for (const app of subAppInstances) {
					app.onUpdate(state);
				}
			}
		}).catch(err => {
			log('error', 'checking if logged in', err);
		});

		// TODO: watch for logout and disable API in that case
	};

	return {
		start,
	};
};

export default createExtension;
