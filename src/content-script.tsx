import React from 'react';
import {createRoot} from 'react-dom/client';

import {ThemeProvider} from '@mui/material';

import {isOnVideoPage, isVideoPage, isOnHomePage, log, extractHomeContent, type RecommendationCard} from './lib';
import fetchRecommendationsToInject from './fetchYtChannelRecommendations';
import App from './App';
import theme from './theme';

import HomeVideoCard from './components/HomeVideoCard';

import {defaultApi as api, apiProvider as ApiProvider} from './apiProvider';

import WatchTimeEvent from './common/models/watchTimeEvent';
import {type Recommendation} from './common/types/Recommendation';

let root: HTMLElement | undefined;
let previousUrl: string | undefined;

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

	const onClick = async () => {
		console.log('handleRecommendationClicked', recommendation);
	};

	const card = (
		<React.StrictMode>
			<ThemeProvider theme={theme}>
				<HomeVideoCard {
					...{
						...recommendation,
						onClick,
						isForHomePage: true,
					}} />
			</ThemeProvider>
		</React.StrictMode>
	);

	createRoot(parent).render(card);
	return 1;
};

let contentsDisplayProperty: string | undefined;

const onVisitHomePage = async () => {
	log('onVisitHomePage');
	const recommendationsSource = 'UCtFRv9O2AHqOZjjynzrv-xg';
	const injectionSource = await fetchRecommendationsToInject(recommendationsSource);

	const contentsElement = document.querySelector('#contents');
	console.log({contentsElement});
	if (contentsElement) {
		log('hiding contents element');
		contentsDisplayProperty = (contentsElement as HTMLElement).style.display;
		(contentsElement as HTMLElement).style.display = 'none';
	}

	const scripts = Array.from(document.querySelectorAll('script'));
	const script = scripts.find(script => {
		const {textContent} = script;

		if (textContent) {
			return textContent.trimStart().startsWith('var ytInitialData = ');
		}

		return false;
	});

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
		const initialData = JSON.parse(jsonText) as Record<string, unknown>;
		const homeContent = extractHomeContent(initialData);

		const homeVideos = homeContent.filter(item => item.type === 'recommendation').map(
			item => (item as RecommendationCard).recommendation,
		);

		const replace = () => {
			let total = 0;
			for (let i = 0; i < 3; ++i) {
				total += replaceHomeVideo(homeVideos[i].videoId, injectionSource[i]);
			}

			return total === 3;
		};

		while (!replace()) {
			log('not all links replaced yet, waiting 1 second');
			// eslint-disable-next-line no-await-in-loop
			await new Promise(resolve => {
				setTimeout(resolve, 1000);
			});
		}

		if (contentsElement) {
			log('revealing contents element again');
			(contentsElement as HTMLElement).style.display = contentsDisplayProperty ?? 'block';
		}
	} catch (error) {
		console.error('Could not parse ytInitialData JSON on home page.');
		console.error(error);
	}
};

const observer = new MutationObserver(() => {
	/* Was for investigating
	const videoElements = Array.from(document.querySelectorAll('video'));
	console.log('videoElements', videoElements);
	for (const vid of videoElements) {
		const {currentSrc} = vid;
		if (currentSrc) {
			const last = currentSrc.split('/').pop();

			if (last) {
				console.log('currentSrc', currentSrc);
				const found = jsonData?.includes(last);
				console.log('found', found);
			} else {
				console.log('currentSrc not found in json');
			}
		}
	}
	*/

	if (window.location.href !== previousUrl) {
		if (isVideoPage(previousUrl)) {
			attemptToSaveWatchTime(previousUrl);
		}

		if (isOnVideoPage()) {
			// If we arrive on a video page, start watching the video
			// for watch time events...
			// Beware that this will reset watch time of previous video.
			watchVideoEvents();
		}

		if (isOnHomePage()) {
			void onVisitHomePage();
		}

		// Update the previous URL AFTER saving the watch time
		previousUrl = window.location.href;

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

