export const isOnVideoPage = () => window.location.pathname === '/watch';
export const isVideoPage = (url?: string): url is string => Boolean(
	url && new URL(url).pathname.startsWith('/watch'),
);

export const debug = process.env.NODE_ENV === 'development';

export const log = (...args: any[]) => {
	if (!debug) {
		return;
	}

	console.log(...args);
};
