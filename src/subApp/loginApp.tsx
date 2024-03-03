import React from 'react';
import {createRoot} from 'react-dom/client';

import {
	Box,
	Typography,
} from '@mui/material';

import {getThemeContrastBackgroundColor, getThemeContrastTextColor} from '../theme';

import {type SubAppCreator, type SubAppState, ReactAdapter} from '../SubApp';

const LoginApp: React.FC<SubAppState> = ({loggedInExtension, loggedInYouTube}) => {
	if (loggedInExtension && loggedInYouTube) {
		return null;
	}

	return (
		<Box sx={{position: 'relative'}}>
			<Box sx={{
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				zIndex: 10000,
				backgroundColor: getThemeContrastBackgroundColor(),
				color: getThemeContrastTextColor(),
				padding: 4,
				borderRadius: 4,
			}}>
				<Typography variant='h4' sx={{m: 2, color: getThemeContrastTextColor()}}>
					Welcome to the YouTube Experiment extension!
				</Typography>
				{((!loggedInYouTube) && <Typography sx={{m: 2, color: getThemeContrastTextColor()}}>
					Please log in to YouTube to use the YouTube Experiment extension.
				</Typography>)}
				{((!loggedInExtension) && <Typography sx={{m: 2, color: getThemeContrastTextColor()}}>
					Please log in to the extension with your participant code to use the YouTube Experiment extension.
				</Typography>)}
			</Box>
		</Box>
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
			const target = await getElement('body');

			target.prepend(rootElt);

			render(state);

			return [rootElt];
		},
		onDestroy(elt) {
			console.log('Destroying login app');
			root.unmount();
			elt.remove();
		},
		onUpdate(state) {
			render(state);
		},
	};
};

export default loginApp;
