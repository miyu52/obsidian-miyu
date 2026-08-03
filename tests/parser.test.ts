import { describe, expect, it } from 'vitest';
import { TFile, type CachedMetadata } from 'obsidian';
import {
	collectGroupIds,
	headingBlockId,
	headingsMissingBlockId,
	makeBlockId,
	parseTaskTree,
} from '../src/features/pomodoro/tasks/parser';

function heading(line: number, level = 1, heading = `H${line}`) {
	return {
		position: { start: { line } },
		level,
		heading,
	};
}

const file = new TFile('notes/tasks.md');

describe('makeBlockId', () => {
	it('generates a block id in Obsidian format', () => {
		expect(makeBlockId()).toMatch(/^\^[a-z0-9]{4}$/);
	});
});

describe('headingBlockId', () => {
	it('extracts a block id from the end of a heading line', () => {
		expect(headingBlockId('# Alpha ^abc1', 0)).toBe('abc1');
		expect(headingBlockId('## Beta   ^x2', 0)).toBe('x2');
	});

	it('returns null when the heading has no block id', () => {
		expect(headingBlockId('# Alpha', 0)).toBeNull();
	});
});

describe('headingsMissingBlockId', () => {
	it('lists headings without a block id', () => {
		const content = '# Alpha ^a1\n\n## Beta\n\n- [ ] task\n';
		const metadata: CachedMetadata = {
			headings: [heading(0, 1, 'Alpha'), heading(2, 2, 'Beta')],
		};
		expect(headingsMissingBlockId(content, metadata)).toEqual([2]);
	});

	it('returns an empty list when every heading has a block id', () => {
		const content = '# Alpha ^a1\n## Beta ^b2\n';
		const metadata: CachedMetadata = {
			headings: [heading(0, 1, 'Alpha'), heading(1, 2, 'Beta')],
		};
		expect(headingsMissingBlockId(content, metadata)).toEqual([]);
	});

	it('handles missing metadata', () => {
		expect(headingsMissingBlockId('', null)).toEqual([]);
	});
});

describe('parseTaskTree group ids', () => {
	const content = '# Alpha ^a1\n\n- [ ] a\n\n## Beta ^b2\n\n- [ ] b\n';

	it('uses the heading block id as the stable key', () => {
		const metadata: CachedMetadata = {
			// heading 缓存文本包含行尾块 ID（Obsidian 行为）
			headings: [heading(0, 1, 'Alpha ^a1'), heading(4, 2, 'Beta ^b2')],
			listItems: [
				{ position: { start: { line: 2 } }, task: ' ' },
				{ position: { start: { line: 6 } }, task: ' ' },
			],
		};
		const tree = parseTaskTree('TASKS', file, content, metadata);
		expect(tree.groups.map((g) => g.id)).toEqual([
			'notes/tasks.md:a1',
		]);
		expect(tree.groups[0]?.title).toBe('Alpha');
		expect(tree.groups[0]?.children.map((c) => c.id)).toEqual([
			'notes/tasks.md:b2',
		]);
		expect(tree.groups[0]?.children[0]?.title).toBe('Beta');
	});

	it('falls back to the line number when the heading has no block id', () => {
		const metadata: CachedMetadata = {
			headings: [heading(0, 1, 'Alpha')],
		};
		const tree = parseTaskTree('TASKS', file, '# Alpha\n', metadata);
		expect(tree.groups[0]?.id).toBe('notes/tasks.md:0');
	});

	it('ids stay stable when lines above the heading shift', () => {
		// 标题上方插入两行后，行号偏移但块 ID 不变
		const shifted = '# Intro\n\n> quote\n\n# Alpha ^a1\n\n- [ ] a\n';
		const metadata: CachedMetadata = {
			headings: [heading(4, 1, 'Alpha')],
			listItems: [{ position: { start: { line: 6 } }, task: ' ' }],
		};
		const tree = parseTaskTree('TASKS', file, shifted, metadata);
		expect(tree.groups[0]?.id).toBe('notes/tasks.md:a1');
	});
});

describe('collectGroupIds', () => {
	it('collects nested group ids in document order', () => {
		const metadata: CachedMetadata = {
			headings: [
				heading(0, 1, 'A'),
				heading(1, 2, 'B'),
				heading(2, 1, 'C'),
			],
		};
		const tree = parseTaskTree(
			'TASKS',
			file,
			'# A ^a1\n## B ^b2\n# C ^c3\n',
			metadata,
		);
		expect(collectGroupIds(tree)).toEqual([
			'notes/tasks.md:a1',
			'notes/tasks.md:b2',
			'notes/tasks.md:c3',
		]);
	});

	it('returns an empty list for an empty tree', () => {
		const tree = parseTaskTree('TASKS', file, '# A\n', {
			headings: [],
		});
		expect(collectGroupIds(tree)).toEqual([]);
	});
});
