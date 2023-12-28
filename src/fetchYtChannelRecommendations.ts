import {extractYtInitialData, extractRecommendations, type ChannelRecommendation} from './lib';

export const fetchYtChannelRecommendations = async (channelId: string): Promise<ChannelRecommendation[]> => {
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

	return extractRecommendations(initialData);
};

export default fetchYtChannelRecommendations;
