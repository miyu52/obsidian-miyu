import { describe, expect, it } from 'vitest';
import {
	extractTaskComponents,
	findLineByBlockLink,
} from '../src/features/pomodoro/tasks/line-utils';

describe('extractTaskComponents', () => {
	it('parses a task line with indentation, marker, status and block id', () => {
		const c = extractTaskComponents(
			'  - [x] write docs [🍅:: 2/3] ^abc1',
		);
		expect(c).toEqual({
			indentation: '  ',
			listMarker: '-',
			status: 'x',
			body: 'write docs [🍅:: 2/3]',
			blockLink: ' ^abc1',
		});
	});

	it('returns null for non-task lines', () => {
		expect(extractTaskComponents('# heading')).toBeNull();
		expect(extractTaskComponents('plain text')).toBeNull();
		expect(extractTaskComponents('')).toBeNull();
	});
});

describe('findLineByBlockLink', () => {
	const content =
		'# Heading\n' +
		'- [ ] first task ^a1\n' +
		'- [ ] second task\n' +
		'  - [ ] nested task ^b2\n';

	it('finds the line ending with the block id', () => {
		expect(findLineByBlockLink(content, ' ^a1')).toBe(1);
		expect(findLineByBlockLink(content, ' ^b2')).toBe(3);
	});

	it('returns null when the block id is missing', () => {
		expect(findLineByBlockLink(content, ' ^nope')).toBeNull();
		expect(findLineByBlockLink(content, ' ^a1 ')).toBeNull();
	});

	it('returns null for an empty block link', () => {
		expect(findLineByBlockLink(content, '')).toBeNull();
	});

	it('only matches at the end of the line, never inside the body', () => {
		// `^a1` 出现在正文中间（不是行尾块 ID）→ 不匹配
		const c = '- [ ] mentions ^a1 in text\n';
		expect(findLineByBlockLink(c, ' ^a1')).toBeNull();
		const c2 = '- [ ] mentions ^a1 in text but has own ^b2\n';
		expect(findLineByBlockLink(c2, ' ^a1')).toBeNull();
		expect(findLineByBlockLink(c2, ' ^b2')).toBe(0);
	});
});
