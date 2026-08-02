import { Notice, TFile } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t, type Locale } from '../../i18n';
import {
	derived,
	writable,
	type Readable,
	type Subscriber,
	type Unsubscriber,
	type Writable,
} from '../../core/store';
import Logger, { type LogContext } from './Logger';
import type { TaskItem } from './Tasks';
import DEFAULT_NOTIFICATION from './notification';

export type Mode = 'WORK' | 'BREAK';

export type TimerRemained = {
	millis: number;
	human: string;
};

const DEFAULT_TASK: TaskItem = {
	actual: 0,
	expected: 0,
	path: '',
	fileName: '',
	text: '',
	name: '',
	status: '',
	blockLink: '',
	checked: false,
	done: '',
	due: '',
	created: '',
	cancelled: '',
	scheduled: '',
	start: '',
	description: '',
	priority: '',
	recurrence: '',
	tags: [],
	line: -1,
};

export type TimerState = {
	autostart: boolean;
	running: boolean;
	mode: Mode;
	/** Elapsed before the current running stretch (epoch millis). */
	accumulated: number;
	/** Total elapsed display value (accumulated + current stretch). */
	elapsed: number;
	/** Start of the current running stretch (epoch millis), null when paused. */
	startTime: number | null;
	inSession: boolean;
	workLen: number;
	breakLen: number;
	count: number;
	duration: number;
	/** Start of the current session (epoch millis), used for logging. */
	sessionStart: number | null;
};

export type TimerStore = TimerState & {
	remained: TimerRemained;
	finished: boolean;
};

/**
 * Pomodoro timer with a reactive store.
 *
 * Timing is based on wall-clock timestamps (not tick counts), so the UI can
 * use a simple `setInterval` without drifting even if the tab is throttled.
 */
export default class Timer implements Readable<TimerStore> {
	private plugin: MiyuPlugin;

	private logger: Logger;

	private state: TimerState;

	private store: Writable<TimerState>;

	private update: (fn: (value: TimerState) => TimerState) => void;

	private timerStore: Readable<TimerStore>;

	private interval: number | null = null;

	private unsubscribers: Unsubscriber[] = [];

	public subscribe: (run: Subscriber<TimerStore>) => Unsubscriber;

	constructor(plugin: MiyuPlugin) {
		this.plugin = plugin;
		this.logger = new Logger(plugin);
		const settings = plugin.settings;
		this.state = {
			autostart: settings.autostart,
			workLen: settings.workLen,
			breakLen: settings.breakLen,
			running: false,
			mode: 'WORK',
			accumulated: 0,
			elapsed: 0,
			startTime: null,
			inSession: false,
			duration: settings.workLen,
			count: settings.workLen * 60 * 1000,
			sessionStart: null,
		};

		this.store = writable(this.state);
		this.update = (fn) => this.store.update(fn);

		this.timerStore = derived(this.store, ($state) => ({
			...$state,
			remained: this.remain($state.count, this.currentElapsed($state)),
			finished:
				$state.count > 0 &&
				this.currentElapsed($state) >= $state.count,
		}));

		this.subscribe = (run) => this.timerStore.subscribe(run);
		this.unsubscribers.push(
			this.timerStore.subscribe((state) => {
				this.state = state;
			}),
		);
	}

	/** Current total elapsed, including the ongoing running stretch. */
	private currentElapsed(s: TimerState): number {
		if (s.running && s.startTime !== null) {
			return s.accumulated + (Date.now() - s.startTime);
		}
		return s.accumulated;
	}

	private remain(count: number, elapsed: number): TimerRemained {
		let remained = Math.max(0, count - elapsed);
		let min = Math.floor(remained / 60000);
		let sec = Math.floor((remained % 60000) / 1000);
		let minStr = min < 10 ? `0${min}` : min.toString();
		let secStr = sec < 10 ? `0${sec}` : sec.toString();
		return {
			millis: remained,
			human: `${minStr} : ${secStr}`,
		};
	}

