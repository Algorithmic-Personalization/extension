import type Recommendation from './common/types/Recommendation';
import {get} from './common/util';

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

export type TreeCallback = (node: unknown, path: string[]) => 'recurse' | 'stop';

export const walkTree = (cb: TreeCallback) => (node: unknown) => {
	const walk = (node: unknown, path: string[]) => {
		const andThen = cb(node, path);

		if (andThen === 'stop') {
			return;
		}

		if (typeof node === 'object' && node !== null) {
			for (const [key, value] of Object.entries(node)) {
				walk(value, [...path, key]);
			}
		}
	};

	walk(node, []);
};

export const extractRecommendations = (initialData: Record<string, unknown>): Recommendation[] => {
	const recommendations: Recommendation[] = [];

	const cb: TreeCallback = (node, path) => {
		if (path.length === 0) {
			return 'recurse';
		}

		const lastKey = path[path.length - 1];

		if (lastKey === 'videoRenderer') {
			try {
				log('found videoRenderer', {path, node});

				const videoId = get(['videoId'])(node) as string;

				const channelMiniatureUrl = get([
					'channelThumbnailSupportedRenderers',
					'channelThumbnailWithLinkRenderer',
					'thumbnail',
					'thumbnails',
					'0',
					'url',
				])(node) as string;

				const channelShortName = get([
					'ownerText',
					'runs',
					'0',
					'navigationEndpoint',
					'browseEndpoint',
					'canonicalBaseUrl',
				])(node) as string;

				const getHoverAnimationUrl = () => {
					try {
						return get([
							'richThumbnail',
							'movingThumbnailRenderer',
							'movingThumbnailDetails',
							'thumbnails',
							'0',
							'url',
						])(node) as string;
					} catch {
						return undefined;
					}
				};

				const recommendation: Recommendation = {
					videoId,
					title: get(['title', 'runs', '0', 'text'])(node) as string,
					url: `https://www.youtube.com/watch?v=${videoId}`,
					channelName: get(['longBylineText', 'runs', '0', 'text'])(node) as string,
					views: get(['shortViewCountText', 'simpleText'])(node) as string,
					publishedSince: get(['publishedTimeText', 'simpleText'])(node) as string,
					miniatureUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
					personalization: 'personalized',
					channelMiniatureUrl,
					channelShortName,
					hoverAnimationUrl: getHoverAnimationUrl(),
				};

				recommendations.push(recommendation);

				return 'stop';
			} catch (error) {
				log('error parsing videoRenderer', {path, node, error});
			}
		}

		return 'recurse';
	};

	walkTree(cb)(initialData);

	return recommendations;
};
