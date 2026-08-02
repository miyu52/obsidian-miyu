import { Notice, TFile, type PluginSettingTab } from 'obsidian';
import type MiyuPlugin from '../../main';
import type { MiyuFeature } from '../types';
import type { Mode } from './types';
import { PomodoroTimer, modeLabel } from './timer';
import { TaskParser } from './tasks/parser';
import { TaskTracker } from './tasks/tracker';
import { SessionStore } from './stats';
import { TimerView, VIEW_TYPE_TIMER } from './view';
import { StatusBarTimer } from './ui/StatusBarTimer';
import { pomodoroSettings } from './settings';
import { renderPomodoroSettings } from './settings-ui';

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

/** 番茄钟功能：单例部分只初始化一次，命令在语言切换时重新注册。 */
export const pomodoroFeature: MiyuFeature = {
	id: 'pomodoro',

	init(plugin: MiyuPlugin): void {
		const tracker = new TaskTracker(plugin);
		const stats = new SessionStore({
			settings: plugin.settings,
			saveSettings: () => plugin.saveSettings(),
			readFile: async (path) => {
				const file = plugin.app.vault.getAbstractFileByPath(path);
				return file instanceof TFile ? plugin.app.vault.read(file) : null;
			},
			writeFile: async (path, content) => {
				const file = plugin.app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) {
					await plugin.app.vault.modify(file, content);
				} else {
					await plugin.app.vault.create(path, content);
				}
			},
			t: (key, vars) => plugin.t(key, vars),
			onRecordsChanged: () => {
				// 文件路径下没有 saveSettings 链路，直接重发镜像刷新面板
				pomodoroSettings.set(plugin.settings.pomodoro);
			},
		});
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
				void stats.flush();
			},
		};

		plugin.registerView(
			VIEW_TYPE_TIMER,
			(leaf) => new TimerView(plugin, leaf),
		);

		plugin.addRibbonIcon(
			'timer',
			plugin.t('ribbon.toggle-timer-panel'),
			() => {
				toggleTimerPanel(plugin);
			},
		);

		// 设置变化 → 刷新镜像 + 重发计时器快照
		plugin.onSettingsChanged(() => {
			pomodoroSettings.set(plugin.settings.pomodoro);
			plugin.pomodoro?.timer.refresh();
		});
		pomodoroSettings.set(plugin.settings.pomodoro);

		// 从配置的存储加载记录（异步；完成后刷新面板）。
		// 启动早期 vault 可能尚未可查（getAbstractFileByPath 返回 null 被误判为
		// 文件不存在），布局就绪后再加载一次覆盖——与 TaskParser 的启动兜底同理。
		const loadRecords = () => {
			void stats.load().then(() => {
				pomodoroSettings.set(plugin.settings.pomodoro);
			});
		};
		loadRecords();
		plugin.app.workspace.onLayoutReady(loadRecords);
	},

	registerCommands(plugin: MiyuPlugin): string[] {
		plugin.addCommand({
			id: 'toggle-timer',
			name: plugin.t('command.toggle-timer'),
			callback: () => {
				plugin.pomodoro?.timer.toggleTimer();
			},
		});

		plugin.addCommand({
			id: 'toggle-timer-panel',
			name: plugin.t('command.toggle-timer-panel'),
			callback: () => {
				toggleTimerPanel(plugin);
			},
		});

		plugin.addCommand({
			id: 'reset-timer',
			name: plugin.t('command.reset-timer'),
			callback: () => {
				plugin.pomodoro?.timer.reset();
				new Notice(plugin.t('notice.timer-reset'));
			},
		});

		plugin.addCommand({
			id: 'toggle-mode',
			name: plugin.t('command.toggle-mode'),
			callback: () => {
				plugin.pomodoro?.timer.toggleMode((mode: Mode) => {
					new Notice(
						plugin.t('notice.timer-mode', {
							mode: modeLabel(mode, plugin.settings.language),
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
	},

	renderSettings(
		plugin: MiyuPlugin,
		containerEl: HTMLElement,
		tab: PluginSettingTab,
	): void {
		renderPomodoroSettings(plugin, containerEl, tab);
	},

	destroy(plugin: MiyuPlugin): void {
		plugin.pomodoro?.destroy();
		plugin.pomodoro = undefined;
	},
};

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
