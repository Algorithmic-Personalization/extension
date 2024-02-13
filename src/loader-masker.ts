import {isOnHomePage, loaderId} from './lib';

const isBodyPresent = () => Boolean(document.body);

const waitForHomePageAndBody = async () => new Promise<void>(resolve => {
	const condition = () => isOnHomePage() && isBodyPresent();

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

	document.body.appendChild(maskingDiv);
	document.body.style.overflow = 'hidden';
};

const start = async () => {
	await waitForHomePageAndBody();
	installLoader();

	console.log('The body is present');
};

start().catch(e => {
	console.error('Failed to start loader:', e);
});
