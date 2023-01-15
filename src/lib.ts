export const isOnVideoPage = () => window.location.pathname === '/watch';

export const debug = process.env.NODE_ENV === 'development';

export const log = (...args: any[]) => {
	if (!debug) {
		return;
	}

	console.log(...args);
};
