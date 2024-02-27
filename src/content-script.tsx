import {isDebug, isOnHomePage, loaderId, log} from './lib';
import {defaultApi as api} from './apiProvider';

const apiSession = api.createSession();

const isBodyPresent = () => Boolean(document.body);

const waitForBody = async () => new Promise<void>(resolve => {
	const condition = isBodyPresent;

	if (condition()) {
		resolve();
		return;
	}

	const observer = new MutationObserver(() => {
		if (condition()) {
			observer.disconnect();
			resolve();
		}
	});

	observer.observe(document.documentElement, {childList: true, subtree: true});
});

let loaderInstalled = false;

const installLoader = () => {
	const maskingDiv = document.createElement('div');
	maskingDiv.style.position = 'fixed';
	maskingDiv.style.top = '0';
	maskingDiv.style.left = '0';
	maskingDiv.style.width = '100%';
	maskingDiv.style.height = '100%';
	maskingDiv.style.backgroundColor = 'white';
	maskingDiv.style.zIndex = '100000';
	maskingDiv.id = loaderId;

	if (isDebug()) {
		maskingDiv.style.opacity = localStorage.getItem('opacity') ?? '1';
		const removeMaskBtn = document.createElement('button');
		removeMaskBtn.type = 'button';
		removeMaskBtn.style.margin = '42px';
		removeMaskBtn.textContent = 'Remove loader mask (this is only visible in debug mode)';
		removeMaskBtn.addEventListener('click', e => {
			e.preventDefault();
			maskingDiv.remove();
		});
		maskingDiv.appendChild(removeMaskBtn);

		const helpText = document.createElement('p');
		helpText.style.display = 'block';
		helpText.style.margin = '42px';
		helpText.style.border = '1px solid #ccc';
		helpText.style.backgroundColor = 'white';
		helpText.style.padding = '12px';
		helpText.style.width = 'fit-content';
		helpText.style.fontWeight = 'bold';
		helpText.style.fontSize = '20px';
		helpText.textContent = 'You can reduce the opacity of the mask by setting the variable "opacity" in localStorage. The value should be a number between 0 and 1.';
		maskingDiv.appendChild(helpText);
	}

	document.body.appendChild(maskingDiv);
	loaderInstalled = true;
};

const unInstallLoader = () => {
	if (loaderInstalled) {
		loaderInstalled = false;
		const loader = document.getElementById(loaderId);
		if (!loader) {
			return;
		}

		loader.remove();
	}
};

const setupParticipantCodeForm = () => {
	log('TODO', 'setupParticipantCodeForm');
};

const start = async () => {
	apiSession.then(() => {
		log('API session created');
	}).catch(() => {
		setupParticipantCodeForm();
		console.error('Failed to create API session');
	});

	await waitForBody();

	if (isOnHomePage()) {
		installLoader();

		// TODO: add conditions to wait for...
		unInstallLoader();
	}
};

start().catch(e => {
	console.error('Failed to start loader:', e);
});
