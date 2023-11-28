import type Recommendation from './common/types/Recommendation';
import {has, get} from './common/util';

export const isOnVideoPage = () => window.location.pathname === '/watch';
export const isVideoPage = (url?: string): url is string => Boolean(
	url && new URL(url).pathname.startsWith('/watch'),
);
export const isOnHomePage = () => window.location.pathname === '/';

export const debug = process.env.NODE_ENV === 'development';

export const log = (...args: any[]) => {
	if (!debug) {
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

type HomeThing = HomeRecommendation | Reel | Playlist;

type Reel = {
	type: 'reel';
	videoId: string;
};

type Playlist = {
	type: 'playlist';
	playlistId: string;
};

type HomeRecommendation = {
	type: 'recommendation';
	data: Recommendation;
};

export type HomeCard = {
	rowIndex: number | 'tbd';
	colIndex: number | 'tbd';
	data: HomeThing;
};

const extractFromArray = (array: Array<Record<string, unknown>>): HomeCard[] => {
	const homeThings: HomeCard[] = [];

	for (const thing of array) {
		if (has('richItemRenderer')(thing)) {
			const preVideoData = get(['richItemRenderer', 'content'])(thing);

			if (has('videoRenderer')(preVideoData)) {
				const videoData = get(['videoRenderer'])(preVideoData);
				const videoId = get(['videoId'])(videoData) as string;

				const video: Recommendation = {
					videoId,
					title: get(['title', 'runs', '0', 'text'])(videoData) as string,
					url: `https://www.youtube.com/watch?v=${videoId}`,
					channelName: get(['longBylineText', 'runs', '0', 'text'])(videoData) as string,
					views: get(['shortViewCountText', 'simpleText'])(videoData) as string,
					publishedSince: get(['publishedTimeText', 'simpleText'])(videoData) as string,
					miniatureUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
					personalization: 'personalized',
				};

				const homeThing: HomeRecommendation = {
					type: 'recommendation',
					data: video,
				};

				homeThings.push({
					rowIndex: 'tbd',
					colIndex: 'tbd',
					data: homeThing,
				});
			} else if (has('reelItemRenderer')(preVideoData)) {
				const videoId = get(['reelItemRenderer', 'videoId'])(preVideoData) as string;

				const reel: Reel = {
					type: 'reel',
					videoId,
				};

				homeThings.push({
					rowIndex: 'tbd',
					colIndex: 'tbd',
					data: reel,
				});
			} else if (has('playlistRenderer')(preVideoData)) {
				const playlistId = get(['playlistRenderer', 'playlistId'])(preVideoData) as string;

				const playlist: Playlist = {
					type: 'playlist',
					playlistId,
				};

				homeThings.push({
					rowIndex: 'tbd',
					colIndex: 'tbd',
					data: playlist,
				});
			}
		} else if (has('richSectionRenderer')(thing)) {
			const shelf = get(['richSectionRenderer', 'content', 'richShelfRenderer', 'contents'])(thing);

			if (!Array.isArray(shelf)) {
				throw new Error('Expected shelf to be an array');
			}

			const nested = extractFromArray(shelf);
			homeThings.push(...nested);
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

	console.log({contents});

	if (!Array.isArray(contents)) {
		throw new Error('Expected contents to be an array');
	}

	return extractFromArray(contents);
};
