type TabCallback = (tab: chrome.tabs.Tab) => void;

const getAllTabs = async (): Promise<chrome.tabs.Tab[]> => new Promise((resolve, reject) => {
	chrome.tabs.query({}, tabs => {
		if (chrome.runtime.lastError) {
			reject(chrome.runtime.lastError);
			return;
		}

		resolve(tabs);
	});
});

const getCurrentTab = async (callback: TabCallback) => {
	const queryOptions = {active: true, lastFocusedWindow: true};
	chrome.tabs.query(queryOptions, ([tab]) => {
		if (chrome.runtime.lastError) {
			console.error(chrome.runtime.lastError);
			return;
		}
		// `tab` will either be a `tabs.Tab` instance or `undefined`.

		callback(tab);
	});
};

getCurrentTab(tab => {
	console.log(tab);
}).catch(console.error);

chrome.tabs.onActivated.addListener(tab => {
	console.log('Active tab:', tab);
});

const main = async () => {
	const initialTabs = await getAllTabs();
	console.log('Initial tabs:', initialTabs);
};

main().catch(console.error);
