import type Recommendation from './models/Recommendation';
import {removeDuplicates, shuffleArray} from '../util';

export type ExperimentConfig = {
	arm: 'control' | 'treatment';
	nonPersonalizedProbability: number;
};

export type RecommendationsListCreator = (cfg: ExperimentConfig) =>
(nonPersonalized: Recommendation[], personalized: Recommendation[]) =>
Recommendation[];

export const dedupe = removeDuplicates((r: Recommendation) => r.videoId);

export const createRecommendationsList: RecommendationsListCreator = cfg =>
	(nonPersonalized, personalized) => {
		const limit = Math.min(personalized.length, nonPersonalized.length);

		const tmpResult: Recommendation[] = [];
		const unused: Recommendation[] = [];

		for (let i = 0; i < limit; i++) {
			const takeNonPersonalized = Math.random() < cfg.nonPersonalizedProbability;

			if (takeNonPersonalized) {
				tmpResult.push(nonPersonalized[i]);
				unused.push(personalized[i]);
			} else {
				tmpResult.push(personalized[i]);
				unused.push(nonPersonalized[i]);
			}
		}

		return dedupe(tmpResult.concat(shuffleArray(unused)));
	};

export default createRecommendationsList;
