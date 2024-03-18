import {type SubAppCreator} from './SubApp';
import createExtension from './createExtension';

import loginApp from './subApp/loginApp';
import homeApp from './subApp/homeApp';
import logoutApp from './subApp/logoutApp';
import videoApp from './subApp/videoApp';

import {defaultApi as api} from './apiProvider';
import {log} from './lib';

const subApps: SubAppCreator[] = [
	loginApp,
	logoutApp,
	homeApp,
	videoApp,
];

const extension = createExtension(api, log)(subApps);
extension.start().catch(console.error);
