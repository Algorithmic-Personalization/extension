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

const getActiveTab = async (): Promise<chrome.tabs.Tab | undefined> =>
	new Promise((resolve, reject) => {
		const queryOptions = {active: true, lastFocusedWindow: true};
		chrome.tabs.query(queryOptions, ([tab]) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
				return;
			}

			resolve(tab);
		});
	});

let activeTabId: number | undefined;

chrome.tabs.onActivated.addListener(tab => {
	console.log('New tab:', tab);
	const {tabId} = tab;

	if (tabId === undefined) {
		return;
	}

	chrome.tabs.sendMessage(tabId, {
		type: 'your-tab-is-active',
		tabId: tab.tabId,
	}, response => {
		console.log(`Tab ${tabId} replied:`, response);
	});

	for (const id of tabIds) {
		if (id !== tabId) {
			chrome.tabs.sendMessage(id, {
				type: 'your-tab-is-not-active',
				tabId: tab.tabId,
			}, response => {
				console.log(`Tab ${id} replied:`, response);
			});
		}
	}
});

const tabIds = new Set<number>();

chrome.tabs.onRemoved.addListener(tabId => {
	console.log('Tab removed:', tabId);
	tabIds.delete(tabId);
});

const main = async () => {
	const [initialTabs, activeTab] = await Promise.all([
		getAllTabs(),
		getActiveTab(),
	]);

	console.log('Initial tabs:', initialTabs);
	for (const {id} of initialTabs) {
		if (id === undefined) {
			continue;
		}

		tabIds.add(id);
	}

	if (activeTab) {
		activeTabId = activeTab.id;
	}
};

main().catch(console.error);
