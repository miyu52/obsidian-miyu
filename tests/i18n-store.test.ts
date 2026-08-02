import { describe, expect, it } from 'vitest';
import { t, type Locale } from '../src/i18n';
import { writable } from '../src/core/store';

describe('t()', () => {
	it('returns the key text for the requested locale', () => {
		expect(t('mode.work', 'en')).toBe('Work');
		expect(t('mode.work', 'zh-CN')).toBe('工作');
	});

	it('falls back to English when the key is missing in the target locale', () => {
		expect(t('mode.break', 'zh-CN')).toBe('休息');
		expect(t('mode.break', 'en')).toBe('Break');
	});

	it('substitutes {var} placeholders', () => {
		expect(t('stats.day-total', 'en', { count: '3' })).toBe(
			'3 pomodoros',
		);
	});
});

describe('writable', () => {
	it('emits the initial value synchronously on subscribe', () => {
		const store = writable(1);
		const seen: number[] = [];
		store.subscribe((v) => seen.push(v));
		expect(seen).toEqual([1]);
	});

	it('notifies subscribers on set', () => {
		const store = writable(1);
		const seen: number[] = [];
		store.subscribe((v) => seen.push(v));
		store.set(2);
		expect(seen).toEqual([1, 2]);
	});

	it('notifies subscribers on update', () => {
		const store = writable(1);
		const seen: number[] = [];
		store.subscribe((v) => seen.push(v));
		store.update((v) => v + 1);
		expect(seen).toEqual([1, 2]);
	});

	it('stops notifying after unsubscribing', () => {
		const store = writable(1);
		const seen: number[] = [];
		const unsub = store.subscribe((v) => seen.push(v));
		unsub();
		store.set(3);
		expect(seen).toEqual([1]);
	});
});

describe('locale types', () => {
	it('supports both supported locales', () => {
		const locales: Locale[] = ['en', 'zh-CN'];
		for (const l of locales) {
			expect(typeof t('view.timer.title', l)).toBe('string');
		}
	});
});
