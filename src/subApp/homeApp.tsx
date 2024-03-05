import React from 'react';
import {createRoot, type Root as ReactDomRoot} from 'react-dom/client';

import {
	type SubAppCreator,
	type SubAppInstance,
	ReactAdapter,
} from '../SubApp';

import {
	imageExists,
	isHomePage,
	log,
	findParentById,
	removeLoaderMask,
} from '../lib';

import fetchRecommendationsToInject from '../fetchYtChannelRecommendations';
import type Recommendation from '../common/types/Recommendation';
import {type RecommendationBase} from '../common/types/Recommendation';

import {type Api} from '../api';
import {Event as AppEvent, EventType} from '../common/models/event';

import HomeVideoCard, {getHomeMiniatureUrl} from '../components/HomeVideoCard';
import HomeShownEvent from '../common/models/homeShownEvent';

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

type ReactRoot = {
	elt: Element;
	root: ReactDomRoot;
};

const replaceHomeVideo = (api: Api, log: (...args: any[]) => void) => (
	videoId: string,
	recommendation: Recommendation,
	onPictureLoaded?: () => void,
	onPictureErrored?: () => void,
): ReactRoot | undefined => {
	const links = Array.from(document.querySelectorAll(`a.ytd-thumbnail[href="/watch?v=${videoId}"]`));

	if (links.length === 0) {
		console.error('could not find link for', videoId);
		return undefined;
	}

	if (links.length > 1) {
		console.error('found multiple links for', videoId);
		return undefined;
	}

	const [link] = links;

	const parent = findParentById('content')(link);

	if (!parent) {
		console.error('could not find parent for', videoId);
		return undefined;
	}

	const onInjectedVideoCardClicked = async () => {
		const event = new AppEvent();
		event.type = EventType.HOME_INJECTED_TILE_CLICKED;
		event.url = recommendation.url;
		event.context = window.location.href;
		void api.postEvent(event, true).catch(err => {
			log('failed to send home injected tile clicked event, will be retried', err);
		});
	};

	const card = (
		<ReactAdapter api={api}>
			<HomeVideoCard {
				...{
					...recommendation,
					onClick: onInjectedVideoCardClicked,
					onPictureLoaded,
					onPictureErrored,
				}} />
		</ReactAdapter>
	);

	const root = createRoot(parent);
	root.render(card);

	return {
		elt: parent,
		root,
	};
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
	let replacementSource: Recommendation[] = [];
	let homeVideos: HomeVideo[] = [];
	const roots: ReactRoot[] = [];
	const shown: RecommendationBase[] = [];

	let initializationAttempted = false;

	const replace = replaceHomeVideo(api, log);

	const triggerEvent = async (): Promise<boolean> => {
		if (shown.length === 0) {
			return false;
		}

		if (replacementSource.length === 0) {
			return false;
		}

		if (homeVideos.length === 0) {
			return false;
		}

		const event = new HomeShownEvent(
			homeVideos.slice(0, 10),
			replacementSource,
			shown,
		);

		return api.postEvent(event, true).then(() => {
			log('home shown event sent successfully');
			return true;
		}, err => {
			console.error('failed to send home shown event', err);
			return false;
		});
	};

	const initialize = async (maybeNewChannelSource: string) => {
		initializationAttempted = true;

		log('fetching recommendations to inject...');

		replacementSource = await getRecommendationsToInject(api, log)(maybeNewChannelSource);
		channelSource = maybeNewChannelSource;

		log('injection source data:', replacementSource);

		if (homeVideos.length === 0) {
			homeVideos = getHomeVideos().splice(0, 10);
		}

		log('home videos:', homeVideos);

		if (homeVideos.length < 3) {
			console.error('not enough videos to replace');
			return [];
		}

		if (replacementSource.length < 3) {
			console.error('not enough recommendations to inject');
			return [];
		}

		if (shown.length > 0) {
			log('already replaced videos, returning...', {shown});
			return [];
		}

		const picturePromises: Array<Promise<void>> = [];

		for (let i = 0; i < 3; ++i) {
			const video = homeVideos[i];
			const replacement = replacementSource[i];

			if (!video || !replacement) {
				throw new Error('video or replacement is undefined - should never happen');
			}

			const picturePromise = new Promise<void>((resolve, reject) => {
				const root = replace(video.videoId, replacement, resolve, reject);

				if (root) {
					log('video', video, 'replaced with', replacement, 'successfully');
					roots.push(root);
					shown.push(replacement);
				} else {
					log('failed to replace video', video, 'with', replacement);
					shown.push(video);
				}
			});

			picturePromises.push(picturePromise);
		}

		// Keep track the rest of the videos shown
		shown.push(...homeVideos.slice(3));

		await Promise.allSettled(picturePromises);

		removeLoaderMask();

		triggerEvent().then(triggered => {
			if (triggered) {
				log('home shown event triggered successfully upon app initialization');
			} else {
				console.error('home shown event not triggered upon app initialization, something went wrong');
			}
		}, err => {
			console.error('failed to trigger home shown event upon update', err);
		});

		return [];
	};

	const app: SubAppInstance = {
		getName() {
			return 'homeApp';
		},

		async onUpdate(state, prevState) {
			if (!isHomePage(state.url ?? '')) {
				return [];
			}

			if (state.url !== prevState.url && isHomePage(state.url ?? '')) {
				triggerEvent().then(triggered => {
					if (triggered) {
						log('home shown event triggered upon URL change');
					} else {
						log('home shown event not triggered upon URL change, app may not be ready');
					}
				}, err => {
					console.error('failed to trigger home shown event upon URL change', err);
				});
			}

			if (initializationAttempted) {
				log('home app already initialized, returning...');
				return [];
			}

			if (!state.url || !state.config) {
				return [];
			}

			if (!state.config.channelSource) {
				return [];
			}

			if (state.config.arm === 'control') {
				return [];
			}

			if (state.config.phase !== 1) {
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

			if (replacementSource.length > 0) {
				log('injection source already exists, returning...');
				return [];
			}

			initialize(maybeNewChannelSource).catch(err => {
				removeLoaderMask();
				console.error('failed to initialize home app', err);
			});

			return [];
		},

		onDestroy(elt: HTMLElement) {
			log('element destroyed', elt);
		},
	};

	return app;
};

export default homeApp;
