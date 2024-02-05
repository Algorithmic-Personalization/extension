import React from 'react';
import {createRoot} from 'react-dom/client';

import {ThemeProvider} from '@mui/material';

import {isOnVideoPage, isVideoPage, isOnHomePage, log, urlExists} from './lib';
import fetchRecommendationsToInject from './fetchYtChannelRecommendations';
import App from './App';
import theme, {getThemeBackgroundColor} from './theme';

import HomeVideoCard, {getHomeMiniatureUrl} from './components/HomeVideoCard';

import {defaultApi as api, apiProvider as ApiProvider} from './apiProvider';

import WatchTimeEvent from './common/models/watchTimeEvent';
import HomeShownEvent from './common/models/homeShownEvent';
import {type Recommendation} from './common/types/Recommendation';
import {Event as AppEvent, EventType} from './common/models/event';
import {isLoggedIn} from './lib';

let root: HTMLElement | undefined;
let previousUrl: string | undefined;
const idsReplaced = new Set<string>();
let hidingDiv: HTMLDivElement | undefined;

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

let homePageAltered = false;
let homePageAlteredSuccessfully = false;

const findHighestSingleParent = (elt: HTMLElement): HTMLElement => {
	if (elt.parentElement && elt.parentElement.children.length === 1) {
		return findHighestSingleParent(elt.parentElement);
	}

	return elt;
};

const homeVideos: HomeVideo[] = [];
const injectionSource: Recommendation[] = [];

const getRecommendationsToInject = async (): Promise<Recommendation[]> => {
	const getRecommendations = async (force = false): Promise<Recommendation[]> => {
		log('getting recommendations source...');
		const recommendationsSource = await api.getChannelSource(force);
		log('trying to get the recommendations to inject from:', recommendationsSource);

		const channelData = await fetchRecommendationsToInject(recommendationsSource);
		log('raw injection source channel data:', channelData);

		const unfilteredRecommendations = channelData.map(({recommendation}) => recommendation).slice(0, 10);
		log('unfiltered recommendations:', unfilteredRecommendations);

		const filterPromises = unfilteredRecommendations.map(async r => {
			const exists = await urlExists(getHomeMiniatureUrl(r.videoId));
			return {ok: exists, rec: r};
		});

		const filtered = await Promise.all(filterPromises);
		log('filtered recommendations:', filtered);

		return filtered.filter(({ok}) => ok).map(({rec}) => rec);
	};

	let recommendations = await getRecommendations();

	while (recommendations.length < 3) {
		// eslint-disable-next-line no-await-in-loop
		recommendations = await getRecommendations(true);
	}

	return recommendations;
};

const onVisitHomePageFirstTime = async () => {
	log('onVisitHomePageFirstTime');

	const config = await api.getConfig();

	if (config.kind === 'Failure') {
		console.error('Could not get config:', config.message);
		return;
	}

	if (!isLoggedIn()) {
		return;
	}

	homeVideos.splice(0, homeVideos.length, ...getHomeVideos());
	log('home videos:', homeVideos);

	if (config.value.arm === 'control') {
		homePageAlteredSuccessfully = true;
		return;
	}

	if (config.value.phase !== 1) {
		homePageAlteredSuccessfully = true;
		return;
	}

	const recommendationsToInject = await getRecommendationsToInject();
	injectionSource.splice(0, injectionSource.length, ...recommendationsToInject);

	try {
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

		homePageAlteredSuccessfully = true;
		// Make sure the hiding div is removed
		// but in the next event loop iteration to avoid glitches
		setInterval(() => {
			hidingDiv?.remove();
		}, 0);
	} catch (error) {
		console.error(error);
	}
};

const onVisitHomePage = () => {
	if (!homePageAlteredSuccessfully) {
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

const setupSidebarApp = (): boolean => {
	const related = document.querySelector('#related');

	if (!related) {
		return false;
	}

	const relatedElt: HTMLElement = related as HTMLElement;

	if (relatedElt.style.display === 'none') {
		return false;
	}

	if (!relatedElt.parentElement) {
		return false;
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

		relatedElt.parentElement.appendChild(root);
	}

	return Boolean(root);
};

let loaderInstalled = false;

const observer = new MutationObserver(async () => {
	if (isOnHomePage() && !loaderInstalled) {
		const primary = document.getElementById('page-manager');
		log('primary', primary);

		if (primary) {
			primary.style.position = 'relative';
			hidingDiv = document.createElement('div');
			hidingDiv.style.position = 'absolute';
			hidingDiv.style.top = '0';
			hidingDiv.style.left = '0';
			hidingDiv.style.right = '0';
			hidingDiv.style.bottom = '0';
			hidingDiv.style.zIndex = '1000';
			hidingDiv.style.backgroundColor = getThemeBackgroundColor();
			primary.insertBefore(hidingDiv, primary.firstChild);
			log('hiding div', hidingDiv);

			loaderInstalled = true;
		}
	}

	if (urlChanged()) {
		if (isVideoPage(previousUrl)) {
			attemptToSaveWatchTime(previousUrl);
		}

		if (isOnVideoPage()) {
			setupSidebarApp();
			// If we arrive on a video page, start watching the video
			// for watch time events...
			// Beware that this will reset watch time of previous video.
			watchVideoEvents();
		}

		// Update the previous URL AFTER saving the watch time
		previousUrl = window.location.href;

		if (isOnHomePage()) {
			if (!homePageAltered) {
				homePageAltered = true;
				await onVisitHomePageFirstTime().catch(log);
			}

			onVisitHomePage();
		}

		api.sendPageView();
	}
});

observer.observe(document.body, {
	childList: true,
	subtree: true,
});

