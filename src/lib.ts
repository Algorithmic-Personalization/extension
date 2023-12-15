import type Recommendation from './common/types/Recommendation';
import {has, get} from './common/util';

export const isOnVideoPage = () => window.location.pathname === '/watch';
export const isVideoPage = (url?: string): url is string => Boolean(
	url && new URL(url).pathname.startsWith('/watch'),
);
export const isOnHomePage = () => window.location.pathname === '/';

export const debug = process.env.NODE_ENV === 'development';

export const log = (...args: any[]) => {
	const isDebug = debug ?? localStorage.getItem('debug') === '1';

	if (!isDebug) {
		return;
	}

	console.log(...args);
};

export type VersionDescriptor = {
	version: string;
	update_link: string;
};

export type UpdateManifest = {
	addons: Record<string, {
		updates: VersionDescriptor[];
	}>;
};

export const extractYtInitialData = (rawPageHtml: string) => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(rawPageHtml, 'text/html');
	const scripts = Array.from(doc.querySelectorAll('script'));

	return scripts.find(script => {
		const {textContent} = script;

		if (textContent) {
			return textContent.trimStart().startsWith('var ytInitialData = ');
		}

		return false;
	});
};

export type HomeCard = RecommendationCard | ReelCard | Playlist | NestedHomeCard;

export type NestedHomeCard = {
	type: 'nested';
	cards: HomeCard[];
};

export type ReelCard = {
	type: 'reel';
	reel: Reel;
};

export type Reel = {
	videoId: string;
	videoType: string;
	headline: string;
	miniatureUrl: string;
	views: string;
};

type Playlist = {
	type: 'playlist';
	playlistId: string;
};

export type RecommendationCard = {
	type: 'recommendation';
	recommendation: Recommendation;
};

const extractFromArray = (array: Array<Record<string, unknown>>): HomeCard[] => {
	const homeThings: HomeCard[] = [];

	for (const thing of array) {
		if (has('richItemRenderer')(thing)) {
			const preVideoData = get(['richItemRenderer', 'content'])(thing);

			if (has('videoRenderer')(preVideoData)) {
				const videoData = get(['videoRenderer'])(preVideoData);
				const videoId = get(['videoId'])(videoData) as string;

				const channelMiniatureUrl = get([
					'channelThumbnailSupportedRenderers',
					'channelThumbnailWithLinkRenderer',
					'thumbnail',
					'thumbnails',
					'0',
					'url',
				])(videoData) as string;

				const channelShortName = get([
					'ownerText',
					'runs',
					'0',
					'navigationEndpoint',
					'browseEndpoint',
					'canonicalBaseUrl',
				])(videoData) as string;

				const recommendation: Recommendation = {
					videoId,
					title: get(['title', 'runs', '0', 'text'])(videoData) as string,
					url: `https://www.youtube.com/watch?v=${videoId}`,
					channelName: get(['longBylineText', 'runs', '0', 'text'])(videoData) as string,
					views: get(['shortViewCountText', 'simpleText'])(videoData) as string,
					publishedSince: get(['publishedTimeText', 'simpleText'])(videoData) as string,
					miniatureUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
					personalization: 'personalized',
					channelMiniatureUrl,
					channelShortName,
				};

				const homeThing: RecommendationCard = {
					type: 'recommendation',
					recommendation,
				};

				homeThings.push(homeThing);
			} else if (has('reelItemRenderer')(preVideoData)) {
				const videoId = get(['reelItemRenderer', 'videoId'])(preVideoData) as string;

				const reel: Reel = {
					videoId,
					videoType: get(['reelItemRenderer', 'videoType'])(preVideoData) as string,
					headline: get(['reelItemRenderer', 'headline', 'simpleText'])(preVideoData) as string,
					miniatureUrl: get(['reelItemRenderer', 'thumbnail', 'thumbnails', '0', 'url'])(preVideoData) as string,
					views: get(['reelItemRenderer', 'viewCountText', 'simpleText'])(preVideoData) as string,
				};

				const reelCard: ReelCard = {
					type: 'reel',
					reel,
				};

				homeThings.push(reelCard);
			} else if (has('playlistRenderer')(preVideoData)) {
				const playlistId = get(['playlistRenderer', 'playlistId'])(preVideoData) as string;

				const playlist: Playlist = {
					type: 'playlist',
					playlistId,
				};

				homeThings.push(playlist);
			}
		} else if (has('richSectionRenderer')(thing)) {
			try {
				const shelf = get(['richSectionRenderer', 'content', 'richShelfRenderer', 'contents'])(thing);

				if (!Array.isArray(shelf)) {
					throw new Error('Expected shelf to be an array');
				}

				const nested = extractFromArray(shelf);
				homeThings.push({
					type: 'nested',
					cards: nested,
				});
			} catch (error) {
				console.log('OOPS: not parsing', thing, error);
			}
		} else if (has('continuationItemRenderer')(thing)) {
			log('ignored thing', thing);
		} else {
			log('!!! unknown thing', thing);
		}
	}

	return homeThings;
};

export const extractHomeContent = (initialData: Record<string, unknown>): HomeCard[] => {
	const pathToData = [
		'contents',
		'twoColumnBrowseResultsRenderer',
		'tabs',
		'0',
		'tabRenderer',
		'content',
		'richGridRenderer',
		'contents',
	];

	const contents = get(pathToData)(initialData);

	if (!Array.isArray(contents)) {
		throw new Error('Expected contents to be an array');
	}

	return extractFromArray(contents);
};
