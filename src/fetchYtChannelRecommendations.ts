import type Recommendation from './common/types/Recommendation';

import {extractYtInitialData} from './lib';
import {get} from './common/util';

export const fetchYtChannelRecommendations = async (channelId: string): Promise<Recommendation[]> => {
	const videos: Recommendation[] = [];

	const channelUrl = `https://www.youtube.com/channel/${channelId}`;

	const html = await (await fetch(channelUrl, {
		credentials: 'include',
	})).text();

	const initialDataScript = extractYtInitialData(html);

	if (!initialDataScript) {
		throw new Error('Could not find initial data script');
	}

	const jsonText = initialDataScript.textContent?.replace('var ytInitialData = ', '').replace(/;$/, '').trim();

	if (!jsonText) {
		throw new Error('Could not parse initial data');
	}

	const initialData = JSON.parse(jsonText) as Record<string, unknown>;

	console.log({initialData});

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

	const richSectionRenderers = get(pathToData)(initialData);

	if (!richSectionRenderers) {
		throw new Error('Could not find richSectionRenderers');
	}

	if (!Array.isArray(richSectionRenderers)) {
		throw new Error('Expected richSectionRenderers to be an array');
	}

	const pathToRichItemRenderers = [
		'richSectionRenderer',
		'content',
		'richShelfRenderer',
		'contents',
	];

	for (const richSectionRenderer of richSectionRenderers) {
		const richItemRenderers = get(pathToRichItemRenderers)(richSectionRenderer);

		if (!richItemRenderers) {
			continue;
		}

		if (!Array.isArray(richItemRenderers)) {
			throw new Error('Expected richItemRenderers to be an array');
		}

		for (const richItemRenderer of richItemRenderers) {
			const pathToVideo = [
				'richItemRenderer',
				'content',
				'videoRenderer',
			];

			try {
				const videoRenderer = get(pathToVideo)(richItemRenderer);

				const videoId = get(['videoId'])(videoRenderer) as string;

				const video: Recommendation = {
					videoId,
					title: get(['title', 'runs', '0', 'text'])(videoRenderer) as string,
					url: `https://www.youtube.com/watch?v=${videoId}`,
					channelName: get(['longBylineText', 'runs', '0', 'text'])(videoRenderer) as string,
					views: get(['shortViewCountText', 'simpleText'])(videoRenderer) as string,
					publishedSince: get(['publishedTimeText', 'simpleText'])(videoRenderer) as string,
					miniatureUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
					personalization: 'personalized',
				};

				videos.push(video);
			} catch (error) {
				console.log('could not find a videoRenderer, no big deal');
			}
		}
	}

	return videos;
};

export default fetchYtChannelRecommendations;
