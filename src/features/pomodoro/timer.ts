import type MiyuPlugin from '../../main';
import type { TimerState, TimerDisplay } from '../../types';
import { createClockWorker } from './clock-worker';
import { t } from '../../i18n';
import { Notice } from 'obsidian';
import { createPomodoroLogger } from './logger';

/**
 * Core pomodoro timer state machine.
 *
 * Lifecycle:
 *   start() → running=true (WORK or BREAK)
 *     ├─ pause() → running=false, keeps session
 *     ├─ timeup → notify → switch mode → maybe autoStart
 *     └─ reset() → clear, end session
 *
 * Elapsed time is always computed from absolute timestamp (Date.now() - startTime),
 * not accumulated from worker ticks, so time never drifts.
 */
export class PomodoroTimer {
	private plugin: MiyuPlugin;
	private state: TimerState;
	private worker: Worker;
	private onTickCallbacks: Array<(display: TimerDisplay) => void> = [];
	private logger: ReturnType<typeof createPomodoroLogger>;

	constructor(plugin: MiyuPlugin) {
		this.plugin = plugin;
		this.logger = createPomodoroLogger(plugin);
		const s = plugin.settings;

		this.state = {
			running: false,
			mode: 'WORK',
			elapsed: 0,
			duration: s.pomodoro.workMinutes * 60 * 1000,
			autoStart: s.pomodoro.autoStart,
			startTime: null,
		};

		this.worker = createClockWorker();
		this.worker.onmessage = () => {
			this.tick();
		};
	}

	/** Subscribe to display updates. Returns unsubscribe function. */
	onTick(cb: (display: TimerDisplay) => void): () => void {
		this.onTickCallbacks.push(cb);
		return () => {
			this.onTickCallbacks = this.onTickCallbacks.filter(
				(c) => c !== cb,
			);
		};
	}

	/** Get current display state without subscribing. */
	getDisplay(): TimerDisplay {
		return this.toDisplay(this.state);
	}

	/** Sync duration and autoStart from current plugin settings. */
	syncSettings(): void {
		const s = this.plugin.settings;
		this.state.autoStart = s.pomodoro.autoStart;
		if (!this.state.running && !this.state.startTime) {
			// Only update duration when idle (not in a running/paused session)
			this.state.duration =
				(this.state.mode === 'WORK'
					? s.pomodoro.workMinutes
					: s.pomodoro.breakMinutes) * 60 * 1000;
		}
		this.notify();
	}

	start(): void {
		const s = this.plugin.settings;
		const now = Date.now();

		if (this.state.startTime === null) {
			// Fresh session
			this.state.elapsed = 0;
			this.state.duration =
				(this.state.mode === 'WORK'
					? s.pomodoro.workMinutes
					: s.pomodoro.breakMinutes) * 60 * 1000;
			this.state.startTime = now;
		} else {
			// Resume from pause: adjust startTime so elapsed stays correct
			this.state.startTime = now - this.state.elapsed;
		}

		this.state.running = true;
		this.worker.postMessage({
			start: true,
			lowFps: s.pomodoro.lowFrameRate,
		});
		this.notify();
	}

	pause(): void {
		this.state.running = false;
		this.worker.postMessage({ start: false });
		this.notify();
	}

	reset(): void {
		const s = this.plugin.settings;
		// Log if there was any elapsed time
		if (this.state.elapsed > 0 && this.state.mode === 'WORK') {
			this.logCurrent();
		}

		this.state.running = false;
		this.state.elapsed = 0;
		this.state.duration = s.pomodoro.workMinutes * 60 * 1000;
		this.state.mode = 'WORK';
		this.state.startTime = null;
		this.worker.postMessage({ start: false });
		this.notify();
	}

	toggleTimer(): void {
		if (this.state.running) {
			this.pause();
		} else {
			this.start();
		}
	}

	toggleMode(): void {
		this.endSession();
	}

