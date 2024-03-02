import {type SubAppCreator} from './SubApp';
import createExtension from './createExtension';

import loginApp from './subApp/loginApp';

import {defaultApi as api} from './apiProvider';

const subApps: SubAppCreator[] = [
	loginApp,
];

const extension = createExtension(api)(subApps);
extension.start().catch(console.error);
