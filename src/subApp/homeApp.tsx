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

type HomeVideo = {
	videoId: string;
	title: string;
	url: string;
};

const getVideoTitle = (node: HTMLElement): string | undefined => {
	const maybeTitle = node.querySelector('#video-title');

	if (maybeTitle) {
		return maybeTitle.textContent?.trim();
	}

	if (node.parentElement && node.id !== 'content') {
		return getVideoTitle(node.parentElement);
	}

	return undefined;
};

const getHomeVideos = (): HomeVideo[] => {
	const links: HTMLAnchorElement[] = Array.from(document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="]'));
	const maybeRes: Array<HomeVideo | undefined> = links.map(link => {
		const videoExp = /\?v=(.+)$/;
		const maybeMatch = videoExp.exec(link.href);

		if (!maybeMatch) {
			return undefined;
		}

		const videoId = maybeMatch[1];

		const title = getVideoTitle(link);

		if (!title) {
			return undefined;
		}

		return {
			videoId,
			title,
			url: link.href,
		};
	});

	return maybeRes.filter(Boolean) as HomeVideo[];
};

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
	let channelSource: string | undefined;
	let injectionSource: Recommendation[] = [];
	let homeVideos: HomeVideo[] = [];

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

			const {channelSource: maybeNewChannelSource} = state.config;

			if (!maybeNewChannelSource) {
				log('no channel source in state, returning...');
				return [];
			}

			if (maybeNewChannelSource === channelSource) {
				log('channel source unchanged, returning...');
				return [];
			}

			log('got new channel source');

			if (injectionSource.length > 0) {
				log('injection source already exists, returning...');
				return [];
			}

			log('fetching recommendations to inject...');

			injectionSource = await getRecommendationsToInject(api, log)(maybeNewChannelSource);
			channelSource = maybeNewChannelSource;

			log('injection source data:', injectionSource);

			if (homeVideos.length === 0) {
				homeVideos = getHomeVideos().splice(0, 10);
			}

			log('home videos:', homeVideos);

			return [];
		},

		onDestroy(elt: HTMLElement) {
			log('element destroyed', elt);
		},
	};

	return app;
};

export default homeApp;
