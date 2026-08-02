import { describe, expect, it } from 'vitest';
import {
	appendBlock,
	findRecordsBlock,
	formatErrorBlock,
	formatRecordsBlock,
	parseRecordsContent,
	repairCorruptedBlock,
	replaceBlock,
} from '../src/features/pomodoro/records-file';
import type { PomodoroRecord } from '../src/features/pomodoro/types';

const rec = (completedAt: number, task = ''): PomodoroRecord => ({
	completedAt,
	task,
	durationMs: 1500000,
});

describe('formatRecordsBlock / parseRecordsContent', () => {
	it('round-trips records with a ```json fence', () => {
		const records = [rec(1, 'a'), rec(2, 'b')];
		const block = formatRecordsBlock(records);
		expect(block).toBe(
			'%% miyu:records\n' +
				'```json\n' +
				'[{"completedAt":1,"task":"a","durationMs":1500000},\n' +
				'{"completedAt":2,"task":"b","durationMs":1500000}]\n' +
				'```\n%%',
		);
		expect(parseRecordsContent(block)).toEqual(records);
	});

	it('parses the old unfenced format for backward compatibility', () => {
		const content =
			'%% miyu:records\n[{"completedAt":1,"task":"a","durationMs":1000}]\n%%';
		expect(parseRecordsContent(content)).toEqual([
			{ completedAt: 1, task: 'a', durationMs: 1000 },
		]);
	});

	it('returns [] when the file has no records block', () => {
		expect(parseRecordsContent('# plain file\n- [ ] task')).toEqual([]);
		expect(parseRecordsContent('')).toEqual([]);
	});

	it('treats an empty block as empty records', () => {
		expect(parseRecordsContent('%% miyu:records\n\n%%')).toEqual([]);
		expect(
			parseRecordsContent('%% miyu:records\n```json\n[]\n```\n%%'),
		).toEqual([]);
	});

	it('returns null when the JSON is corrupted', () => {
		expect(
			parseRecordsContent('%% miyu:records\n[{bad json]\n%%'),
		).toBeNull();
		expect(
			parseRecordsContent('%% miyu:records\n```json\n[{bad json]\n```\n%%'),
		).toBeNull();
	});

	it('returns null when the block is not an array', () => {
		expect(
			parseRecordsContent('%% miyu:records\n{"a":1}\n%%'),
		).toBeNull();
	});

	it('takes the LAST records block and drops malformed entries', () => {
		const content =
			'%% miyu:records\n[{"completedAt":1,"task":"old","durationMs":1}]\n%%\n' +
			'%% miyu:records\n' +
			'[{"completedAt":2,"task":"new","durationMs":2},\n' +
			'{"completedAt":"bad","task":3,"durationMs":null}]\n%%';
		expect(parseRecordsContent(content)).toEqual([
			{ completedAt: 2, task: 'new', durationMs: 2 },
		]);
	});
});

describe('findRecordsBlock', () => {
	it('finds the last block with offsets', () => {
		const content =
			'text before\n' +
			'%% miyu:records\n[{"completedAt":1,"task":"a","durationMs":1}]\n%%\n' +
			'text after';
		const block = findRecordsBlock(content);
		expect(block).not.toBeNull();
		expect(content.slice(block!.start, block!.end)).toBe(
			'%% miyu:records\n[{"completedAt":1,"task":"a","durationMs":1}]\n%%',
		);
		expect(block!.json).toBe(
			'[{"completedAt":1,"task":"a","durationMs":1}]',
		);
	});

	it('ignores unclosed blocks (user mid-edit)', () => {
		expect(
			findRecordsBlock('%% miyu:records\n[{"completedAt":1,"task":"a","durationMs":1}]'),
		).toBeNull();
	});
});

describe('repairCorruptedBlock', () => {
	it('renames the corrupted block to an error block in place', () => {
		const content =
			'header\n' +
			'%% miyu:records\n[{broken json]\n%%\n' +
			'footer';
		const block = findRecordsBlock(content)!;
		const repaired = repairCorruptedBlock(content, block);
		expect(repaired).toBe(
			'header\n' +
				'%% miyu:error-records\n[{broken json]\n%%\n' +
				'footer',
		);
	});

	it('replaces any existing error block (keeps only one)', () => {
		const content =
			'%% miyu:error-records\n[{"old":1}]\n%%\n' +
			'%% miyu:records\n[{broken json]\n%%';
		const block = findRecordsBlock(content)!;
		const repaired = repairCorruptedBlock(content, block);
		// 旧 error 块被移除，损坏块原位变成 error 块（残留空行无害）
		expect(repaired.replace(/^\n/, '')).toBe(
			'%% miyu:error-records\n[{broken json]\n%%',
		);
		expect(repaired).not.toContain('[{"old":1}]');
	});
});

describe('replaceBlock / appendBlock', () => {
	it('replaces a block in place', () => {
		const content =
			'before\n' +
			'%% miyu:records\n[{"completedAt":1,"task":"a","durationMs":1}]\n%%\n' +
			'after';
		const block = findRecordsBlock(content)!;
		const replaced = replaceBlock(
			content,
			block,
			formatRecordsBlock([rec(9)]),
		);
		expect(replaced).toBe(
			'before\n' +
				'%% miyu:records\n```json\n' +
				'[{"completedAt":9,"task":"","durationMs":1500000}]\n' +
				'```\n%%\n' +
				'after',
		);
	});

	it('appends a block with blank-line separation', () => {
		const content = 'some content\nwith lines';
		expect(appendBlock(content, formatRecordsBlock([]))).toBe(
			'some content\nwith lines\n\n' + formatRecordsBlock([]),
		);
	});

	it('appends to an empty file without leading blanks', () => {
		expect(appendBlock('', formatRecordsBlock([]))).toBe(
			formatRecordsBlock([]),
		);
	});
});

describe('formatErrorBlock', () => {
	it('keeps corrupted content verbatim', () => {
		expect(formatErrorBlock('[{\nbad')).toBe(
			'%% miyu:error-records\n[{\nbad\n%%',
		);
	});
});
