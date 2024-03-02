import React from 'react';
import {createRoot} from 'react-dom/client';

import {
	Typography,
} from '@mui/material';

import {type SubAppCreator, type SubAppState, ReactAdapter} from '../SubApp';

const LoginApp: React.FC<SubAppState> = ({loggedInExtension, loggedInYouTube}) => {
	if (loggedInExtension && loggedInYouTube) {
		return (
			<Typography variant='body1' sx={{m: 2}}>
				You are logged in to both YouTube and the extension.
			</Typography>
		);
	}

	return (
		<>
			{((!loggedInYouTube) && <Typography variant='body1' sx={{m: 2}}>
				Please log in to YouTube to use the YouTube Experiment extension.
			</Typography>)}
			{((!loggedInExtension) && <Typography variant='body1' sx={{m: 2}}>
				Please log in to the extension with your participant code to use the YouTube Experiment extension.
			</Typography>)}
		</>
	);
};

export const loginApp: SubAppCreator = ({api, getElement}) => {
	const rootElt = document.createElement('div');
	rootElt.id = 'ytdpnl-extension-login-app';

	const root = createRoot(rootElt);

	const render = (state: SubAppState) => {
		const App = (
			<ReactAdapter api={api}>
				<LoginApp {...state} />
			</ReactAdapter>
		);

		root.render(App);
	};

	return {
		getName() {
			return 'loginApp';
		},
		showOnPage: () => true,
		async setup(state) {
			const target = await getElement('ytd-masthead');

			target.prepend(rootElt);

			render(state);

			return [rootElt];
		},
		onDestroy(elt) {
			console.log('Destroying login app');
			root.unmount();
			elt.remove();
		},
		onUrlChange() {
			// Do nothing
		},
		onConfigChange() {
			// Do nothing
		},
		onLoggedInChange(state) {
			render(state);
		},
	};
};

export default loginApp;
