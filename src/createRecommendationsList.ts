import type Recommendation from './common/types/Recommendation';
import {removeDuplicates, shuffleArray} from './common/util';
import type IndividualExperimentConfig from './common/types/IndividualExperimentConfig';

export type RecommendationsListCreator = (cfg: IndividualExperimentConfig) =>
(nonPersonalized: Recommendation[], personalized: Recommendation[]) =>
Recommendation[];

export const dedupe = removeDuplicates((r: Recommendation) => r.videoId);

export const createRecommendationsList: RecommendationsListCreator = cfg =>
	(nonPersonalized, personalized) => {
		if (cfg.arm === 'control') {
			return personalized;
		}

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
