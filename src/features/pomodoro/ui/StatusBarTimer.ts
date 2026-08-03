import { Menu, setTooltip } from 'obsidian';
import type MiyuPlugin from '../../../main';
import type { Unsubscriber } from '../../../core/store';
import { modeLabel, type PomodoroTimer } from '../timer';
import type { TimerDisplay } from '../types';
import type { TaskTracker } from '../tasks/tracker';
import { pomodoroSettings } from '../settings';

const ICON_RUNNING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;

const ICON_IDLE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer-off"><path d="M10 2h4"/><path d="M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7"/><path d="M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2"/><path d="m2 2 20 20"/><path d="M12 12v-2"/></svg>`;

/**
 * 状态栏计时器：左键开始/暂停，右键菜单（继续/重置/切换/自动开始/音效）。
 * 仅当设置 showStatusBarTimer 时显示。
 */
export class StatusBarTimer {
	private plugin: MiyuPlugin;

	private timer: PomodoroTimer;

	private tracker: TaskTracker;

	private el: HTMLElement;

	private icon: HTMLElement;

	private text: HTMLElement;

	private current!: TimerDisplay;

	/** 上次设置的 tooltip 文本（内容未变化不重建）。 */
	private lastTooltip = '';

	private unsubscribers: Unsubscriber[] = [];

	constructor(
		plugin: MiyuPlugin,
		timer: PomodoroTimer,
		tracker: TaskTracker,
		container: HTMLElement,
	) {
		this.plugin = plugin;
		this.timer = timer;
		this.tracker = tracker;

		this.el = container.createSpan({ cls: 'miyu-timer' });
		this.icon = this.el.createSpan({ cls: 'item-icon' });
		this.icon.setCssProps({ marginRight: '3px' });
		this.text = this.el.createSpan();

		this.el.addEventListener('click', () => {
			this.timer.toggleTimer();
		});
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showMenu(e);
		});

		this.unsubscribers.push(
			this.timer.subscribe((state) => {
				this.current = state;
				this.icon.innerHTML = state.phase === 'RUNNING'
					? ICON_RUNNING
					: ICON_IDLE;
				this.text.setText(state.remainedText);
				this.updateTooltip();
				this.refreshVisibility();
			}),
		);

		// 激活任务变化（激活/清除/同步）→ tooltip 中的任务名更新
		this.unsubscribers.push(
			tracker.subscribe(() => {
				this.updateTooltip();
			}),
		);

		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.refreshVisibility();
				// 语言切换等设置变化：模式文本可能需要刷新
				this.updateTooltip();
			}),
		);
	}

	/**
	 * 更新 tooltip（模式 · 任务名，无任务时只显示模式）。
	 * 内容未变化时不重建——tick 期间 mode/task 不变就不会重复 setTooltip。
	 */
	private updateTooltip() {
		const plugin = this.plugin;
		const state = this.current;
		if (!state) {
			return;
		}
		const mode = modeLabel(state.mode, plugin.settings.language);
		const taskName = this.tracker?.task?.name;
		const text = taskName ? `${mode} · ${taskName}` : mode;
		if (text === this.lastTooltip) {
			return;
		}
		this.lastTooltip = text;
		setTooltip(this.el, text, {
			delay: 300,
			placement: 'top',
		});
	}

	private refreshVisibility() {
		this.el.setCssProps({
			display: this.plugin.settings.pomodoro.showStatusBarTimer
				? ''
				: 'none',
		});
	}

	private showMenu(e: MouseEvent) {
		const plugin = this.plugin;
		const state = this.current;
		const menu = new Menu();
		menu.addItem((item) => {
			const label =
				state.phase === 'RUNNING'
					? plugin.t('statusbar.pause')
					: state.phase === 'PAUSED'
						? plugin.t('statusbar.resume')
						: plugin.t('statusbar.start');
			item.setTitle(label).onClick(() => {
				this.timer.toggleTimer();
			});
		});

		menu.addItem((item) => {
			item.setTitle(plugin.t('statusbar.reset')).onClick(() => {
				this.timer.reset();
			});
		});

		menu.addItem((item) => {
			const isWork = state.mode === 'WORK';
			item.setTitle(
				plugin.t('statusbar.switch-mode', {
					mode: modeLabel(
						isWork ? 'BREAK' : 'WORK',
						plugin.settings.language,
					),
				}),
			).onClick(() => {
				this.timer.toggleMode();
			});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle(plugin.t('statusbar.autostart'));
			item.setChecked(plugin.settings.pomodoro.autoStartNext);
			item.onClick(async () => {
				plugin.settings.pomodoro.autoStartNext =
					!plugin.settings.pomodoro.autoStartNext;
				await plugin.saveSettings();
			});
		});

		menu.addItem((item) => {
			item.setTitle(plugin.t('statusbar.sound'));
			item.setChecked(plugin.settings.pomodoro.notificationSound);
			item.onClick(async () => {
				plugin.settings.pomodoro.notificationSound =
					!plugin.settings.pomodoro.notificationSound;
				await plugin.saveSettings();
			});
		});

		menu.showAtMouseEvent(e);
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.el.remove();
	}
}
