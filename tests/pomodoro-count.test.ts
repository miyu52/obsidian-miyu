import { describe, expect, it } from 'vitest';
import {
	formatPomodoroCount,
	incrementPomodoroText,
	parsePomodoroCount,
	POMODORO_REGEX,
} from '../src/features/pomodoro/pomodoro-count';
import { DESERIALIZERS } from '../src/features/pomodoro/tasks/serializer';

describe('parsePomodoroCount', () => {
	it('parses bare counts', () => {
		expect(parsePomodoroCount('3')).toEqual({ actual: 3, expected: null });
		expect(parsePomodoroCount('0')).toEqual({ actual: 0, expected: null });
	});

	it('parses actual/expected counts', () => {
		expect(parsePomodoroCount('2/3')).toEqual({ actual: 2, expected: 3 });
		expect(parsePomodoroCount('3 / 5')).toEqual({ actual: 3, expected: 5 });
		expect(parsePomodoroCount('2/ 5')).toEqual({ actual: 2, expected: 5 });
		expect(parsePomodoroCount('/5')).toEqual({ actual: 0, expected: 5 });
	});

	it('returns null for empty or invalid text', () => {
		expect(parsePomodoroCount('')).toBeNull();
		expect(parsePomodoroCount('  ')).toBeNull();
		expect(parsePomodoroCount('abc')).toBeNull();
	});
});

describe('incrementPomodoroText', () => {
	it('increments a TASKS-style bracketed count', () => {
		expect(incrementPomodoroText('task [🍅:: 2/3]')).toBe(
			'task [🍅:: 3/3]',
		);
	});

	it('increments a DATAVIEW-style parenthesized count', () => {
		expect(incrementPomodoroText('task (🍅:: 1)')).toBe('task (🍅:: 2)');
	});

	it('increments an empty actual', () => {
		expect(incrementPomodoroText('task [🍅:: /3]')).toBe('task [🍅:: 1/3]');
	});

	it('leaves bare counts untouched (only bracketed/parenthesized forms are detected, as before)', () => {
		expect(incrementPomodoroText('task 🍅:: 3/3')).toBe('task 🍅:: 3/3');
	});

	it('leaves text without a count untouched', () => {
		const body = 'plain task';
		expect(incrementPomodoroText(body)).toBe(body);
	});
});

describe('formatPomodoroCount', () => {
	it('formats with and without a target', () => {
		expect(formatPomodoroCount({ actual: 2, expected: 3 })).toBe(
			'🍅:: 2/3',
		);
		expect(formatPomodoroCount({ actual: 2, expected: null })).toBe(
			'🍅:: 2',
		);
	});
});

describe('POMODORO_REGEX', () => {
	it('detects bracketed and parenthesized counts', () => {
		expect('task [🍅:: 2/3]'.match(POMODORO_REGEX)?.[1]).toBe('2/3');
		expect('task (🍅:: 1)'.match(POMODORO_REGEX)?.[1]).toBe('1');
		expect('task plain'.match(POMODORO_REGEX)).toBeNull();
	});
});

describe('serializer pomodoro counts', () => {
	it('parses TASKS format', () => {
		const detail = DESERIALIZERS.TASKS.deserialize('write docs [🍅:: 2/3]');
		expect(detail.description).toBe('write docs');
		expect(detail.pomodoros).toEqual({ actual: 2, expected: 3 });
	});

	it('parses DATAVIEW format', () => {
		const detail = DESERIALIZERS.DATAVIEW.deserialize('write docs (🍅:: 1)');
		expect(detail.description).toBe('write docs');
		expect(detail.pomodoros).toEqual({ actual: 1, expected: null });
	});

	it('returns null pomodoros when absent', () => {
		expect(DESERIALIZERS.TASKS.deserialize('plain task').pomodoros).toBeNull();
	});
});
