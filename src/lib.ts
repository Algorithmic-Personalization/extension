import type Recommendation from './common/types/Recommendation';
import {get} from './common/util';

export const isOnVideoPage = () => window.location.pathname === '/watch';
export const isVideoPage = (url?: string): url is string => Boolean(
	url && new URL(url).pathname.startsWith('/watch'),
);
export const isOnHomePage = () => window.location.pathname === '/';

export const debug = process.env.NODE_ENV === 'development';
export const isDebug = () => debug || localStorage.getItem('debug') === '1';

export const log = (...args: any[]) => {
	if (!isDebug()) {
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

export type TreeCallback = (node: unknown, path: string[], fullObject?: unknown) => 'recurse' | 'stop';

export const walkTree = (cb: TreeCallback) => (node: unknown) => {
	const walk = (node: unknown, path: string[], fullObject: unknown) => {
		const andThen = cb(node, path, fullObject);

		if (andThen === 'stop') {
			return;
		}

		if (node === null) {
			return;
		}

		if (Array.isArray(node)) {
			for (const [index, value] of node.entries()) {
				walk(value, [...path, index.toString()], fullObject);
			}

			return;
		}

		if (typeof node === 'object') {
			for (const [key, value] of Object.entries(node)) {
				walk(value, [...path, key], fullObject);
			}
		}
	};

	walk(node, [], node);
};

export type ChannelRecommendation = {
	title: string;
	path: string[];
	recommendation: Recommendation;
	rawNode: unknown;
};

const getMiniatureUrl = (node: unknown) => {
	if (typeof node !== 'object' || node === null) {
		throw new Error('Invalid node');
	}

	const videoId = get(['videoId'])(node) as string;

	const defaultUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

	const thumbnails = get(['thumbnail', 'thumbnails'])(node) as Array<{url: string; width: number; height: number}>;

	if (!thumbnails) {
		return defaultUrl;
	}

	const sortedThumbnails = thumbnails.sort((a, b) => (b.width * b.height) - (a.width * a.height));

	return sortedThumbnails[0].url;
};

export const extractRecommendations = (
	initialData: Record<string, unknown>,
): ChannelRecommendation[] => {
	const recommendations: ChannelRecommendation[] = [];

	const cb: TreeCallback = (node, path, fullObject) => {
		if (path.length === 0) {
			return 'recurse';
		}

		const lastKey = path[path.length - 1];

		if (lastKey === 'videoRenderer') {
			try {
				const title = get(['title', 'runs', '0', 'text'])(node) as string;

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

				const miniatureUrl = getMiniatureUrl(node);

				const recommendation: Recommendation = {
					videoId,
					title,
					url: `https://www.youtube.com/watch?v=${videoId}`,
					channelName: get(['longBylineText', 'runs', '0', 'text'])(node) as string,
					views: get(['shortViewCountText', 'simpleText'])(node) as string,
					publishedSince: get(['publishedTimeText', 'simpleText'])(node) as string,
					miniatureUrl,
					personalization: 'personalized',
					channelMiniatureUrl,
					channelShortName,
					hoverAnimationUrl: getHoverAnimationUrl(),
				};

				recommendations.push({
					title,
					path,
					recommendation,
					rawNode: node,
				});

				return 'stop';
			} catch (error) {
				log('error parsing videoRenderer', {path, node, error});
			}
		}

		if (lastKey === 'gridVideoRenderer') {
			try {
				const videoId = get(['videoId'])(node) as string;
				const channelName = get([
					'metadata',
					'channelMetadataRenderer',
					'title',
				])(fullObject) as string;

				const channelVanityUrl = get([
					'metadata',
					'channelMetadataRenderer',
					'vanityChannelUrl',
				])(fullObject) as string;

				const partsOfChanelUrl = channelVanityUrl.split('/');

				const channelShortName = partsOfChanelUrl[partsOfChanelUrl.length - 1];

				const recommendation: Recommendation = {
					title: get(['title', 'runs', '0', 'text'])(node) as string,
					url: `https://www.youtube.com/watch?v=${videoId}`,
					videoId,
					miniatureUrl: getMiniatureUrl(node),
					channelName,
					views: get(['viewCountText', 'simpleText'])(node) as string,
					publishedSince: get(['publishedTimeText', 'simpleText'])(node) as string,
					personalization: 'personalized',
					hoverAnimationUrl: get([
						'richThumbnail',
						'movingThumbnailRenderer',
						'movingThumbnailDetails',
						'thumbnails',
						'0',
						'url',
					])(node) as string,
					channelMiniatureUrl: get([
						'metadata',
						'channelMetadataRenderer',
						'avatar',
						'thumbnails',
						'0',
						'url',
					])(fullObject) as string,
					channelShortName,
				};

				recommendations.push({
					title: recommendation.title,
					path,
					recommendation,
					rawNode: node,
				});
			} catch (error) {
				log('error parsing gridVideoRenderer', {path, node, error});
			}

			return 'stop';
		}

		return 'recurse';
	};

	walkTree(cb)(initialData);

	return recommendations;
};

export const urlExists = async (url: string): Promise<boolean> => {
	const res = await fetch(url, {
		method: 'HEAD',
	});

	return res.ok;
};

export const isLoggedIn = () => Boolean(document.querySelector('#avatar-btn'));

export const isNotLoggedIn = () => Boolean(
	document.querySelector('a[href^="https://accounts.google.com/ServiceLogin?service=youtube"]'),
);

export type Res = 'yes' | 'no' | 'maybe';

export const isLoggedInForSure = async (): Promise<Res> => {
	const check = (): Res => {
		if (isLoggedIn()) {
			return 'yes';
		}

		if (isNotLoggedIn()) {
			return 'no';
		}

		return 'maybe';
	};

	return new Promise<Res>(resolve => {
		const res = check();

		if (res !== 'maybe') {
			resolve(res);
			return;
		}

		const observer = new MutationObserver(() => {
			const res = check();

			if (res !== 'maybe') {
				observer.disconnect();
				resolve(res);
			}
		});

		observer.observe(document.documentElement, {childList: true, subtree: true});
	});
};

const namespace = 'ytdpnl-extension-';

// eslint-disable-next-line @typescript-eslint/ban-types
export const getFromLocalStorage = (key: string): string | null => {
	const newFormat = localStorage.getItem(namespace + key);

	if (newFormat) {
		return newFormat;
	}

	const oldFormat = localStorage.getItem(key);

	if (oldFormat) {
		localStorage.setItem(namespace + key, oldFormat);
		localStorage.removeItem(key);

		return oldFormat;
	}

	return null;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const getFromSessionStorage = (key: string): string | null => {
	const newFormat = sessionStorage.getItem(namespace + key);

	if (newFormat) {
		return newFormat;
	}

	const oldFormat = sessionStorage.getItem(key);

	if (oldFormat) {
		sessionStorage.setItem(namespace + key, oldFormat);
		sessionStorage.removeItem(key);

		return oldFormat;
	}

	return null;
};

export const saveToLocalStorage = (key: string, value: string) => {
	localStorage.removeItem(key);
	localStorage.setItem(namespace + key, value);
};

export const saveToSessionStorage = (key: string, value: string) => {
	sessionStorage.removeItem(key);
	sessionStorage.setItem(namespace + key, value);
};

export const deleteFromLocalStorage = (key: string) => {
	localStorage.removeItem(key);
	localStorage.removeItem(namespace + key);
};

export const deleteFromSessionStorage = (key: string) => {
	sessionStorage.removeItem(key);
	sessionStorage.removeItem(namespace + key);
};

export const loaderId = 'ytdpnl-loader';
