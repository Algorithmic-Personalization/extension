import {type Maybe, makeApiVerbCreator, memoizeTemporarily} from './common/util';
import type Session from './common/models/session';
import type Event from './common/models/event';
import {type ParticipantConfig} from './common/models/experimentConfig';

import {
	postCreateSession,
	postCheckParticipantCode,
	getParticipantConfig,
	postEvent,
} from './common/routes';

export type Api = {
	createSession: () => Promise<Maybe<Session>>;
	checkParticipantCode: (participantCode: string) => Promise<boolean>;
	setAuth: (participantCode: string) => void;
	newSession: () => Promise<boolean>;
	getSession: () => string | undefined;
	ensureSession: () => Promise<void>;
	getConfig: () => Promise<Maybe<ParticipantConfig>>;
	postEvent: (event: Event, storeForRetry: boolean) => Promise<boolean>;
	logout(): void;
};

const cache = memoizeTemporarily(1000);

type StoredEvent = {
	apiUrl: string;
	event: Event;
	lastAttempt: Date;
	persisted: boolean;
	attempts: number;
	participantCode: string;
	tryImmediately: boolean;
};

const retryDelay = 60000;
const maxAttempts = 10;

const loadStoredEvents = () => (JSON.parse(localStorage.getItem('events') ?? '[]') as StoredEvent[]).map(e => ({
	...e,
	// Need to restore the Date which will not be properly deserialized
	lastAttempt: new Date(e.lastAttempt),
}));

const saveStoredEvents = (events: StoredEvent[]) => {
	localStorage.setItem('events', JSON.stringify(events));
};

const retryToPostStoredEvents = async () => {
	const storedEvents = loadStoredEvents();

	const promises = storedEvents.map(async storedEvent => {
		const lastAttempt = Number(new Date(storedEvent.lastAttempt));
		const remaining = lastAttempt + retryDelay - Date.now();
		if (remaining > 0 && !storedEvent.tryImmediately) {
			console.log('Do not retrying to post event', storedEvent.event.localUuid, 'until', remaining, 'ms have passed');
			return storedEvent;
		}

		storedEvent.attempts += 1;
		storedEvent.tryImmediately = false;

		const api = createApi(storedEvent.apiUrl, storedEvent.participantCode);

		const result = await api.postEvent(storedEvent.event, false);
		if (result) {
			storedEvent.persisted = true;
		} else {
			storedEvent.lastAttempt = new Date();
		}

		return storedEvent;
	});

	const updated = await Promise.all(promises);

	const remainingEvents = updated.filter(e => !e.persisted && e.attempts < maxAttempts);
	console.log(`Stored ${
		storedEvents.length - remainingEvents.length
	} events cached previously, ${remainingEvents.length} remain...`);

	saveStoredEvents(remainingEvents);
};

const clearStoredEvent = (event: Event) => {
	const events = loadStoredEvents();

	const newEvents = events.filter(e => e.event.localUuid !== event.localUuid);
	saveStoredEvents(newEvents);
};

setInterval(retryToPostStoredEvents, retryDelay);

export const createApi = (apiUrl: string, overrideParticipantCode?: string): Api => {
	let participantCode = localStorage.getItem('participantCode') ?? overrideParticipantCode ?? '';
	let sessionUuid = sessionStorage.getItem('sessionUuid') ?? '';
	let sessionPromise: Promise<Maybe<Session>> | undefined;

	const storeEvent = (event: Event) => {
		const storedEvents = loadStoredEvents();

		const toStore = {
			event,
			apiUrl,
			lastAttempt: new Date(),
			persisted: false,
			attempts: 1,
			participantCode,
			tryImmediately: true,
		};

		storedEvents.push(toStore);

		localStorage.setItem('events', JSON.stringify(storedEvents));
	};

	const headers = () => ({
		'Content-Type': 'application/json',
		'X-Participant-Code': participantCode,
	});

	const verb = makeApiVerbCreator(apiUrl);

	const post = verb('POST');
	const get = verb('GET');

	const getConfigCached = cache(async () => get<ParticipantConfig>(getParticipantConfig, {}, headers()));

	const api: Api = {
		async createSession() {
			if (sessionPromise) {
				return sessionPromise;
			}

			const p = post<Session>(postCreateSession, {}, headers());
			sessionPromise = p;

			p.then(() => {
				sessionPromise = undefined;
			}).catch(console.error);

			return p;
		},

		async checkParticipantCode(code: string) {
			const result = await post<boolean>(postCheckParticipantCode, {code}, headers());

			if (result.kind !== 'Success') {
				return false;
			}

			return true;
		},

		setAuth(code: string) {
			localStorage.setItem('participantCode', code);
			participantCode = code;
		},

		async newSession() {
			if (!participantCode) {
				console.error('Missing participant code');
				return false;
			}

			console.log('Creating new session');

			const res = await this.createSession();

			if (res.kind === 'Success') {
				sessionUuid = res.value.uuid;
				sessionStorage.setItem('sessionUuid', sessionUuid);
				console.log('New session', sessionUuid);
				return true;
			}

			console.error('Failed to create session:', res.message);

			return false;
		},

		getSession() {
			return sessionUuid === '' ? undefined : sessionUuid;
		},

		async getConfig() {
			return getConfigCached(undefined);
		},

		async ensureSession() {
			if (sessionUuid !== '') {
				return;
			}

			if (sessionPromise) {
				await sessionPromise;
				return;
			}

			await this.newSession();
		},

		async postEvent(inputEvent: Event, storeForRetry: boolean) {
			const event = {...inputEvent};

			if (event.sessionUuid === '') {
				await this.ensureSession();
				event.sessionUuid = sessionUuid;
			}

			if (storeForRetry) {
				storeEvent(event);
			}

			const res = await post<boolean>(postEvent, event, headers());

			if (res.kind === 'Success') {
				clearStoredEvent(event);
				return true;
			}

			if (res.kind === 'Failure' && res.code === 'EVENT_ALREADY_EXISTS_OK') {
				clearStoredEvent(event);
				return true;
			}

			return false;
		},

		logout() {
			localStorage.removeItem('participantCode');
			localStorage.removeItem('eventsToSend');
			sessionStorage.removeItem('sessionUuid');
			sessionStorage.removeItem('cfg');
			participantCode = '';
			sessionUuid = '';
		},
	};

	return api;
};
