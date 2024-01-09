import React from 'react';
import {createRoot} from 'react-dom/client';

import {ThemeProvider} from '@mui/material';

import {isOnVideoPage, isVideoPage, isOnHomePage, log, urlExists} from './lib';
import fetchRecommendationsToInject from './fetchYtChannelRecommendations';
import App from './App';
import theme from './theme';

import HomeVideoCard, {getHomeMiniatureUrl} from './components/HomeVideoCard';

import {defaultApi as api, apiProvider as ApiProvider} from './apiProvider';

import WatchTimeEvent from './common/models/watchTimeEvent';
import HomeShownEvent from './common/models/homeShownEvent';
import {type Recommendation} from './common/types/Recommendation';
import {Event as AppEvent, EventType} from './common/models/event';

let root: HTMLElement | undefined;
let previousUrl: string | undefined;
const idsReplaced = new Set<string>();

if (api.getSession() === undefined) {
	api.newSession().catch(e => {
		console.log('Failed to create new session at page load:', e);
	});
}

let watchTime: number;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === 'your-tab-is-active') {
		console.log('Oh, this tab got activated!', message);
		api.setTabActive(true);
	} else if (message.type === 'your-tab-is-not-active') {
		console.log('Oh, this tab got deactivated!', message);
		api.setTabActive(false);
	}

	sendResponse({
		type: 'kthxbai',
	});
});

const attemptToSaveWatchTime = (url: string) => {
	console.log('Attempting to save watch time for', url, 'of', watchTime, 'seconds');

	if (watchTime && watchTime > 0) {
		const event = new WatchTimeEvent(watchTime);
		event.url = url;
		api.postEvent(event, true).catch(console.error);
		watchTime = 0;
	}
};

let prevWatchTime: number;
let prevCurrentTime: number;

const videoListener = (event: Event) => {
	const video: HTMLVideoElement = event.target as HTMLVideoElement;

	const ct = video.currentTime;
	const deltaT = ct - prevCurrentTime;
	prevCurrentTime = ct;

	if (deltaT > 0 && deltaT < 1) {
		watchTime += deltaT;

		// Only log every 5 seconds to avoid spamming the console
		if (watchTime - prevWatchTime > 5) {
			console.log('WATCH TIME', watchTime);
			prevWatchTime = watchTime;
		}
	}
};

const watchVideoEvents = () => {
	const videoElement = document.querySelector('.html5-video-container video');

	const video = videoElement as HTMLVideoElement;

	watchTime = 0;
	prevWatchTime = 0;
	prevCurrentTime = 0;

	console.log('WATCHING VIDEO TIME UPDATE EVENTS');

	video.removeEventListener('timeupdate', videoListener);
	video.addEventListener('timeupdate', videoListener);
};

window.addEventListener('unload', () => {
	attemptToSaveWatchTime(window.location.href);
});

const findParentById = (elId: string) => (elt: Element): Element | undefined => {
	const recurse = findParentById(elId);

	if (elt.id === elId) {
		return elt;
	}

	if (elt.parentElement) {
		return recurse(elt.parentElement);
	}

	return undefined;
};

type HomeVideo = {
	videoId: string;
	title: string;
	url: string;
};

const getVideoTitle = (node: HTMLElement): string | undefined => {
	const maybeTitle = node.querySelector('#video-title');

	if (maybeTitle) {
		return maybeTitle.textContent?.trim();
	}

	if (node.parentElement && node.id !== 'content') {
		return getVideoTitle(node.parentElement);
	}

	return undefined;
};