	/** Force end current session (used for manual mode switch). */
	private endSession(): void {
		if (this.state.elapsed > 0 && this.state.mode === 'WORK') {
			this.logCurrent();
		}

		const s = this.plugin.settings;
		if (s.pomodoro.breakMinutes === 0) {
			this.state.mode = 'WORK';
		} else {
			this.state.mode =
				this.state.mode === 'WORK' ? 'BREAK' : 'WORK';
		}

		this.state.duration =
			(this.state.mode === 'WORK'
				? s.pomodoro.workMinutes
				: s.pomodoro.breakMinutes) * 60 * 1000;
		this.state.elapsed = 0;
		this.state.startTime = null;
		this.state.running = false;
		this.worker.postMessage({ start: false });
		this.notify();
	}

	destroy(): void {
		this.worker.terminate();
		this.onTickCallbacks = [];
	}

	private tick(): void {
		if (!this.state.running || this.state.startTime === null) return;

		const now = Date.now();
		this.state.elapsed = now - this.state.startTime;

		if (this.state.elapsed >= this.state.duration) {
			this.state.elapsed = this.state.duration;
			this.notify();
			this.timeup();
		} else {
			this.notify();
		}
	}

	private timeup(): void {
		this.state.running = false;
		this.worker.postMessage({ start: false });

		const wasWork = this.state.mode === 'WORK';

		this.notifyCompletion();
		this.logCurrent();

		// Increment active task counter for WORK sessions
		if (wasWork && this.plugin.settings.pomodoro.activeTask) {
			void this.plugin.tracker?.incrementActual();
		}

		const s = this.plugin.settings;

		// Switch mode
		if (s.pomodoro.breakMinutes === 0) {
			this.state.mode = 'WORK';
		} else {
			this.state.mode = wasWork ? 'BREAK' : 'WORK';
		}

		this.state.duration =
			(this.state.mode === 'WORK'
				? s.pomodoro.workMinutes
				: s.pomodoro.breakMinutes) * 60 * 1000;
		this.state.elapsed = 0;
		this.state.startTime = null;

		this.notify();

		if (this.state.autoStart) {
			this.start();
		}
	}

	private notifyCompletion(): void {
		const locale = this.plugin.settings.language;
		const minutes = Math.floor(this.state.duration / 60000);
		const wasWork = this.state.mode === 'WORK';
		const key = wasWork
			? 'pomodoro.work-complete'
			: 'pomodoro.break-complete';

		new Notice(
			t(key, locale, { minutes: minutes.toString() }),
		);

		if (this.plugin.settings.pomodoro.notificationSound) {
			this.playSound();
		}
	}

	private playSound(): void {
		try {
			const ctx = new AudioContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = 800;
			gain.gain.value = 0.1;
			osc.start();
			gain.gain.exponentialRampToValueAtTime(
				0.001,
				ctx.currentTime + 0.3,
			);
			osc.stop(ctx.currentTime + 0.3);
		} catch {
			// Audio not available, silently ignore
		}
	}

	private logCurrent(): void {
		const minutes = Math.floor(this.state.elapsed / 60000);
		if (minutes <= 0) return;
		const taskDesc = this.plugin.settings.pomodoro.activeTask?.description ?? '';
		this.logger.log(taskDesc, minutes);
	}

	private toDisplay(s: TimerState): TimerDisplay {
		const remainedMs = Math.max(0, s.duration - s.elapsed);
		const min = Math.floor(remainedMs / 60000);
		const sec = Math.floor((remainedMs % 60000) / 1000);
		return {
			mode: s.mode,
			remainedMs,
			remainedHuman: `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`,
			progress: Math.min(1, s.duration > 0 ? s.elapsed / s.duration : 0),
			running: s.running,
			sessionStarted: s.startTime !== null,
		};
	}

	private notify(): void {
		const display = this.toDisplay(this.state);
		for (const cb of this.onTickCallbacks) {
			cb(display);
		}
	}
}
