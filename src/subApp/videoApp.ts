import {
	type SubAppCreator,
	type SubAppInstance,
} from '../SubApp';

import {isVideoPage, log} from '../lib';

const videoApp: SubAppCreator = _api => {
	let initialized = false;

	const collect = async () => {
		log('Collecting data on video page', window.location.href);
	};

	const app: SubAppInstance = {
		getName: () => 'videoApp',
		async onUpdate(state, prevState) {
			if (!isVideoPage(state.url)) {
				return [];
			}

			if (state.url && (state.url !== prevState.url || !initialized)) {
				initialized = true;

				log('Collecting data on video page', state.url);
				collect().then(() => {
					log('Data collection on', state.url, 'complete');
				}).catch(err => {
					log('Error collecting data on', state.url, err);
				});
			}

			return [];
		},
	};

	return app;
};

export default videoApp;
