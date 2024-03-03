import {type SubAppCreator} from './SubApp';
import createExtension from './createExtension';

import loginApp from './subApp/loginApp';
import homeApp from './subApp/homeApp';
import logoutApp from './subApp/logoutApp';

import {defaultApi as api} from './apiProvider';

const subApps: SubAppCreator[] = [
	loginApp,
	logoutApp,
	homeApp,
];

const extension = createExtension(api)(subApps);
extension.start().catch(console.error);
