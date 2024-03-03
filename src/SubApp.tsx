import React from 'react';

import {type ParticipantConfig} from './common/models/experimentConfig';

import theme from './theme';
import {ThemeProvider} from '@mui/material';
import {type Api} from './api';

export type SubAppConfig = {
	api: Api;
	getElement: (selector: string) => Promise<Element>;
	triggerUpdate: (newState: Partial<SubAppState>) => void;
};

export type SubAppState = {
	url?: string;
	config?: ParticipantConfig;
	loggedInExtension?: boolean;
	loggedInYouTube?: boolean;
};

export type SubAppInstance = {
	showOnPage: (url: URL) => boolean;
	setup: (state: SubAppState) => Promise<Element[]>;
	getName: () => string;

	onUpdate: (state: SubAppState) => void;
	onDestroy: (elt: HTMLElement) => void;
};

export type SubAppCreator = (config: SubAppConfig) => SubAppInstance;

export default SubAppCreator;

export const ReactAdapter: React.FC<{children: React.ReactNode; api: Api}> = ({children, api}) => {
	const context = React.createContext(api);
	const ApiProvider = context.Provider;

	return (
		<React.StrictMode>
			<ThemeProvider theme={theme}>
				<ApiProvider value={api}>
					{children}
				</ApiProvider>
			</ThemeProvider>
		</React.StrictMode>
	);
};

