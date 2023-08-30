import {join} from 'path';
import {createWriteStream} from 'fs';
import {mkdir, readdir, cp, stat, rm} from 'fs/promises';
import archiver from 'archiver';

import {version} from './package.json';
import {version as manifestVersion} from './src/data/manifest.base.json';

const bail = (message: string) => {
	console.error(message);
	process.exit(1);
};

if (version !== manifestVersion) {
	bail(`Version mismatch between package.json (${version}) and manifest.base.json (${manifestVersion})`);
}

const sourceZipBaseName = 'source';
const targetDistDir = join(__dirname, 'dist');
const tmpDirname = 'package-dir.tmp';
const tmpDir = join(__dirname, tmpDirname);
const sourcePath = join(targetDistDir, `${sourceZipBaseName}.zip`);

const readDirRecursively = async (dir: string): Promise<string[]> => {
	const entries = await readdir(dir);

	const files = await Promise.all(entries.map(async entry => {
		const path = join(dir, entry);

		try {
			const s = await stat(path);
			if (s.isDirectory()) {
				if (dir.startsWith('.')) {
					return [];
				}

				return await readDirRecursively(path);
			}

			if (s.isFile()) {
				return [path];
			}

			return [];
		} catch (e) {
			return [];
		}
	}));

	return files.flat();
};

const includeInSourcePackage = (entry: string) => {
	if (entry.startsWith('.')) {
		return false;
	}

	if (entry === 'node_modules') {
		return false;
	}

	if (entry === tmpDirname) {
		return false;
	}

	return true;
};

const main = async () => {
	console.log('Making output dir...');

	await mkdir(tmpDir, {recursive: true});

	const dirEntries = await readdir(__dirname);

	const cpPromises: Array<Promise<any>> = dirEntries
		.filter(includeInSourcePackage)
		.map(async entry => cp(entry, join(tmpDir, entry), {recursive: true}));

	console.log('Copying relevant files...');
	await Promise.all(cpPromises);
	console.log('Done copying relevant files!');

	const zipOutput = createWriteStream(sourcePath);
	const archive = archiver('zip', {
		zlib: {level: 9},
	});

	zipOutput.on('close', () => {
		console.log(`Created ${sourcePath} (${archive.pointer()} total bytes)`);
	});

	zipOutput.on('end', () => {
		console.log('Data has been drained');
	});

	zipOutput.on('warning', err => {
		if (err.code === 'ENOENT') {
			console.warn(err);
		} else {
			bail(err.message);
		}
	});

	archive.on('error', e => bail(e.message));

	archive.pipe(zipOutput);

	const files = await readDirRecursively(tmpDir);

	for (const file of files) {
		const name = file.replace(tmpDir, '');
		console.log('Adding', {file}, 'as', {name}, 'to archive...');

		archive.file(file, {name});
	}

	console.log('Archiving...');
	await archive.finalize();
	console.log('Done creating:', sourcePath);

	console.log('Cleaning up...');
	await rm(tmpDir, {recursive: true});
	console.log('Done cleaning up!');
	console.log('You can submit this file as source to the Chrome Web Store and Firefox Add-ons:', sourcePath);
};

main().catch(bail);
