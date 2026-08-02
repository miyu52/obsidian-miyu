import { Notice } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t, type Locale } from '../../i18n';
import type { Readable, Subscriber, Unsubscriber } from '../../core/store';
import type { Mode, PomodoroSession, TimerDisplay, TimerState } from './types';
import type { TaskTracker } from './tasks/tracker';
import type { SessionStore } from './stats';
import { playNotificationSound } from './sound';

const TICK_MS = 200;
const TICK_MS_LOW_FPS = 1000;

/** 时长格式化为 "mm : ss"。 */
export function formatRemained(ms: number): string {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	return `${min < 10 ? `0${min}` : min} : ${sec < 10 ? `0${sec}` : sec}`;
}

/** 模式文案（纯函数：locale 由调用方提供）。 */
export function modeLabel(mode: Mode, locale: Locale): string {
	return mode === 'WORK' ? t('mode.work', locale) : t('mode.break', locale);
}

function makeSessionId(): string {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 计时核心：显式状态机（IDLE / RUNNING / PAUSED）+ 墙钟时间计算。
 * 完成一个 WORK 会话 → 记录日志（SessionStore）+ 通知（Notice/系统通知/音效）。
 * 中断（reset / 手动切段）的会话不记录。
 */
export class PomodoroTimer implements Readable<TimerDisplay> {
	private plugin: MiyuPlugin;

	private tracker: TaskTracker;

	private stats: SessionStore;

	private state: TimerState;

	private subscribers = new Set<Subscriber<TimerDisplay>>();

	private interval: number | null = null;

	constructor(plugin: MiyuPlugin, tracker: TaskTracker, stats: SessionStore) {
		this.plugin = plugin;
		this.tracker = tracker;
		this.stats = stats;
		this.state = {
			phase: 'IDLE',
			mode: 'WORK',
			session: null,
			accumulatedMs: 0,
			runningSince: null,
		};
	}

	/** 当前模式的计划分钟数（实时读设置——设置即唯一真源）。 */
	private plannedMinutesFor(mode: Mode): number {
		const p = this.plugin.settings.pomodoro;
		return mode === 'WORK' ? p.workMinutes : p.breakMinutes;
	}

	subscribe = (run: Subscriber<TimerDisplay>): Unsubscriber => {
		this.subscribers.add(run);
		run(this.display());
		return () => {
			this.subscribers.delete(run);
		};
	};

	/** 当前视图快照（墙钟时间计算）。 */
	private display(): TimerDisplay {
		const s = this.state;
		const totalMs =
			(s.session?.plannedMinutes ?? this.plannedMinutesFor(s.mode)) *
			60000;
		const elapsedMs =
			s.runningSince !== null
				? s.accumulatedMs + (Date.now() - s.runningSince)
				: s.accumulatedMs;
		const remainedMs = Math.max(0, totalMs - elapsedMs);
		return {
			...s,
			elapsedMs,
			remainedMs,
			remainedText: formatRemained(remainedMs),
			progress: totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0,
		};
	}

	private emit() {
		const view = this.display();
		for (const run of this.subscribers) {
			run(view);
		}
	}

	/** 原地更新状态并广播。UI 订阅者抛错不影响计时器。 */
	private update(fn: (s: TimerState) => TimerState): void {
		let next = this.state;
		try {
			next = fn(this.state);
		} catch (e) {
			console.error('[miyu] timer state update failed:', e);
		}
		this.state = next;
		try {
			this.emit();
		} catch (e) {
			console.error('[miyu] timer UI update failed:', e);
		}
	}

	private startClock() {
		if (this.interval !== null) return;
		const tickMs = this.plugin.settings.pomodoro.lowFps
			? TICK_MS_LOW_FPS
			: TICK_MS;
		this.interval = window.setInterval(() => this.tick(), tickMs);
	}

	private stopClock() {
		if (this.interval !== null) {
			window.clearInterval(this.interval);
			this.interval = null;
		}
	}

	private tick() {
		let timeup = false;
		this.update((s) => {
			if (s.phase === 'RUNNING' && s.runningSince !== null) {
				const totalMs = (s.session?.plannedMinutes ?? 0) * 60000;
				const elapsed =
					s.accumulatedMs + (Date.now() - s.runningSince);
				timeup = totalMs > 0 && elapsed >= totalMs;
			}
			return s;
		});
		if (timeup) {
			this.timeup();
		}
	}

	private timeup() {
		const session = this.state.session;
		if (!session) {
			return;
		}
		const autoStartNext = this.plugin.settings.pomodoro.autoStartNext;
		try {
			// 会话完成：记录日志（仅 WORK）+ 任务番茄数写回 + 通知（无条件执行）
			session.actualMs = session.plannedMinutes * 60000;
			if (session.mode === 'WORK') {
				this.stats.record(session, this.tracker.task?.name ?? '');
				void this.tracker.updateActual().catch((e) => {
					console.error('[miyu] task actual update failed:', e);
				});
			}
			this.notify(session);
		} catch (e) {
			console.error('[miyu] session end handling failed:', e);
		}
		this.update((s) => {
			s.phase = 'IDLE';
			s.session = null;
			s.accumulatedMs = 0;
			s.runningSince = null;
			s.mode =
				this.plugin.settings.pomodoro.breakMinutes === 0
					? 'WORK'
					: s.mode === 'WORK'
						? 'BREAK'
						: 'WORK';
			return s;
		});
		this.stopClock();
		if (autoStartNext) {
			this.start();
		}
	}

	/** 开始新会话或恢复暂停的会话。 */
	start() {
		const now = Date.now();
		this.update((s) => {
			if (s.phase === 'IDLE') {
				s.session = {
					id: makeSessionId(),
					mode: s.mode,
					startedAt: now,
					plannedMinutes: this.plannedMinutesFor(s.mode),
					actualMs: 0,
				};
				s.accumulatedMs = 0;
			}
			s.phase = 'RUNNING';
			s.runningSince = now;
			return s;
		});
		this.startClock();
	}

	pause() {
		this.update((s) => {
			if (s.runningSince !== null) {
				const totalMs = (s.session?.plannedMinutes ?? 0) * 60000;
				s.accumulatedMs = Math.min(
					totalMs,
					s.accumulatedMs + (Date.now() - s.runningSince),
				);
				s.runningSince = null;
			}
			s.phase = 'PAUSED';
			return s;
		});
		this.stopClock();
	}

	/** 重置当前会话（中断，不记录日志；保留选中的任务）。 */
	reset() {
		this.update((s) => {
			s.phase = 'IDLE';
			s.session = null;
			s.accumulatedMs = 0;
			s.runningSince = null;
			return s;
		});
		this.stopClock();
	}

	/** 手动切换工作/休息（中断当前段，不记录日志）。 */
	toggleMode(callback?: (mode: Mode) => void) {
		this.update((s) => {
			s.phase = 'IDLE';
			s.session = null;
			s.accumulatedMs = 0;
			s.runningSince = null;
			s.mode =
				this.plugin.settings.pomodoro.breakMinutes === 0
					? 'WORK'
					: s.mode === 'WORK'
						? 'BREAK'
						: 'WORK';
			return s;
		});
		this.stopClock();
		callback?.(this.state.mode);
	}

	toggleTimer() {
		this.display().phase === 'RUNNING' ? this.pause() : this.start();
	}

	/** 设置变化后重发一次快照（IDLE 时让 UI 反映新的计划时长）。 */
	refresh() {
		this.emit();
	}

	/** 设置页"播放"按钮：试听当前通知音效。 */
	toggleAudioPreview() {
		try {
			playNotificationSound(
				this.plugin.app,
				this.plugin.settings.pomodoro.soundFile,
			);
		} catch (e) {
			console.error('[miyu] pomodoro sound preview failed:', e);
		}
	}

	private notify(session: PomodoroSession) {
		const text =
			session.mode === 'WORK'
				? this.plugin.t('notice.pomodoro.work', {
						duration: String(session.plannedMinutes),
					})
				: this.plugin.t('notice.pomodoro.break', {
						duration: String(session.plannedMinutes),
					});

		try {
			const p = this.plugin.settings.pomodoro;
			if (p.systemNotification) {
				// HTML5 通知（桌面 Electron / 移动端通用），构造即显示。
				// 权限被拒或不可用时回退到应用内 Notice。
				try {
					const sysNotification = new window.Notification(
						this.plugin.t('notice.pomodoro.title'),
						{ body: text, silent: true },
					);
					sysNotification.onclick = () => {
						sysNotification.close();
						this.openStatsPanel();
					};
				} catch {
					new Notice(text);
				}
			} else {
				const fragment = new DocumentFragment();
				const span = fragment.createSpan();
				span.setText(text);
				fragment.addEventListener('click', () => {
					this.openStatsPanel();
				});
				new Notice(fragment);
			}
		} catch (e) {
			console.error('[miyu] pomodoro notification failed:', e);
			new Notice(text);
		}

		if (this.plugin.settings.pomodoro.notificationSound) {
			try {
				playNotificationSound(
					this.plugin.app,
					this.plugin.settings.pomodoro.soundFile,
				);
			} catch (e) {
				console.error('[miyu] pomodoro sound failed:', e);
			}
		}
	}

	/** 通知点击 → 打开统计面板（由 TimerPanel 注入的入口）。 */
	private openStatsPanel() {
		this.plugin.pomodoro?.openStatsPanel?.();
	}

	destroy() {
		this.stopClock();
	}
}

/** 进度环偏移：440 = 圆环周长。 */
export function circleOffset(
	display: TimerDisplay,
	circumference = 440,
): number {
	const totalMs = display.remainedMs + display.elapsedMs;
	return totalMs > 0
		? (display.remainedMs / totalMs) * circumference
		: circumference;
}
