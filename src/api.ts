import {type Maybe, makeApiVerbCreator, memoizeTemporarily} from './common/util';
import type Session from './common/models/session';
import Event, {EventType} from './common/models/event';
import {type ParticipantConfig} from './common/models/experimentConfig';

import {compressToUTF16, decompressFromUTF16} from 'lz-string';

import packageJson from '../package.json';

import {
	postCreateSession,
	postCheckParticipantCode,
	getParticipantConfig,
	postEvent,
} from './common/clientRoutes';

export type Api = {
	sendPageView: () => void;
	setTabActive: (active: boolean | undefined) => void;
	createSession: () => Promise<Maybe<Session>>;
	checkParticipantCode: (participantCode: string) => Promise<boolean>;
	setAuth: (participantCode: string) => void;
	newSession: () => Promise<boolean>;
	getSession: () => string | undefined;
	ensureSession: () => Promise<void>;
	getConfig: () => Promise<Maybe<ParticipantConfig>>;
	postEvent: (event: Event, storeForRetry: boolean) => Promise<boolean>;
	getHeaders: () => Record<string, string>;
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
const eventsStorageKey = 'events';
let tabIsActive: boolean | undefined;

const loadStoredEvents = () => {
	const dataStr = localStorage.getItem(eventsStorageKey);

	if (!dataStr) {
		return [];
	}

	const json = localStorage.getItem('lz-string') === 'true'
		? decompressFromUTF16(dataStr)
		: dataStr;

	if (!json) {
		return [];
	}

	return (JSON.parse(json) as StoredEvent[]).map(e => ({
		...e,
		// Need to restore the Date which will not be properly deserialized
		lastAttempt: new Date(e.lastAttempt),
	}));
};

const saveStoredEventsFallback = (events: StoredEvent[], maxAttemptsCutOff: number) => {
	console.log('Thinning events some to those attempted', maxAttemptsCutOff, 'times');
	const newEvents = events.filter(e => e.attempts < maxAttemptsCutOff);
	try {
		localStorage.setItem(eventsStorageKey, compressToUTF16(JSON.stringify(newEvents)));
		console.log('Stored events locally after thinning to', maxAttemptsCutOff, 'attempts');
	} catch (e) {
		if (maxAttemptsCutOff > 0) {
			saveStoredEventsFallback(newEvents, maxAttemptsCutOff - 1);
		} else {
			console.error('Failed to store events locally, giving up...', e);
		}
	}
};

const saveStoredEvents = (events: StoredEvent[]) => {
	try {
		localStorage.setItem('lz-string', 'true');
		const data = compressToUTF16(JSON.stringify(events));
		console.log('Attempting to store events locally with a total size of approx.', data.length / 512, 'KB');
		localStorage.setItem(eventsStorageKey, data);
		console.log('Cached events locally with success.');
	} catch (e) {
		console.error('Failed to store events locally, forgetting older ones...', e);
		let maxMaxAttempts = 0;
		for (const event of events) {
			maxMaxAttempts = Math.max(maxMaxAttempts, event.attempts);
		}

		saveStoredEventsFallback(events, maxMaxAttempts);
	}
};

const retryToPostStoredEvents = async () => {
	console.log('Retrying to post stored events...');
	const storedEvents = loadStoredEvents();

	console.log('Found', storedEvents.length, 'event(s) to retry...');

	for (const storedEvent of storedEvents) {
		const latestAttempt = Number(new Date(storedEvent.lastAttempt));
		const timeUntilNextAttempt = latestAttempt + retryDelay - Date.now();
		if (timeUntilNextAttempt > 0 && !storedEvent.tryImmediately) {
			console.log('Waiting', timeUntilNextAttempt, 'ms before retrying to post event', storedEvent.event.localUuid);
			continue;
		}

		storedEvent.attempts += 1;
		storedEvent.tryImmediately = false;

		const api = createApi(storedEvent.apiUrl, storedEvent.participantCode);

		const {'X-Participant-Code': participantCode} = api.getHeaders();

		if (!participantCode) {
			console.log('Missing participant code!');
			storedEvent.persisted = true;
			continue;
		}

		// eslint-disable-next-line no-await-in-loop
		const result = await api.postEvent(storedEvent.event, false);
		if (result) {
			storedEvent.persisted = true;
		} else {
			storedEvent.lastAttempt = new Date();
		}
	}

	const remainingEvents = storedEvents.filter(e => !e.persisted);
	console.log(`Uploaded ${
		storedEvents.length - remainingEvents.length
	} events cached previously, ${remainingEvents.length} remain...`);

	saveStoredEvents(remainingEvents);
};

const clearStoredEvent = (event: Event) => {
	const events = loadStoredEvents();

	const newEvents = events.filter(e => e.event.localUuid !== event.localUuid);
	saveStoredEvents(newEvents);
};

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

		saveStoredEvents(storedEvents);
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
			}).catch(e => {
				console.log('Failed to create session:', e);
				sessionPromise = undefined;
			});

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
				console.log('Missing participant code!');
				return false;
			}

			console.log('Creating new session');

			const res = await this.createSession();

			if (res.kind === 'Success') {
				sessionUuid = res.value.uuid;
				sessionStorage.setItem('sessionUuid', sessionUuid);
				console.log('New session', sessionUuid);
				api.sendPageView();
				return true;
			}

			console.log('Failed to create new session:', res.message);

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
			const h = headers();

			if (!h['X-Participant-Code']) {
				console.log('Missing participant code!');
				return false;
			}

			const event = {
				...inputEvent,
				context: inputEvent.context ?? document.referrer,
			};

			event.extensionVersion = packageJson.version;
			event.tabActive = tabIsActive;

			if (event.sessionUuid === '') {
				await this.ensureSession();
				event.sessionUuid = sessionUuid;
			}

			if (storeForRetry) {
				storeEvent(event);
			}

			if (!event.url) {
				event.url = window.location.href;
			}

			const res = await post<boolean>(postEvent, event, h);

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

		getHeaders() {
			return headers();
		},

		logout() {
			localStorage.removeItem('participantCode');
			localStorage.removeItem(eventsStorageKey);
			sessionStorage.removeItem('sessionUuid');
			sessionStorage.removeItem('cfg');
			participantCode = '';
			sessionUuid = '';
		},

		sendPageView() {
			const event = new Event();

			event.type = EventType.PAGE_VIEW;
			event.url = window.location.href;

			api.postEvent(event, true).catch(e => {
				console.log('Failed to send page view event', event.localUuid, 'will be retried later on:', e);
			});
		},

		setTabActive(active: boolean | undefined) {
			tabIsActive = active;
		},
	};

	return api;
};

setInterval(retryToPostStoredEvents, retryDelay);
retryToPostStoredEvents().catch(e => {
	console.error('Failed to retry to post stored events', e);
});
