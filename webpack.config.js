const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const {EnvironmentPlugin} = require('webpack');

const mode = process.env.NODE_ENV || 'development';
const isProduction = mode === 'production';

const hostPermissions = [
	'*://*.youtube.com/*',
	'*://*.youtu.be/*',
	'*://ytdpnl-dev.fmdj.fr/*',
	'*://ytdpnl.fmdj.fr/*',
];

module.exports = {
	mode,
	entry: './src/content-script.tsx',
	output: {
		filename: 'content-script.js',
		path: path.resolve(__dirname, 'dist', 'extension', 'chrome'),
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
					from: 'src/extension/manifest.base.json',
					to: 'manifest.firefox.json',
					transform(content) {
						const manifest = JSON.parse(content);
						manifest.permissions = hostPermissions;
						return JSON.stringify(manifest, null, '\t');
					},
				},
				{
					from: 'src/extension/manifest.base.json',
					to: 'manifest.json',
					transform(content) {
						const manifest = JSON.parse(content);
						// eslint-disable-next-line camelcase
						manifest.manifest_version = 3;
						// eslint-disable-next-line camelcase
						manifest.host_permissions = [...hostPermissions];
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
							source: 'dist/extension/chrome',
							destination: 'dist/extension/firefox',
						},
					],
				},
			},
		}),
		new FileManagerPlugin({
			events: {
				onEnd: {
					delete: [
						'dist/extension/firefox/manifest.json',
					],
					move: [
						{
							source: 'dist/extension/firefox/manifest.firefox.json',
							destination: 'dist/extension/firefox/manifest.json',
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
							source: 'dist/extension/chrome',
							destination: 'dist/extension/chrome.zip',
						},
						{
							source: 'dist/extension/firefox',
							destination: 'dist/extension/firefox.zip',
						},
					],
				},
			},
		}),
	],
	devtool: isProduction ? false : 'inline-source-map',
};
