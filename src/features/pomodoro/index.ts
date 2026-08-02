import { Notice, TFile } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t } from '../../i18n';
import { DEFAULT_SETTINGS, type MiyuSettings } from '../../settings';
import Timer from './Timer';
import Tasks from './Tasks';
import TaskTracker from './TaskTracker';
import { TimerView, VIEW_TYPE_TIMER } from './TimerView';
import { StatusBarTimer } from './StatusBarTimer';
import { pomodoroSettings } from './settings-store';

/** Pomodoro feature state, attached to the plugin instance. */
export interface PomodoroManager {
	timer: Timer;
	tasks: Tasks;
	tracker: TaskTracker;
	statusBar: StatusBarTimer;
	destroy(): void;
}

/** Settings keys owned by this feature (used for legacy data migration). */
const POMODORO_SETTING_KEYS = [
	'workLen',
	'breakLen',
	'autostart',
	'useStatusBarTimer',
	'lowFps',
	'useSystemNotification',
	'notificationSound',
	'customSound',
	'enableTaskTracking',
	'showTaskProgress',
	'taskFormat',
	'logFile',
	'logFocused',
	'logPath',
	'logLevel',
	'logTemplate',
	'logFormat',
] as const;

/** Old plugin IDs whose data files we can migrate from, in priority order. */
const LEGACY_PLUGIN_IDS = ['obsidian-pomodoro-timer'];

export function registerPomodoroFeature(plugin: MiyuPlugin): string[] {
	const locale = plugin.settings.language;

	if (!plugin.pomodoro) {
		// --- Singleton parts: created once per plugin load ---
		const timer = new Timer(plugin);
		const tracker = new TaskTracker(plugin);
		const tasks = new Tasks(plugin, tracker);

		const statusBarEl = plugin.addStatusBarItem();
		statusBarEl.className = `${statusBarEl.className} mod-clickable`;
		const statusBar = new StatusBarTimer(plugin, timer, statusBarEl);

		plugin.pomodoro = {
			timer,
			tasks,
			tracker,
			statusBar,
			destroy() {
				timer.destroy();
				tasks.destroy();
				tracker.destory();
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

		// Keep the reactive settings mirror in sync on every settings save.
		plugin.onSettingsChanged = () => {
			pomodoroSettings.set(plugin.settings);
			plugin.pomodoro?.timer.setupTimer();
		};
		pomodoroSettings.set(plugin.settings);

		void migrateLegacySettings(plugin);
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
			plugin.pomodoro?.timer.toggleMode((st) => {
				const mode = st.mode === 'WORK' ? 'work' : 'break';
				new Notice(
					t('notice.timer-mode', locale, {
						mode: t(`mode.${mode}`, locale),
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

/**
 * One-time migration from the old `obsidian-pomodoro-timer` plugin's data
 * file, so the user keeps their settings with zero action.
 * Only runs while none of the pomodoro settings have been customized in Miyu
 * (i.e. everything is still at default) — afterwards it never applies again.
 */
async function migrateLegacySettings(plugin: MiyuPlugin) {
	try {
		const hasCustomSettings = POMODORO_SETTING_KEYS.some(
			(key) =>
				plugin.settings[key] !==
				DEFAULT_SETTINGS[key as keyof MiyuSettings],
		);
		if (hasCustomSettings) {
			return;
		}

		for (const pluginId of LEGACY_PLUGIN_IDS) {
			const file = plugin.app.vault.getAbstractFileByPath(
				`.obsidian/plugins/${pluginId}/data.json`,
			);
			if (!file || !(file instanceof TFile)) {
				continue;
			}
			const data = JSON.parse(
				await plugin.app.vault.cachedRead(file),
			) as unknown;
			if (typeof data !== 'object' || data === null) {
				continue;
			}
			const dataObj = data as Record<string, unknown>;
			let changed = false;
			for (const key of POMODORO_SETTING_KEYS) {
				if (key in dataObj) {
					const value = dataObj[key];
					if (typeof value === typeof DEFAULT_SETTINGS[key]) {
						(
							plugin.settings as unknown as Record<
								string,
								unknown
							>
						)[key] = value;
						changed = true;
					}
				}
			}
			if (changed) {
				await plugin.saveSettings();
			}
			return;
		}
	} catch (e) {
		console.warn('[miyu] pomodoro settings migration failed:', e);
	}
}
