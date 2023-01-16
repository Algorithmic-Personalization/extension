import React from 'react';

import {createApi, type Api} from './api';

import {has} from './common/util';
import config from '../config.extension';

const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!has(`${env}-server-url`)(config)) {
	throw new Error(`Missing ${env}-server-url in config.extension.ts`);
}

const serverUrl = config[`${env}-server-url`];
console.log('API URL:', serverUrl);

export const defaultApi = createApi(serverUrl);

export const apiContext = React.createContext<Api>(defaultApi);

export const apiProvider = apiContext.Provider;

export const useApi = (): Api => React.useContext(apiContext);

export default apiProvider;
