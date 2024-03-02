import {type SubAppCreator} from './SubApp';
import createExtension from './createExtension';

const subApps: SubAppCreator[] = [
	// Add sub-apps here
];

const extension = createExtension(subApps);
extension.start().catch(console.error);
