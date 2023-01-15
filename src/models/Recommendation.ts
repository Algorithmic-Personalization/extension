export type Recommendation = {
	title: string;
	url: string;
	channelName: string;
	videoId: string;
	miniatureUrl: string;
	hoverAnimationUrl: string;
	views: string;
	publishedSince: string;
	// Flag 'unknown' is only used before the recommendations can be distinguished
	personalization: 'personalized' | 'non-personalized' | 'mixed' | 'unknown';
};

export default Recommendation;
