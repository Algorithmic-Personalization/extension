type TabCallback = (tab: chrome.tabs.Tab) => void;

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
