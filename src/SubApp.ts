import {type Api} from './api';
import {type ParticipantConfig} from './common/models/experimentConfig';

export type SubAppConfig = {
	api: Api;
};

export type SubAppState = {
	url?: string;
	config?: ParticipantConfig;
	loggedInExtension?: boolean;
	loggedInYouTube?: boolean;
};

export type SubAppInstance = {
	showOnPage: (url: URL) => boolean;
	setup: (state: SubAppState) => HTMLElement[];

	onDestroy: (elt: HTMLElement) => void;

	onUrlChange: (state: SubAppState) => void;
	onConfigChange: (state: SubAppState) => void;
	onLoggedInChange: (state: SubAppState) => void;
};

export type SubAppCreator = (config: SubAppConfig) => SubAppInstance;

export default SubAppCreator;
