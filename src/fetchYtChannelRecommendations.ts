import {extractYtInitialData, extractRecommendations, type ChannelRecommendation, log} from './lib';

export const fetchYtChannelRecommendations = async (source: string | {url: string}): Promise<ChannelRecommendation[]> => {
	const channelUrl = typeof source === 'string'
		? `https://www.youtube.com/channel/${source}`
		: source.url;

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

	log('initialData', initialData);

	return extractRecommendations(initialData);
};

export default fetchYtChannelRecommendations;
