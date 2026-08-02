import { Notice } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t } from '../../i18n';
import type { Mode } from './types';
import { PomodoroTimer, modeLabel } from './timer';
import { TaskParser } from './tasks/parser';
import { TaskTracker } from './tasks/tracker';
import { SessionStore } from './stats';
import { TimerView, VIEW_TYPE_TIMER } from './view';
import { StatusBarTimer } from './ui/StatusBarTimer';
import { pomodoroSettings } from './settings';

/** 番茄钟功能状态，挂在插件实例上。 */
export interface PomodoroManager {
	timer: PomodoroTimer;
	parser: TaskParser;
	tracker: TaskTracker;
	stats: SessionStore;
	statusBar: StatusBarTimer;
	/** 由 TimerPanel 构造时注入：打开统计面板（通知点击等入口）。 */
	openStatsPanel: (() => void) | null;
	destroy(): void;
}

export function registerPomodoroFeature(plugin: MiyuPlugin): string[] {
	const locale = plugin.settings.language;

	if (!plugin.pomodoro) {
		// --- Singleton parts: created once per plugin load ---
		const tracker = new TaskTracker(plugin);
		const stats = new SessionStore(plugin);
		const timer = new PomodoroTimer(plugin, tracker, stats);
		const parser = new TaskParser(plugin, tracker);

		const statusBarEl = plugin.addStatusBarItem();
		statusBarEl.className = `${statusBarEl.className} mod-clickable`;
		const statusBar = new StatusBarTimer(plugin, timer, statusBarEl);

		plugin.pomodoro = {
			timer,
			parser,
			tracker,
			stats,
			statusBar,
			openStatsPanel: null,
			destroy() {
				timer.destroy();
				parser.destroy();
				tracker.destroy();
				statusBar.destroy();
			},
		};

		plugin.registerView(
			VIEW_TYPE_TIMER,
			(leaf) => new TimerView(plugin, leaf),
		);

		plugin.addRibbonIcon(
			'timer',
			t('ribbon.toggle-timer-panel', locale),
			() => {
				toggleTimerPanel(plugin);
			},
		);

		// 设置变化 → 刷新镜像 + 计时器
		plugin.onSettingsChanged = () => {
			pomodoroSettings.set(plugin.settings.pomodoro);
			plugin.pomodoro?.timer.setup();
		};
		pomodoroSettings.set(plugin.settings.pomodoro);
	}

	// --- Commands: re-registered on language change (stable IDs) ---
	plugin.addCommand({
		id: 'toggle-timer',
		name: t('command.toggle-timer', locale),
		callback: () => {
			plugin.pomodoro?.timer.toggleTimer();
		},
	});

	plugin.addCommand({
		id: 'toggle-timer-panel',
		name: t('command.toggle-timer-panel', locale),
		callback: () => {
			toggleTimerPanel(plugin);
		},
	});

	plugin.addCommand({
		id: 'reset-timer',
		name: t('command.reset-timer', locale),
		callback: () => {
			plugin.pomodoro?.timer.reset();
			new Notice(t('notice.timer-reset', locale));
		},
	});

	plugin.addCommand({
		id: 'toggle-mode',
		name: t('command.toggle-mode', locale),
		callback: () => {
			plugin.pomodoro?.timer.toggleMode((mode: Mode) => {
				new Notice(
					t('notice.timer-mode', locale, {
						mode: modeLabel(mode, locale),
					}),
				);
			});
		},
	});

	return [
		'toggle-timer',
		'toggle-timer-panel',
		'reset-timer',
		'toggle-mode',
	];
}

function toggleTimerPanel(plugin: MiyuPlugin) {
	const { workspace } = plugin.app;
	const leaves = workspace.getLeavesOfType(VIEW_TYPE_TIMER);
	if (leaves.length > 0) {
		workspace.detachLeavesOfType(VIEW_TYPE_TIMER);
	} else {
		void activateView(plugin);
	}
}

async function activateView(plugin: MiyuPlugin) {
	const { workspace } = plugin.app;

	const leaves = workspace.getLeavesOfType(VIEW_TYPE_TIMER);
	let leaf = leaves.length > 0 ? leaves[0] : null;

	if (!leaf) {
		leaf = workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}
		await leaf.setViewState({
			type: VIEW_TYPE_TIMER,
			active: true,
		});
	}

	void workspace.revealLeaf(leaf);
}
