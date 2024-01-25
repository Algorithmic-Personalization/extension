import React, {useEffect, useState} from 'react';

import {
	Box,
	Button,
	Link,
	TextField,
	Typography,
	FormHelperText,
} from '@mui/material';

import {type ParticipantConfig} from './common/models/experimentConfig';
import Event from './common/models/event';

import MessageC from './components/MessageC';

import RecommendationsListC from './components/RecommendationsListC';
import {isLoggedIn, log} from './lib';

import {useApi} from './apiProvider';

import packageJson from '../package.json';

const loadLocalConfig = (): ParticipantConfig | undefined => {
	const item = sessionStorage.getItem('cfg');
	if (item) {
		return JSON.parse(item) as ParticipantConfig;
	}

	return undefined;
};

const App: React.FC = () => {
	const localCode = localStorage.getItem('participantCode') ?? sessionStorage.getItem('participantCode') ?? '';
	const [currentUrl, setCurrentUrl] = useState<string>('');
	const [participantCode, setParticipantCode] = useState<string>(localCode);
	const [participantCodeValid, setParticipantCodeValid] = useState<boolean>(localStorage.getItem('participantCodeValid') === 'true');
	const [error, setError] = useState<string | undefined>();
	const [cfg, setCfg] = useState(loadLocalConfig());
	const [loggedIn, setLoggedIn] = useState<boolean>(localStorage.getItem('loggedIn') === 'true');

	const api = useApi();

	const handleLogout = () => {
		api.logout();
		sessionStorage.removeItem('cfg');
		setParticipantCode('');
		setParticipantCodeValid(false);
		localStorage.removeItem('participantCode');
		localStorage.removeItem('participantCodeValid');
		localStorage.removeItem('loggedIn');
	};

	const updateUrl = () => {
		if (window.location.href !== currentUrl) {
			log('SETTING CURRENT URL', window.location.href);
			setCurrentUrl(window.location.href);
		}
	};

	const updateLoggedIn = () => {
		if (isLoggedIn()) {
			localStorage.setItem('loggedIn', 'true');
			setLoggedIn(true);
		} else {
			setTimeout(() => {
				if (!isLoggedIn()) {
					localStorage.setItem('loggedIn', 'false');
					setLoggedIn(false);
				}
			}, 15000);
		}
	};

	const postEvent = async (e: Event) => {
		const enrichedEvent = new Event();
		Object.assign(enrichedEvent, e);

		if (cfg) {
			enrichedEvent.experimentConfigId = cfg.experimentConfigId;
		}

		api.postEvent(enrichedEvent, true).catch(e => {
			console.log('Error posting event ', enrichedEvent.localUuid, 'will be retried later on:', e);
		});
	};

	useEffect(() => {
		const codeInSessionStorage = sessionStorage.getItem('participantCode');

		if (codeInSessionStorage) {
			localStorage.setItem('participantCode', codeInSessionStorage);
			sessionStorage.removeItem('participantCode');
		}

		console.log('YouTube Recommendations Experiment v', packageJson.version);

		updateUrl();
		updateLoggedIn();

		const observer = new MutationObserver(() => {
			updateUrl();
			updateLoggedIn();
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		return () => {
			observer.disconnect();
		};
	});

	useEffect(() => {
		if (participantCode === '' || !participantCodeValid) {
			return;
		}

		api.getConfig().then(c => {
			if (c.kind === 'Success') {
				setCfg(c.value);
				sessionStorage.setItem('cfg', JSON.stringify(c.value));
			} else {
				console.error('Could not get config:', c.message);
			}
		}).catch(e => {
			console.log('Error getting config:', e);
		});
	}, [currentUrl, participantCode, participantCodeValid]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(undefined);

		if (participantCode === undefined) {
			return;
		}

		const valid = await api.checkParticipantCode(participantCode);

		if (!valid) {
			setError('Invalid participant code');
			setParticipantCodeValid(false);
			localStorage.setItem('participantCodeValid', 'false');
			return;
		}

		setParticipantCodeValid(true);
		localStorage.setItem('participantCodeValid', 'true');
		api.setAuth(participantCode);
		api.newSession().catch(e => {
			console.log('Error creating new session:', e);
		});
	};

	const codeForm = (text = (<>
			Welcome to the experiment!<br />
			Please enter your participant code to continue.
	</>)) => (<form onSubmit={handleSubmit}>
		<Box sx={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'stretch',
		}}>
			<Typography sx={{mb: 2}} color='text.primary'>
				{text}
			</Typography>
			<TextField
				label='Participant Code'
				value={participantCode}
				onChange={e => {
					setParticipantCode(e.target.value);
				}}
			/>
			<FormHelperText sx={{mb: 2}}>
				This is the code that has been give to you by e-mail.
			</FormHelperText>
			<Button type='submit' variant='contained'>
				Submit
			</Button>
			<MessageC message={error} type='error' />
		</Box>
	</form>);

	if (!loggedIn) {
		return (
			<Typography color='text.primary'>
				You need to be logged in to YouTube to use this extension.
			</Typography>
		);
	}

	if (!participantCode) {
		return codeForm();
	}

	if (participantCode && !participantCodeValid) {
		return codeForm();
	}

	const logout = (
		<Link onClick={handleLogout} sx={{
			my: 2,
			display: 'block',
			cursor: 'pointer',
			textDecoration: 'none',
		}}>
			log out of experiment
		</Link>
	);

	if (!cfg) {
		return (
			<Typography color='text.primary'>
				Loading configuration...<br />
				Please refresh the page if this seems to be taking too long.
			</Typography>
		);
	}

	return (<>
		<RecommendationsListC url={currentUrl} cfg={cfg} postEvent={postEvent}/>
		{logout}
	</>);
};

export default App;
