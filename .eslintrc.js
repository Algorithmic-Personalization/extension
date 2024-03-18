module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		'plugin:react/recommended',
		'plugin:import/recommended',
		'plugin:import/typescript',
		'xo',
	],
	overrides: [
		{
			extends: [
				'xo-typescript',
			],
			files: [
				'*.ts',
				'*.tsx',
			],
		},
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: [
		'react',
	],
	rules: {
		'new-cap': 0,
		'import/no-unused-modules': 'warn',
		'import/no-named-as-default': 0,
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
};