const getHomeVideos = (): HomeVideo[] => {
	const links: HTMLAnchorElement[] = Array.from(document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="]'));
	const maybeRes: Array<HomeVideo | undefined> = links.map(link => {
		const videoExp = /\?v=(.+)$/;
		const maybeMatch = videoExp.exec(link.href);

		if (!maybeMatch) {
			return undefined;
		}

		const videoId = maybeMatch[1];

		const title = getVideoTitle(link);

		if (!title) {
			return undefined;
		}

		return {
			videoId,
			title,
			url: link.href,
		};
	});

	return maybeRes.filter(Boolean) as HomeVideo[];
};

const replaceHomeVideo = (videoId: string, recommendation: Recommendation): 0 | 1 => {
	const links = Array.from(document.querySelectorAll(`a.ytd-thumbnail[href="/watch?v=${videoId}"]`));

	if (links.length === 0) {
		console.error('could not find link for', videoId);
		return 0;
	}

	if (links.length > 1) {
		console.error('found multiple links for', videoId);
		return 0;
	}

	const [link] = links;

	console.log('link for', videoId, link, 'to replace with', recommendation);

	const parent = findParentById('content')(link);

	if (!parent) {
		console.error('could not find parent for', videoId);
		return 0;
	}

	console.log('parent for', videoId, parent);

	const onInjectedVideoCardClicked = async () => {
		const event = new AppEvent();
		event.type = EventType.HOME_INJECTED_TILE_CLICKED;
		event.url = recommendation.url;
		event.context = window.location.href;
		void api.postEvent(event, true).catch(log);
	};

	const card = (
		<React.StrictMode>
			<ThemeProvider theme={theme}>
				<HomeVideoCard {
					...{
						...recommendation,
						onClick: onInjectedVideoCardClicked,
					}} />
			</ThemeProvider>
		</React.StrictMode>
	);

	createRoot(parent).render(card);
	return 1;
};

let homeLinkChanged = false;
if (!homeLinkChanged) {
	const el = document.querySelector('yt-icon#logo-icon');
	log('home link elt', el);

	el?.addEventListener('click', e => {
		log('home link clicked');
		homeLinkChanged = false;
		e.preventDefault();
		window.location.href = 'https://www.youtube.com/';
	});
}

let homePageChanged = false;

const findHighestSingleParent = (elt: HTMLElement): HTMLElement => {
	if (elt.parentElement && elt.parentElement.children.length === 1) {
		return findHighestSingleParent(elt.parentElement);
	}

	return elt;
};

const homeVideos: HomeVideo[] = [];
const injectionSource: Recommendation[] = [];

const _findInitialDataScript = (): HTMLScriptElement | undefined => {
	const scripts = Array.from(document.querySelectorAll('script'));

	const s = scripts.find(script => {
		const {textContent} = script;

		if (textContent) {
			return textContent.trimStart().startsWith('var ytInitialData = ');
		}

		return false;
	});

	return s;
};

const findInitialDataScript = async (): Promise<HTMLScriptElement | undefined> =>
	new Promise(resolve => {
		const s = _findInitialDataScript();

		if (s) {
			resolve(s);
			return;
		}

		const observer = new MutationObserver(() => {
			const s = _findInitialDataScript();

			if (s) {
				observer.disconnect();
				resolve(s);
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});

const onVisitHomePageFirstTime = async () => {
	log('onVisitHomePageFirstTime');
	const recommendationsSource = 'UCtFRv9O2AHqOZjjynzrv-xg';
	log('getting the recommendations to inject...');
	const rawInjectionSource = (await fetchRecommendationsToInject(recommendationsSource))
		.map(({recommendation}) => recommendation).slice(0, 10);

	const filterPromises = rawInjectionSource.map(async r => {
		const exists = await urlExists(getHomeMiniatureUrl(r.videoId));
		return {ok: exists, rec: r};
	});

	const filtered = await Promise.all(filterPromises);

	for (const {ok, rec} of filtered) {
		if (ok) {
			injectionSource.push(rec);
		}
	}

	log('injection source:', injectionSource);

	const script = await findInitialDataScript();

	if (!script) {
		console.error('Could not find ytInitialData script on home page.');
		return;
	}

	const jsonText = script.textContent?.replace('var ytInitialData = ', '').replace(/;$/, '').trim();

	if (!jsonText) {
		console.error('Could not find ytInitialData JSON on home page.');
		return;
	}

	try {
		/* Doesn't work, not in order
		const initialData = JSON.parse(jsonText) as Record<string, unknown>;
		log('extracting recommendations from home JSON...');
		const preHomeContent = extractRecommendations(initialData);
		log('home content before filtering', preHomeContent);
		const homeContent = preHomeContent
			.filter(r => r.path.length === 12)
			.map(r => r.recommendation);
		log('home content after filter', homeContent);
		homeVideos.splice(0, homeVideos.length, ...homeContent);
		*/

		homeVideos.splice(0, homeVideos.length, ...getHomeVideos());
		log('home videos:', homeVideos);

		const config = await api.getConfig();
		if (config.kind === 'Failure') {
			console.error('Could not get config:', config.message);
			return;
		}

		if (config.value.arm === 'control') {
			return;
		}

		const replace = () => {
			if (injectionSource.length < 3) {
				return false;
			}

			let total = 0;
			for (let i = 0; i < 3; ++i) {
				const {videoId} = homeVideos[i];
				if (idsReplaced.has(videoId)) {
					total += 1;
					continue;
				}

				total += replaceHomeVideo(videoId, injectionSource[i]);
				idsReplaced.add(homeVideos[i].videoId);
			}

			return total === 3;
		};

		while (!replace()) {
			// eslint-disable-next-line no-await-in-loop
			await new Promise(resolve => {
				setTimeout(resolve, 100);
			});
		}
	} catch (error) {
		console.error(error);
	}
};

const onVisitHomePage = () => {
	if (!injectionSource) {
		return;
	}

	log('all videos extracted', {
		homeVideos,
		injectionSource,
	});

	const e = new HomeShownEvent(
		homeVideos.slice(0, 15),
		injectionSource.slice(0, 10),
	);

	log('onVisitHomePage', e);

	api.postEvent(e, true).catch(console.error);
};

const urlChanged = (): boolean =>
	window.location.href !== previousUrl;

const observer = new MutationObserver(async () => {
	if (urlChanged()) {
		if (isVideoPage(previousUrl)) {
			attemptToSaveWatchTime(previousUrl);
		}

		if (isOnVideoPage()) {
			// If we arrive on a video page, start watching the video
			// for watch time events...
			// Beware that this will reset watch time of previous video.
			watchVideoEvents();
		}

		// Update the previous URL AFTER saving the watch time
		previousUrl = window.location.href;

		if (isOnHomePage()) {
			if (!homePageChanged) {
				homePageChanged = true;
				await onVisitHomePageFirstTime().catch(log);
			}

			onVisitHomePage();
		}

		api.sendPageView();
	}

	const related = document.querySelector('#related');

	if (!related) {
		return;
	}

	const relatedElt: HTMLElement = related as HTMLElement;

	if (relatedElt.style.display === 'none') {
		return;
	}

	if (!relatedElt.parentElement) {
		return;
	}

	relatedElt.style.display = 'none';

	if (!root) {
		root = document.createElement('div');

		createRoot(root).render((
			<React.StrictMode>
				<ThemeProvider theme={theme}>
					<ApiProvider value={api}>
						<App />
					</ApiProvider>
				</ThemeProvider>
			</React.StrictMode>
		));
	}

	relatedElt.parentElement.appendChild(root);
});

observer.observe(document.body, {
	childList: true,
	subtree: true,
});

