import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRemained, PomodoroTimer } from '../src/features/pomodoro/timer';
import type { TimerDisplay } from '../src/features/pomodoro/types';
import type { TaskTracker } from '../src/features/pomodoro/tasks/tracker';
import type { SessionStore } from '../src/features/pomodoro/stats';
import type MiyuPlugin from '../src/main';

function makePlugin(overrides: Partial<MiyuPlugin['settings']['pomodoro']> = {}) {
	const settings = {
		language: 'en' as const,
		pomodoro: {
			workMinutes: 25,
			breakMinutes: 5,
			autoStartNext: false,
			...overrides,
		},
	};
	return { settings } as unknown as MiyuPlugin;
}

function makeTimer(overrides?: Partial<MiyuPlugin['settings']['pomodoro']>) {
	const plugin = makePlugin(overrides);
	const tracker = {} as TaskTracker;
	const stats = {} as SessionStore;
	const timer = new PomodoroTimer(plugin, tracker, stats);
	let current: TimerDisplay | null = null;
	timer.subscribe((s) => {
		current = s;
	});
	return { plugin, timer, current: () => current! };
}

describe('formatRemained', () => {
	it('formats minutes and seconds with zero padding', () => {
		expect(formatRemained(0)).toBe('00 : 00');
		expect(formatRemained(25 * 60000)).toBe('25 : 00');
		expect(formatRemained(1499000)).toBe('24 : 59');
		expect(formatRemained(-5)).toBe('00 : 00');
	});
});

describe('PomodoroTimer state machine', () => {
	beforeEach(() => {
		vi.stubGlobal('window', {
			setInterval: vi.fn(),
			clearInterval: vi.fn(),
		});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('starts IDLE in WORK mode with the settings duration', () => {
		const { current } = makeTimer();
		expect(current().phase).toBe('IDLE');
		expect(current().mode).toBe('WORK');
		expect(current().remainedText).toBe('25 : 00');
		expect(current().progress).toBe(0);
	});

	it('start() creates a session snapshot and runs', () => {
		const { timer, current } = makeTimer({ workMinutes: 50 });
		timer.start();
		expect(current().phase).toBe('RUNNING');
		expect(current().session?.plannedMinutes).toBe(50);
		expect(current().session?.mode).toBe('WORK');
		expect(current().runningSince).not.toBeNull();
	});

	it('pause() freezes accumulated time; reset() clears everything', () => {
		vi.useFakeTimers();
		try {
			const { timer, current } = makeTimer();
			timer.start();
			vi.advanceTimersByTime(5000);
			timer.pause();
			expect(current().phase).toBe('PAUSED');
			expect(current().runningSince).toBeNull();
			expect(current().accumulatedMs).toBeGreaterThanOrEqual(5000);
			timer.reset();
			expect(current().phase).toBe('IDLE');
			expect(current().session).toBeNull();
			expect(current().accumulatedMs).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it('toggleMode() switches WORK → BREAK and back', () => {
		const { timer, current } = makeTimer();
		timer.toggleMode();
		expect(current().mode).toBe('BREAK');
		timer.toggleMode();
		expect(current().mode).toBe('WORK');
	});

	it('toggleMode() stays WORK when break minutes are 0', () => {
		const { timer, current } = makeTimer({ breakMinutes: 0 });
		timer.toggleMode();
		expect(current().mode).toBe('WORK');
	});

	it('IDLE display reflects settings changes after refresh()', () => {
		const { plugin, timer, current } = makeTimer();
		expect(current().remainedText).toBe('25 : 00');
		plugin.settings.pomodoro.workMinutes = 50;
		timer.refresh();
		expect(current().remainedText).toBe('50 : 00');
	});
});
