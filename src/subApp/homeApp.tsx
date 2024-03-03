// D import React from 'react';

import {
	type SubAppCreator,
	type SubAppState,
	type SubAppInstance,
// D	ReactAdapter,
} from '../SubApp';
import {imageExists, isHomePage, log} from '../lib';

import fetchRecommendationsToInject from '../fetchYtChannelRecommendations';
import type Recommendation from '../common/types/Recommendation';
import {type Api} from '../api';
import {getHomeMiniatureUrl} from '../components/HomeVideoCard';

const getRecommendationsToInject = (api: Api, log: (...args: any[]) => void) => async (channelSource: string): Promise<Recommendation[]> => {
	const getRecommendations = async (force = false): Promise<Recommendation[]> => {
		const recommendationsSource = force ? await api.getChannelSource(force) : channelSource;
		log('trying to get the recommendations to inject from:', recommendationsSource);

		const channelData = await fetchRecommendationsToInject(recommendationsSource);
		log('raw injection source channel data:', channelData);

		const unfilteredRecommendations = channelData.map(({recommendation}) => recommendation).slice(0, 10);
		log('unfiltered recommendations:', unfilteredRecommendations);

		const filterPromises = unfilteredRecommendations.map(async r => {
			const exists = await imageExists(getHomeMiniatureUrl(r.videoId));
			return {ok: exists, rec: r};
		});

		const filtered = await Promise.all(filterPromises);
		log('filtered recommendations:', filtered);

		return filtered.filter(({ok}) => ok).map(({rec}) => rec);
	};

	let recommendations = await getRecommendations();

	const maxAttempts = 3;
	let attempts = 0;

	while (recommendations.length < 3 && attempts < maxAttempts) {
		++attempts;

		// eslint-disable-next-line no-await-in-loop
		recommendations = await getRecommendations(true);
	}

	return recommendations;
};

const homeApp: SubAppCreator = ({api}) => {
	const app: SubAppInstance = {
		getName() {
			return 'homeApp';
		},

		async onUpdate(state: SubAppState) {
			if (!state.url || !state.config) {
				return [];
			}

			if (!isHomePage(state.url)) {
				return [];
			}

			log('Setting up home app', state);

			const {channelSource} = state.config;

			if (!channelSource) {
				return [];
			}

			const injectionsSource = await getRecommendationsToInject(api, log)(channelSource);

			log('injections source data:', injectionsSource);

			return [];
		},

		onDestroy(elt: HTMLElement) {
			log('element destroyed', elt);
		},
	};

	return app;
};

export default homeApp;
