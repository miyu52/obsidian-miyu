import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings';
import {
	DEFAULT_POMODORO_SETTINGS,
	normalizePomodoroSettings,
} from '../src/features/pomodoro/settings';

describe('normalizePomodoroSettings', () => {
	it('fills missing keys with defaults', () => {
		const s = normalizePomodoroSettings({ workMinutes: 50 });
		expect(s.workMinutes).toBe(50);
		expect(s.breakMinutes).toBe(DEFAULT_POMODORO_SETTINGS.breakMinutes);
		expect(s.records).toEqual([]);
		expect(s.files).toEqual([]);
	});

	it('handles a null/undefined payload', () => {
		const s = normalizePomodoroSettings(null);
		expect(s.workMinutes).toBe(DEFAULT_POMODORO_SETTINGS.workMinutes);
	});

	it('does NOT share array references with the defaults', () => {
		const s = normalizePomodoroSettings({ records: [{ completedAt: 1, task: '', durationMs: 1000 }] });
		s.records.push({ completedAt: 2, task: '', durationMs: 1000 });
		s.files.push('a.md');
		expect(DEFAULT_POMODORO_SETTINGS.records).toHaveLength(0);
		expect(DEFAULT_POMODORO_SETTINGS.files).toHaveLength(0);
	});

	it('does NOT share nested object references (activeTask)', () => {
		const s = normalizePomodoroSettings({
			activeTask: { path: 'a.md', blockLink: '^x' },
		});
		s.activeTask!.path = 'mutated.md';
		expect(s.activeTask!.path).toBe('mutated.md');
	});

	it('drops keys unknown to the defaults (old flat settings)', () => {
		const s = normalizePomodoroSettings({ oldFlatKey: 42 } as never);
		expect(s).not.toHaveProperty('oldFlatKey');
	});
});

describe('normalizeSettings', () => {
	it('merges every section', () => {
		const s = normalizeSettings({
			language: 'en',
			randomFile: { length: 12, uppercase: true, lowercase: true, numbers: false, symbols: false },
			pomodoro: { workMinutes: 40 },
		});
		expect(s.language).toBe('en');
		expect(s.randomFile.length).toBe(12);
		expect(s.randomFile.symbols).toBe(false);
		expect(s.pomodoro.workMinutes).toBe(40);
		expect(s.pomodoro.breakMinutes).toBe(
			DEFAULT_POMODORO_SETTINGS.breakMinutes,
		);
	});

	it('handles a null payload', () => {
		const s = normalizeSettings(null);
		expect(s.language).toBe(DEFAULT_SETTINGS.language);
		expect(s.randomFile.length).toBe(DEFAULT_SETTINGS.randomFile.length);
	});

	it('deep-merges nested feature settings', () => {
		const s = normalizeSettings({ pomodoro: { weekStart: 1 } });
		expect(s.pomodoro.weekStart).toBe(1);
		expect(s.pomodoro.taskFormat).toBe(
			DEFAULT_POMODORO_SETTINGS.taskFormat,
		);
	});

	it('does not share arrays with DEFAULT_SETTINGS', () => {
		const s = normalizeSettings(null);
		s.pomodoro.records.push({ completedAt: 1, task: '', durationMs: 1000 });
		s.pomodoro.files.push('a.md');
		expect(DEFAULT_SETTINGS.pomodoro.records).toHaveLength(0);
		expect(DEFAULT_SETTINGS.pomodoro.files).toHaveLength(0);
	});
});
