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

import MessageC from './common/components/MessageC';

import RecommendationsListC from './components/RecommendationsListC';
import {log} from './lib';

import {useApi} from './apiProvider';

const loadLocalConfig = (): ParticipantConfig | undefined => {
	const item = sessionStorage.getItem('cfg');
	if (item) {
		return JSON.parse(item) as ParticipantConfig;
	}

	return undefined;
};

const App: React.FC = () => {
	const localCode = localStorage.getItem('participantCode') ?? '';
	const [currentUrl, setCurrentUrl] = useState<string>('');
	const [participantCode, setParticipantCode] = useState<string>(localCode);
	const [participantCodeValid, setParticipantCodeValid] = useState<boolean>(localCode !== '');
	const [error, setError] = useState<string | undefined>();
	const [cfg, setCfg] = useState(loadLocalConfig());
	const [loggedIn, setLoggedIn] = useState<boolean>(false);

	const api = useApi();

	const handleLogout = () => {
		api.logout();
		sessionStorage.removeItem('cfg');
		setParticipantCode('');
		setParticipantCodeValid(false);
	};

	const updateUrl = () => {
		if (window.location.href !== currentUrl) {
			log('SETTING CURRENT URL', window.location.href);
			setCurrentUrl(window.location.href);
		}
	};

	const updateLoggedIn = () => {
		const loggedInWidget = document.querySelector('#avatar-btn');
		if (loggedInWidget) {
			setLoggedIn(true);
		} else {
			setLoggedIn(false);
		}
	};

	const postEvent = async (e: Event) => {
		const enrichedEvent = new Event();
		Object.assign(enrichedEvent, e);

		if (cfg) {
			enrichedEvent.experimentConfigId = cfg.experimentConfigId;
		}

		api.postEvent(enrichedEvent, true).catch(console.error);
	};

	useEffect(() => {
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
		if (participantCode === '') {
			return;
		}

		api.getConfig().then(c => {
			if (c.kind === 'Success') {
				setCfg(c.value);
				sessionStorage.setItem('cfg', JSON.stringify(c.value));
			} else {
				console.error('Could not get config:', c.message);
			}
		}).catch(console.error);
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
			return;
		}

		setParticipantCodeValid(true);
		api.setAuth(participantCode);
		api.newSession().catch(console.error);
	};

	if (!loggedIn) {
		return (
			<Typography>
				You need to be logged in to YouTube to use this extension.
			</Typography>
		);
	}

	if (!participantCodeValid) {
		return (
			<form onSubmit={handleSubmit}>
				<Box sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'stretch',
				}}>
					<Typography sx={{mb: 2}}>
						Welcome to the experiment!<br />
						Please enter your participant code to continue.
					</Typography>
					<TextField
						label='Participant Code'
						value={participantCode}
						onChange={e => {
							setParticipantCode(e.target.value);
						}}
					/>
					<FormHelperText>
						This is the code that has been give to you by e-mail.
					</FormHelperText>
					<Button type='submit' variant='contained'>
						Submit
					</Button>
					<MessageC message={error} type='error' />
				</Box>
			</form>
		);
	}

	if (!cfg) {
		return (
			<Typography>Loading config...</Typography>
		);
	}

	return (<>
		<RecommendationsListC url={currentUrl} cfg={cfg} postEvent={postEvent}/>
		<Link onClick={handleLogout} sx={{
			my: 2,
			display: 'block',
		}}>
			log out of experiment
		</Link>
	</>);
};

export default App;
