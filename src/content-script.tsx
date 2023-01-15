import React from 'react';
import {createRoot} from 'react-dom/client';

import {ThemeProvider} from '@mui/material';

import {isOnVideoPage} from './lib';
import App from './App';
import theme from './theme';

import {defaultApi as api, apiProvider as ApiProvider} from './apiProvider';

import Event, {EventType} from '../server/models/event';

let root: HTMLElement | undefined;
let previousUrl: string | undefined;

if (api.getSession() === undefined) {
	api.newSession().catch(console.error);
}

const observer = new MutationObserver(() => {
	if (window.location.href !== previousUrl) {
		previousUrl = window.location.href;

		const event = new Event();

		event.type = EventType.PAGE_VIEW;
		event.url = window.location.href;

		api.postEvent(event, true).catch(console.error);
	}

	if (!isOnVideoPage()) {
		return;
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

