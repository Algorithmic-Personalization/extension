import {
	type SubAppCreator,
	type SubAppInstance,
} from '../SubApp';

import {isVideoPage} from '../lib';
import {fetchRecommendations} from '../recommendationsFetcher';

import RecommendationsEvent from './../common/models/recommendationsEvent';

const videoApp: SubAppCreator = ({api, log}) => {
	let currentUrl = '';
	let loggedInYt = false;
	let loggedInExtension = false;

	const collect = async () => {
		const {href} = window.location;

		log('Collecting data on video page', href);

		const nonPersonalizedRecommendations = await fetchRecommendations(href, false);
		const personalizedRecommendations = await fetchRecommendations(href, true);

		log('recommendations sample extracted', {
			href,
			defaultRecommendations: nonPersonalizedRecommendations,
			personalizedRecommendations,
		});

		const event = new RecommendationsEvent(
			nonPersonalizedRecommendations,
			personalizedRecommendations,
			[],
		);

		log('sending recommendations event to server', event);
		api.postEvent(event, true).catch(e => {
			log('Failed to send recommendations event', event.localUuid, 'will be retried later on:', e);
		});
	};

	const doCollect = (url: string) => {
		collect().then(() => {
			log('Data collection on', url, 'complete');
		}).catch(err => {
			log('Error collecting data on', url, err);
		});
	};

	const app: SubAppInstance = {
		getName: () => 'videoApp',

		async onUpdate(state) {
			loggedInYt = state.loggedInYouTube ?? false;
			loggedInExtension = state.loggedInExtension ?? false;

			if (!isVideoPage(state.url)) {
				return [];
			}

			if (!loggedInYt) {
				log('Not logged in to YouTube, skipping data collection');
				return [];
			}

			if (!loggedInExtension) {
				log('Not logged in to the extension, skipping data collection');
				return [];
			}

			if (state.url !== currentUrl) {
				currentUrl = state.url;

				if (!currentUrl) {
					log('No URL in state, skipping data collection - this is weird!');
					return [];
				}

				log('URL changed to video page', currentUrl, 'starting data collection');
				doCollect(currentUrl);
			}

			return [];
		},
	};

	return app;
};

export default videoApp;
