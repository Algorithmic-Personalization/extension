import semver from 'semver';
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
import {type UpdateManifest, log} from './lib';

import {useApi} from './apiProvider';

import {version} from '../package.json';
import updateManifest from './geckoUpdateUrl.json';

const loadLocalConfig = (): ParticipantConfig | undefined => {
	const item = sessionStorage.getItem('cfg');
	if (item) {
		return JSON.parse(item) as ParticipantConfig;
	}

	return undefined;
};

const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

const UpdateLinkC: React.FC<{link: string | undefined}> = ({link}) => {
	if (!link) {
		return null;
	}

	return (
		<>
			<Typography color='text.primary'>
				There is a new version of the extension for the experiment available,
				please download it and install it.
			</Typography>
			<a href={link}>
				<Button
					variant='contained'
					color='primary'
					sx={{
						mt: 1,
						mb: 2,
					}}
				>
					Download Update
				</Button>
			</a>
		</>
	);
};

const App: React.FC = () => {
	const localCode = localStorage.getItem('participantCode') ?? '';
	const [currentUrl, setCurrentUrl] = useState<string>('');
	const [participantCode, setParticipantCode] = useState<string>(localCode);
	const [participantCodeValid, setParticipantCodeValid] = useState<boolean>(localCode !== '');
	const [error, setError] = useState<string | undefined>();
	const [cfg, setCfg] = useState(loadLocalConfig());
	const [loggedIn, setLoggedIn] = useState<boolean>(false);
	const [updateLink, setUpdateLink] = useState<string | undefined>();

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
		console.log('YouTube Recommendations Experiment v', version);
		console.log('Fetching list of available updates...');

		fetch(updateManifest.update_url).then(async r => r.json()).then((data: UpdateManifest) => {
			console.log('Available updates:', data);
			const {updates} = data.addons[updateManifest.id];

			let maxVersion = version;
			let ffLink: string | undefined;

			for (const update of updates) {
				if (semver.gt(update.version, maxVersion)) {
					maxVersion = update.version;
					ffLink = update.update_link;
				}
			}

			if (ffLink) {
				if (isFirefox) {
					setUpdateLink(ffLink);
				} else {
					setUpdateLink(ffLink.replace(/firefox/g, 'chrome').replace(/\.xpi$/, '.zip'));
				}
			}
		}).catch(console.error);

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
			<Typography color='text.primary'>
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
					<Typography sx={{mb: 2}} color='text.primary'>
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
					<FormHelperText sx={{mb: 2}}>
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
			<Typography color='text.primary'>Loading config...</Typography>
		);
	}

	return (<>
		<UpdateLinkC link={updateLink} />
		<RecommendationsListC url={currentUrl} cfg={cfg} postEvent={postEvent}/>
		<Link onClick={handleLogout} sx={{
			my: 2,
			display: 'block',
			cursor: 'pointer',
			textDecoration: 'none',
		}}>
			log out of experiment
		</Link>
	</>);
};

export default App;
