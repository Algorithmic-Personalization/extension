const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const {EnvironmentPlugin} = require('webpack');

const mode = process.env.NODE_ENV || 'development';

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
					from: 'src/manifest.base.json',
					to: 'manifest.firefox.json',
					transform(content) {
						const manifest = JSON.parse(content);

						manifest.permissions = hostPermissions;

						// eslint-disable-next-line camelcase
						manifest.browser_specific_settings = {
							gecko: {
								id: '{e2d736d1-6589-4407-9c3d-6ec3ec7afe77}',
								// eslint-disable-next-line camelcase
								update_url: 'https://raw.githubusercontent.com/djfm/ytdpnl-extension/main/update_manifest.json',
							},
						};

						return JSON.stringify(manifest, null, '\t');
					},
				},
				{
					from: 'src/manifest.base.json',
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
	devtool: mode === 'development' ? 'inline-source-map' : false,
	optimization: {
		innerGraph: true,
		mangleExports: 'deterministic',
		moduleIds: 'deterministic',
	},
};
