import React from 'react';
import {createRoot} from 'react-dom/client';

import {ThemeProvider} from '@mui/material';

import {isOnVideoPage, isVideoPage, isOnHomePage, log, extractHomeContent} from './lib';
import fetchIds from './fetchYtChannelRecommendations';
import App from './App';
import theme from './theme';

import {defaultApi as api, apiProvider as ApiProvider} from './apiProvider';

import WatchTimeEvent from './common/models/watchTimeEvent';

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

const onVisitHomePage = async () => {
	log('onVisitHomePage');
	const recommendationsSource = 'UCtFRv9O2AHqOZjjynzrv-xg';
	const ids = await fetchIds(recommendationsSource);
	console.log('videos from', recommendationsSource, ids);

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

		console.log('home content', homeContent);
	} catch (error) {
		console.error('Could not parse ytInitialData JSON on home page.');
		console.error(error);
	}
};

const observer = new MutationObserver(() => {
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

