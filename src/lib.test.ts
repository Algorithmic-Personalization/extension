import {walkTree, type TreeCallback} from './lib';

describe('walkTree', () => {
	it('should walk the tree', () => {
		const tree = {
			a: {
				b: [1, 2],
				c: [3, 4],
			},
			x: {
				y: [5, 6],
				z: [7, 8],
			},
		};

		const expectedLeaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
		const actualLeaves: number[] = [];

		const expectedPaths: string[][] = [
			[],
			['a'],
			['a', 'b'],
			['a', 'b', '0'],
			['a', 'b', '1'],
			['a', 'c'],
			['a', 'c', '0'],
			['a', 'c', '1'],
			['x'],
			['x', 'y'],
			['x', 'y', '0'],
			['x', 'y', '1'],
			['x', 'z'],
			['x', 'z', '0'],
			['x', 'z', '1'],
		];

		const actualPaths: string[][] = [];

		const cb: TreeCallback = (node, path) => {
			actualPaths.push(path);
			if (path.length === 3) {
				actualLeaves.push(node as number);
			}

			return 'recurse';
		};

		walkTree(cb)(tree);

		expect(actualPaths).toEqual(expectedPaths);
		expect(actualLeaves).toEqual(expectedLeaves);
	});

	it('should ignore specified nodes', () => {
		const tree = {
			a: {
				b: [1, 2],
				c: [3, 4],
			},
			x: {
				y: [5, 6],
				z: [7, 8],
			},
		};

		const expectedPaths: string[][] = [
			[],
			['a'],
			['x'],
			['x', 'y'],
			['x', 'y', '0'],
			['x', 'y', '1'],
			['x', 'z'],
			['x', 'z', '0'],
			['x', 'z', '1'],
		];

		const actualPaths: string[][] = [];

		const cb: TreeCallback = (_node, path) => {
			actualPaths.push(path);

			if (path[path.length - 1] === 'a') {
				return 'stop';
			}

			return 'recurse';
		};

		walkTree(cb)(tree);

		expect(actualPaths).toEqual(expectedPaths);
	});
});