	private startClock() {
		if (this.interval !== null) return;
		const tickMs = this.plugin.settings.lowFps ? 1000 : 200;
		this.interval = window.setInterval(() => this.tick(), tickMs);
	}

	private stopClock() {
		if (this.interval !== null) {
			window.clearInterval(this.interval);
			this.interval = null;
		}
	}

	private tick() {
		let timeup: boolean = false;
		try {
			this.update((s) => {
				if (s.running) {
					s.elapsed = Math.min(
						s.count,
						this.currentElapsed(s),
					);
					timeup = s.elapsed >= s.count;
				}
				return s;
			});
		} catch (e) {
			// A UI subscriber throwing must never stall the timer.
			console.error('[miyu] pomodoro tick failed:', e);
		}
		if (timeup) {
			this.timeup();
		}
	}

	private timeup() {
		let autostart = false;
		try {
			this.update((state) => {
				const ctx = this.createLogContext(state);
				void this.processLog(ctx);
				autostart = state.autostart;
				return this.endSession(state);
			});
		} catch (e) {
			// endSession may have already run; autostart handled below.
			console.error('[miyu] pomodoro session end failed:', e);
		}
		if (autostart) {
			this.start();
		}
	}

	private createLogContext(s: TimerState): LogContext {
		let state = { ...s };
		let task = this.plugin.pomodoro?.tracker.task
			? { ...this.plugin.pomodoro.tracker.task }
			: { ...DEFAULT_TASK };

		if (!task.path) {
			task.path = this.plugin.pomodoro?.tracker.file?.path ?? '';
			task.fileName = this.plugin.pomodoro?.tracker.file?.name ?? '';
		}

		return { ...state, task };
	}

	private async processLog(ctx: LogContext) {
		// Never let task tracking / logging errors swallow the session-end
		// notification — the user must always get the Notice and sound.
		let logFile: TFile | void;
		try {
			if (ctx.mode == 'WORK') {
				await this.plugin.pomodoro?.tracker.updateActual();
			}
			logFile = await this.logger.log(ctx);
		} catch (e) {
			console.error('[miyu] pomodoro session logging failed:', e);
			logFile = undefined;
		}
		this.notify(ctx, logFile);
	}

	public start() {
		this.update((s) => {
			const now = Date.now();
			if (!s.inSession) {
				// new session
				s.accumulated = 0;
				s.elapsed = 0;
				s.duration = s.mode === 'WORK' ? s.workLen : s.breakLen;
				s.count = s.duration * 60 * 1000;
				s.sessionStart = now;
			}
			s.inSession = true;
			s.startTime = now;
			s.running = true;
			return s;
		});
		this.startClock();
	}

	private endSession(state: TimerState) {
		// setup new session
		if (state.breakLen == 0) {
			state.mode = 'WORK';
		} else {
			state.mode = state.mode == 'WORK' ? 'BREAK' : 'WORK';
		}
		state.duration = state.mode == 'WORK' ? state.workLen : state.breakLen;
		state.count = state.duration * 60 * 1000;
		state.inSession = false;
		state.running = false;
		state.startTime = null;
		state.sessionStart = null;
		state.accumulated = 0;
		state.elapsed = 0;
		this.stopClock();
		return state;
	}

