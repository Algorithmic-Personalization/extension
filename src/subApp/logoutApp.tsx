import React from 'react';
import {createRoot} from 'react-dom/client';

import {
	type SubAppCreator,
	type SubAppState,
	type SubAppInstance,
	ReactAdapter,
} from '../SubApp';
import {Typography} from '@mui/material';

import {useApi} from '../apiProvider';

const LogoutApp: React.FC<SubAppState & {
	triggerUpdate: (newState: Partial<SubAppState>) => void;
}> = ({
	loggedInExtension,
	triggerUpdate,
}) => {
	const api = useApi();

	if (!loggedInExtension) {
		return null;
	}

	return (
		<ReactAdapter api={api}>
			<Typography
				onClick={() => {
					api.logout();
					triggerUpdate({config: undefined});
				}}
				sx={{
					position: 'fixed',
					bottom: '2rem',
					left: '1rem',
					zIndex: 10000,
					display: 'block',
					color: 'white',
					backgroundColor: 'black',
					padding: '0.5rem',
					cursor: 'pointer',
					textDecoration: 'none',
				}}
			>
				log out of YouTube Experiment extension
			</Typography>
		</ReactAdapter>
	);
};

export const logoutApp: SubAppCreator = ({triggerUpdate}) => {
	const elt = document.createElement('div');
	elt.id = 'ytdpnl-extension-logout-app';

	const root = createRoot(elt);

	const render = (state: SubAppState) => {
		root.render(
			<LogoutApp
				{...state}
				triggerUpdate={triggerUpdate}
			/>,
		);
	};

	const app: SubAppInstance = {
		getName() {
			return 'logoutApp';
		},

		async onUpdate(state: SubAppState) {
			if (!document.getElementById(elt.id)) {
				document.body.appendChild(elt);
			}

			render(state);

			return [elt];
		},

		onDestroy() {
			// Nothing to do
		},
	};

	return app;
};

export default logoutApp;
