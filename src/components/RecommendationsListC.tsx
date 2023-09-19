import React, {useEffect, useState} from 'react';
import {styled} from '@mui/material/styles';
import crypto from 'crypto';

import Event, {EventType} from '../common/models/event';
import RecommendationsEvent from '../common/models/recommendationsEvent';

import type Recommendation from '../common/types/Recommendation';
import type {IndividualExperimentConfig} from '../common/types/IndividualExperimentConfig';
import createRecommendationsList from '../createRecommendationsList';

import {
	fetchNonPersonalizedRecommendations,
	fetchDefaultRecommendations,
} from '../recommendationsFetcher';

import RecommendationC from './RecommendationC';

import {memoizeTemporarily, setPersonalizedFlags, retryOnError} from '../common/util';
import {debug, log} from '../lib';

const memo = memoizeTemporarily(10000);
const retry = retryOnError(2, 1000);

const fetchDefault = memo(retry(fetchDefaultRecommendations));
const fetchPersonalized = memo(retry(fetchNonPersonalizedRecommendations));

const hashRecommendationsList = (recommendations: Recommendation[]): string => {
	const serialized = JSON.stringify(recommendations);
	const hash = crypto.createHash('sha256');
	hash.update(serialized);
	return hash.digest('hex');
};

const NonPersonalized = styled('span')(() => ({
	color: 'green',
}));

const Personalized = styled('span')(() => ({
	color: 'red',
}));

const Mixed = styled('span')(() => ({
	color: 'black',
}));

const debugWrapper = (r: Recommendation) => {
	const {personalization} = r;

	if (personalization === 'non-personalized') {
		return NonPersonalized;
	}

	if (personalization === 'personalized') {
		return Personalized;
	}

	return Mixed;
};

export const RecommendationsListC: React.FC<{
	url: string;
	cfg: IndividualExperimentConfig;
	postEvent: (e: Event) => Promise<void>;
}> = ({url, cfg, postEvent}) => {
	const [nonPersonalizedRecommendations, setNonPersonalizedRecommendations] = useState<Recommendation[]>([]);
	const [defaultRecommendations, setDefaultRecommendations] = useState<Recommendation[]>([]);
	const [nonPersonalizedLoading, setNonPersonalizedLoading] = useState<boolean>(true);
	const [defaultLoading, setDefaultLoading] = useState<boolean>(true);
	const [finalRecommendations, setFinalRecommendations] = useState<Recommendation[]>([]);

	const loading = nonPersonalizedLoading || defaultLoading;
	const loaded = !loading;

	useEffect(() => {
		if (!url) {
			return;
		}

		if (!url.includes('/watch')) {
			return;
		}

		setNonPersonalizedLoading(true);
		setDefaultLoading(true);

		fetchPersonalized(url).then(recommendations => {
			setNonPersonalizedRecommendations(recommendations);
			setNonPersonalizedLoading(false);
			log('setting non-personalized recommendations', {defaultRecommendations: hashRecommendationsList(recommendations)});
		}).catch(err => {
			console.log('Error fetching non personalized recommendations:', err);
		});

		fetchDefault(url).then(recommendations => {
			setDefaultRecommendations(recommendations);
			setDefaultLoading(false);
			log('setting default recommendations', {defaultRecommendations: hashRecommendationsList(recommendations)});
		}).catch(err => {
			console.log('Error fetching default recommendations:', err);
		});
	}, [url]);

	useEffect(() => {
		if (!loaded || !url) {
			return;
		}

		log({
			loaded,
			nonPersonalizedRecommendations,
			nonPersonalizedRecommendationsHash: hashRecommendationsList(nonPersonalizedRecommendations),
			defaultRecommendations,
			defaultRecommendationsHash: hashRecommendationsList(defaultRecommendations),
		});

		const [np, p] = setPersonalizedFlags(nonPersonalizedRecommendations, defaultRecommendations);

		const finalRecommendations = createRecommendationsList(cfg)(np, p);
		setFinalRecommendations(finalRecommendations);

		const event = new RecommendationsEvent(
			nonPersonalizedRecommendations,
			defaultRecommendations,
			finalRecommendations,
		);

		event.url = url;
		event.context = window.location.href;

		postEvent(event).catch(e => {
			console.error('Error posting recommendations shown event, will be retried later on:', e);
		});

		console.log('LOADED!', url);
	}, [loaded, nonPersonalizedRecommendations, defaultRecommendations]);

	const createRecommendationClickHandler = (rec: Recommendation) => async () => {
		const event = new Event();
		event.url = rec.url;
		event.context = window.location.href;

		if (rec.personalization === 'non-personalized') {
			event.type = EventType.NON_PERSONALIZED_CLICKED;
		} else if (rec.personalization === 'personalized') {
			event.type = EventType.PERSONALIZED_CLICKED;
		} else if (rec.personalization === 'mixed') {
			event.type = EventType.MIXED_CLICKED;
		} else {
			console.error('Unknown personalization', rec.personalization);
			return;
		}

		try {
			await postEvent(event);
		} catch (err) {
			console.log('Error posting sidebar clicked event, will be retried later on:', err);
		}
	};

	const debugUi = (
		<div>
			<h1>Debug view</h1>

			<h2>Non-personalized recommendations</h2>
			<ul>{nonPersonalizedRecommendations.map(rec => (
				<li key={rec.videoId}>{rec.title}</li>
			))}</ul>

			<h2>Personalized recommendations</h2>
			<ul>{defaultRecommendations.map(rec => (
				<li key={rec.videoId}>{rec.title}</li>
			))}</ul>

			<h2>Final recommendations</h2>
			<p>Arm: {cfg.arm}<br/></p>
			<p><NonPersonalized>Non-personalized</NonPersonalized></p>
			<p><Personalized>Personalized</Personalized></p>
			<p><Mixed>Mixed</Mixed></p>
			<p><br/></p>
			<ul>{finalRecommendations.map(rec => {
				const W = debugWrapper(rec);
				return (<li key={rec.videoId}><W>{rec.title}</W></li>);
			})}</ul>
		</div>
	);

	const loadedUi = (
		<div>
			{finalRecommendations.map(rec => <RecommendationC
				key={rec.videoId}
				{...rec}
				handleRecommendationClicked={createRecommendationClickHandler(rec)}
			/>)}
		</div>
	);

	return (
		<div>
			{loading && (<p>Loading...</p>)}
			{loaded && loadedUi}
			{loaded && debug && debugUi}
		</div>
	);
};

export default RecommendationsListC;
