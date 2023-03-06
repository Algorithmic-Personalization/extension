import {copyFile} from 'fs/promises';

import semver from 'semver';

import {type VersionDescriptor} from './src/lib';

import {version} from './package.json';
import {version as manifestVersion} from './src/data/manifest.base.json';
import {id} from './src/data/geckoUpdateUrl.json';
import updateManifest from './update_manifest.json';
import {basename} from 'path';

if (version !== manifestVersion) {
	console.log(`There is a mismatch between the package.json version (${version}) and the manifest version (${manifestVersion})`);
	console.error('Please fix that inconsistency and rebuild.');
	process.exit(1);
}

const {addons} = updateManifest;
const {updates} = (addons as any)[id] as {updates: VersionDescriptor[]};

let maxVersion: VersionDescriptor | undefined;

for (const update of updates) {
	if (!maxVersion || semver.gt(update.version, maxVersion.version)) {
		maxVersion = update;
	}
}

console.log(
	'The latest version currently published is:',
	maxVersion?.version ?? 'none',
);

if (!semver.gt(version, maxVersion?.version ?? '0.0.0')) {
	console.log('/!\\ The version in package.json is not greater than the latest version published.');
	console.error('This is probably a mistake, you should probably fix it and re-build.');
}

const getDestination = () => {
	if (updates.length === 0) {
		return `${id}-${version}.crx`;
	}

	const lastVersion = updates[updates.length - 1];
	const name = basename(lastVersion.update_link);
	const [prefix] = name.split('-');
	return `${prefix}-${version}.crx`;
};

const main = async () => {
	console.log('Copying crx to its location in archive...');
	const source = 'dist/chrome.crx';
	const destination = `dist/archive/chrome/${getDestination()}`;
	await copyFile(source, destination);
	console.log(`Copied "${source}" to "${destination}".`);
	console.log('Submit the extension to mozilla and finish the process as described in the HOW_TO_RELEASE.md file.');
};

main().catch(console.error);