	private notify(state: TimerState, logFile: TFile | void) {
		const locale = this.plugin.settings.language;
		const text =
			state.mode === 'WORK'
				? t('notice.pomodoro.work', locale, {
						duration: String(state.duration),
					})
				: t('notice.pomodoro.break', locale, {
						duration: String(state.duration),
					});

		const openLog = () => {
			if (logFile) {
				void this.plugin.app.workspace
					.getLeaf('split')
					.openFile(logFile);
			}
		};

		try {
			if (this.plugin.settings.useSystemNotification) {
				// HTML5 notification (works on desktop Electron & mobile).
				// Shows automatically on construction. May be unavailable or
				// permission-denied — fall back to the in-app Notice.
				try {
					const sysNotification = new window.Notification(
						t('notice.pomodoro.title', locale),
						{ body: text, silent: true },
					);
					sysNotification.onclick = () => {
						openLog();
						sysNotification.close();
					};
				} catch {
					new Notice(text);
				}
			} else {
				let fragment = new DocumentFragment();
				let span = fragment.createSpan();
				span.setText(text);
				fragment.addEventListener('click', openLog);
				new Notice(fragment);
			}
		} catch (e) {
			// Last resort — never fail silently.
			console.error('[miyu] pomodoro notification failed:', e);
			new Notice(text);
		}

		if (this.plugin.settings.notificationSound) {
			try {
				this.playAudio();
			} catch (e) {
				console.error('[miyu] pomodoro sound failed:', e);
			}
		}
	}

	public pause() {
		this.update((state) => {
			if (state.startTime !== null) {
				state.accumulated = Math.min(
					state.count,
					state.accumulated + (Date.now() - state.startTime),
				);
				state.startTime = null;
			}
			state.elapsed = state.accumulated;
			state.running = false;
			return state;
		});
		this.stopClock();
	}

	public reset() {
		this.update((state) => {
			// sync elapsed before logging
			if (state.startTime !== null) {
				state.accumulated = Math.min(
					state.count,
					state.accumulated + (Date.now() - state.startTime),
				);
				state.startTime = null;
				state.elapsed = state.accumulated;
			}
			if (state.elapsed > 0) {
				void this.logger.log(this.createLogContext(state));
			}

			state.duration =
				state.mode == 'WORK' ? state.workLen : state.breakLen;
			state.count = state.duration * 60 * 1000;
			state.inSession = false;
			state.running = false;
			state.sessionStart = null;
			state.accumulated = 0;
			state.elapsed = 0;
			return state;
		});
		this.stopClock();
		if (!this.plugin.pomodoro!.tracker.pinned) {
			this.plugin.pomodoro!.tracker.clear();
		}
	}

	public toggleMode(callback?: (state: TimerState) => void) {
		this.update((s) => {
			let updated = this.endSession(s);
			if (callback) {
				callback(updated);
			}
			return updated;
		});
	}

	public toggleTimer() {
		this.state.running ? this.pause() : this.start();
	}

	public playAudio() {
		// Create a fresh element per play — an Audio element stuck in an
		// error state never recovers, and the default data-URI decode is
		// cheap enough for session-end sounds.
		let audio: HTMLAudioElement;
		const customSound = this.plugin.settings.customSound;
		if (customSound) {
			const soundFile =
				this.plugin.app.vault.getAbstractFileByPath(customSound);
			if (soundFile && soundFile instanceof TFile) {
				audio = new Audio(
					this.plugin.app.vault.getResourcePath(soundFile),
				);
			} else {
				audio = new Audio(DEFAULT_NOTIFICATION);
			}
		} else {
			audio = new Audio(DEFAULT_NOTIFICATION);
		}
		audio.currentTime = 0;
		void audio.play().catch((e) => {
			console.error('[miyu] notification sound playback failed:', e);
		});
	}

	public setupTimer() {
		this.update((state) => {
			const { workLen, breakLen, autostart } = this.plugin.settings;
			state.workLen = workLen;
			state.breakLen = breakLen;
			state.autostart = autostart;
			if (!state.running && !state.inSession) {
				state.duration =
					state.mode == 'WORK' ? state.workLen : state.breakLen;
				state.count = state.duration * 60 * 1000;
			}

			return state;
		});
	}

	public destroy() {
		this.pause();
		this.stopClock();
		for (let unsub of this.unsubscribers) {
			unsub();
		}
	}
}

/** Translate a mode label for the current locale. */
export function modeLabel(mode: Mode, locale: Locale): string {
	return mode === 'WORK' ? t('mode.work', locale) : t('mode.break', locale);
}
