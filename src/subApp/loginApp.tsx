import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';

import {
	Box,
	IconButton,
	Typography,
} from '@mui/material';

import {Close as CloseIcon} from '@mui/icons-material';

import {getThemeContrastBackgroundColor, getThemeContrastTextColor} from '../theme';

import {type SubAppCreator, type SubAppState, ReactAdapter} from '../SubApp';

import MessageC from '../components/MessageC';
import {getFromLocalStorage, log} from '../lib';
import {useApi} from '../apiProvider';

const LoginApp: React.FC<SubAppState & {
	triggerUpdate: (newState: Partial<SubAppState>) => void;
}> = ({
	loggedInExtension,
	loggedInYouTube,
	triggerUpdate,
}) => {
	const [shown, setShown] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [code, setCode] = useState(getFromLocalStorage('participantCode') ?? '');

	const api = useApi();

	if (loggedInExtension && loggedInYouTube) {
		return null;
	}

	if (!shown) {
		return null;
	}

	return (
		<Box sx={{position: 'relative'}}>
			<Box sx={{
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -75%)',
				zIndex: 10000,
				backgroundColor: getThemeContrastBackgroundColor(),
				color: getThemeContrastTextColor(),
				padding: 4,
				borderRadius: 4,
			}}>
				<Box sx={{textAlign: 'right'}}>
					<IconButton
						size='large'
						onClick={() => {
							setShown(false);
							setTimeout(() => {
								setShown(true);
							}, 1000 * 60 * 5);
						}}
						sx={{
							color: getThemeContrastTextColor(),
						}}
					>
						<CloseIcon />
					</IconButton>
				</Box>
				<Typography variant='h4' sx={{m: 2, color: getThemeContrastTextColor()}}>
					Welcome to the YouTube Experiment extension!
				</Typography>
				{((!loggedInYouTube) && <Typography sx={{m: 2, color: getThemeContrastTextColor()}}>
					Please log in to YouTube to use the YouTube Experiment extension.
				</Typography>)}
				{((!loggedInExtension) && <Box sx={{
					color: getThemeContrastTextColor(),
					p: 2,
				}}>
					<Typography sx={{color: getThemeContrastTextColor()}}>
						Please log in to the extension with your participant code to use the YouTube Experiment extension.
					</Typography>

					<form onSubmit={async e => {
						log('submitting extension login form');
						e.preventDefault();
						const maybeConfig = await api.getConfig();

						if (maybeConfig.kind !== 'Success') {
							setError('Failed to get configuration :(');
							return;
						}

						const {value: config} = maybeConfig;

						if (!config) {
							setError('No configuration found in server response :(');
							return;
						}

						api.newSession().then(s => {
							log('New session created:', s);
						}, e => {
							console.error('Error creating new session:', e);
						});

						triggerUpdate({
							config,
						});
					}}>
						<Typography sx={{color: getThemeContrastTextColor()}}>
							Participant code:
						</Typography>

						<input
							style={{
								display: 'block',
								width: '100%',
							}}
							value={code}
							onChange={e => {
								setCode(e.target.value);
							}}
						/>

						<Typography sx={{
							fontSize: '1rem',
							color: getThemeContrastTextColor(),
						}}>
							This is the code that has been give to you by e-mail.
						</Typography>

						<Box sx={{mt: 2}}>
							<button type='submit'>
								Submit
							</button>
						</Box>

						<MessageC message={error} type='error' />
					</form>
				</Box>)}
			</Box>
		</Box>
	);
};

export const loginApp: SubAppCreator = ({api, getElement, triggerUpdate}) => {
	const rootElt = document.createElement('div');
	rootElt.id = 'ytdpnl-extension-login-app';

	const root = createRoot(rootElt);

	const render = (state: SubAppState) => {
		const App = (
			<ReactAdapter api={api}>
				<LoginApp {...{...state, triggerUpdate}} />
			</ReactAdapter>
		);

		root.render(App);
	};

	return {
		getName() {
			return 'loginApp';
		},
		async onUpdate(state) {
			if (!document.querySelector(rootElt.id)) {
				const target = await getElement('body');
				target.prepend(rootElt);
			}

			render(state);

			return [rootElt];
		},
		onDestroy(elt) {
			console.log('Destroying login app');
			root.unmount();
			elt.remove();
		},
	};
};

export default loginApp;
