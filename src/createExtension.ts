import type SubAppCreator from './SubApp';
import {log} from './lib';

export const createExtension = (subApps: SubAppCreator[]) => {
	const start = async () => {
		log('Starting extension with', subApps.length, 'sub-apps');
	};

	return {
		start,
	};
};

export default createExtension;
