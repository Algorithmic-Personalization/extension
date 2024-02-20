import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';
import FileManagerPlugin from 'filemanager-webpack-plugin';
import {EnvironmentPlugin} from 'webpack';

import chromeAdditionalManifestKeys from './src/data/chrome.additional.json';
import hostPermissionsDefinition from './src/data/hostPermissions.json';

const mode = process.env.NODE_ENV ?? 'development';

const {always: hostPermissions} = hostPermissionsDefinition;

if (mode === 'development') {
	hostPermissions.push(...hostPermissionsDefinition.developmentSpecific);
} else {
	hostPermissions.push(...hostPermissionsDefinition.productionSpecific);
}

module.exports = {
	mode,
	entry: {
		'content-script': './src/content-script.tsx',
		'loader-masker': './src/loader-masker.ts',
		background: './src/background.ts',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist', 'chrome'),
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
		fallback: {
			crypto: 'crypto-browserify',
			stream: 'stream-browserify',
			'react-native-sqlite-storage': false,
			path: false,
			fs: false,
			assert: false,
			process: false,
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	plugins: [
		new EnvironmentPlugin(['NODE_ENV']),
		new CopyPlugin({
			patterns: [
				{
					from: 'src/data/manifest.base.json',
					to: 'manifest.firefox.json',
					transform(content) {
						const manifest = JSON.parse(content.toString('utf-8')) as {
							[key: string]: unknown;
							permissions: string[];
						};

						const extraPermissions = ['tabs'];

						manifest.permissions = [...manifest.permissions, ...hostPermissions, ...extraPermissions];

						manifest.background = {
							scripts: ['background.js'],
						};

						return JSON.stringify(manifest, null, '\t');
					},
				},
				{
					from: 'src/data/manifest.base.json',
					to: 'manifest.json',
					transform(content) {
						const manifest = JSON.parse(content.toString('utf-8')) as Record<string, unknown>;
						manifest.manifest_version = 3;
						manifest.host_permissions = hostPermissions;
						Object.assign(manifest, chromeAdditionalManifestKeys);
						return JSON.stringify(manifest, null, '\t');
					},
				},
			],
		}),
		new FileManagerPlugin({
			events: {
				onEnd: {
					copy: [
						{
							source: 'dist/chrome',
							destination: 'dist/firefox',
						},
					],
				},
			},
		}),
		new FileManagerPlugin({
			events: {
				onEnd: {
					copy: [
						{
							source: 'icons',
							destination: 'dist/chrome',
						},
					],
				},
			},
		}),
		new FileManagerPlugin({
			events: {
				onEnd: {
					copy: [
						{
							source: 'icons',
							destination: 'dist/firefox',
						},
					],
				},
			},
		}),
		new FileManagerPlugin({
			events: {
				onEnd: {
					delete: [
						'dist/firefox/manifest.json',
					],
					move: [
						{
							source: 'dist/firefox/manifest.firefox.json',
							destination: 'dist/firefox/manifest.json',
						},
					],
				},
			},
		}),
		new FileManagerPlugin({
			events: {
				onEnd: {
					archive: [
						{
							source: 'dist/chrome',
							destination: 'dist/chrome.zip',
						},
						{
							source: 'dist/firefox',
							destination: 'dist/firefox.zip',
						},
					],
				},
			},
		}),
	],
	devtool: 'eval-source-map',
	optimization: {
		innerGraph: true,
		mangleExports: 'deterministic',
		moduleIds: 'deterministic',
	},
};
