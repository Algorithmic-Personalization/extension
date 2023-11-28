export const isOnVideoPage = () => window.location.pathname === '/watch';
export const isVideoPage = (url?: string): url is string => Boolean(
	url && new URL(url).pathname.startsWith('/watch'),
);
export const isOnHomePage = () => window.location.pathname === '/';

export const debug = process.env.NODE_ENV === 'development';

export const log = (...args: any[]) => {
	if (!debug) {
		return;
	}

	console.log(...args);
};

export type VersionDescriptor = {
	version: string;
	update_link: string;
};

export type UpdateManifest = {
	addons: Record<string, {
		updates: VersionDescriptor[];
	}>;
};

export const extractYtInitialData = (rawPageHtml: string) => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(rawPageHtml, 'text/html');
	const scripts = Array.from(doc.querySelectorAll('script'));

	return scripts.find(script => {
		const {textContent} = script;

		if (textContent) {
			return textContent.trimStart().startsWith('var ytInitialData = ');
		}

		return false;
	});
};
