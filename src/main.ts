import { Plugin } from 'obsidian';
import {
	MiyuSettings,
	MiyuSettingTab,
	DEFAULT_SETTINGS,
	DEFAULT_RANDOM_FILE,
	DEFAULT_POMODORO,
} from './settings';
import { registerRandomFileFeature } from './features/random-file';
import { registerPomodoroFeature } from './features/pomodoro';
import type { PomodoroTimer } from './features/pomodoro/timer';
import type { TaskTracker } from './features/pomodoro/task-tracker';
import type { PomodoroLog, ActiveTask, PanelMode } from './types';
import { t, type Locale } from './i18n';

export default class MiyuPlugin extends Plugin {
	settings!: MiyuSettings;
	settingTab!: MiyuSettingTab;
	timer?: PomodoroTimer;
	tracker?: TaskTracker;
	_sbSetup?: boolean;
	_statusEl?: HTMLElement;
	private _featureCommandIds: string[] = [];

	/** Convenience i18n helper for Svelte components. */
	_t(key: string, vars?: Record<string, string>): string {
		return t(key, this.settings.language, vars);
	}

	async onload() {
		try {
			const raw = (await this.loadData()) as Record<string, unknown> | null;
			this.settings = this.migrateSettings(raw ?? {});

			this.settingTab = new MiyuSettingTab(this.app, this);
			this.addSettingTab(this.settingTab);

			this._registerFeatures();
		} catch (err) {
			console.error('[Miyu] Failed to load plugin:', err);
		}
	}

	onunload() {
		this.timer?.destroy();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	reloadFeatures(): void {
		for (const id of this._featureCommandIds) {
			this.removeCommand(id);
		}
		this._featureCommandIds = [];
		this._registerFeatures();
	}

	/**
	 * Migrate old flat settings to nested structure.
	 * Detects if data.json is in old format and converts.
	 */
	private migrateSettings(raw: Record<string, unknown>): MiyuSettings {
		// Already migrated
		if (raw.randomFile && raw.pomodoro) {
			return { ...DEFAULT_SETTINGS, ...raw };
		}

		// Migrate from flat format
		const lang = raw.language;
		const language: Locale = (lang === 'en' || lang === 'zh-CN') ? lang : DEFAULT_SETTINGS.language;
		const settings: MiyuSettings = {
			language,
			randomFile: {
				length: (raw.randomLength as number) ?? DEFAULT_RANDOM_FILE.length,
				uppercase: (raw.randomUppercase as boolean) ?? DEFAULT_RANDOM_FILE.uppercase,
				lowercase: (raw.randomLowercase as boolean) ?? DEFAULT_RANDOM_FILE.lowercase,
				numbers: (raw.randomNumbers as boolean) ?? DEFAULT_RANDOM_FILE.numbers,
				symbols: (raw.randomSymbols as boolean) ?? DEFAULT_RANDOM_FILE.symbols,
			},
			pomodoro: {
				taskFilePaths: (raw.taskFilePaths as string[]) ?? DEFAULT_POMODORO.taskFilePaths,
				activeTaskFilePath: (raw.activeTaskFilePath as string) ?? DEFAULT_POMODORO.activeTaskFilePath,
				workMinutes: (raw.workMinutes as number) ?? DEFAULT_POMODORO.workMinutes,
				breakMinutes: (raw.breakMinutes as number) ?? DEFAULT_POMODORO.breakMinutes,
				autoStart: (raw.autoStart as boolean) ?? DEFAULT_POMODORO.autoStart,
				notificationSound: (raw.notificationSound as boolean) ?? DEFAULT_POMODORO.notificationSound,
				showStatusBar: (raw.showStatusBar as boolean) ?? DEFAULT_POMODORO.showStatusBar,
				lowFrameRate: (raw.lowFrameRate as boolean) ?? DEFAULT_POMODORO.lowFrameRate,
				logs: (raw.pomodoroLogs as PomodoroLog[]) ?? DEFAULT_POMODORO.logs,
				activeTask: (raw.activeTask as ActiveTask | null) ?? DEFAULT_POMODORO.activeTask,
				panelMode: (raw.panelMode as PanelMode) ?? DEFAULT_POMODORO.panelMode,
				taskFilter: (raw.taskFilter as string) ?? DEFAULT_POMODORO.taskFilter,
				taskSearch: (raw.taskSearch as string) ?? DEFAULT_POMODORO.taskSearch,
				headingCollapse: (raw.headingCollapse as Record<string, boolean>) ?? DEFAULT_POMODORO.headingCollapse,
			},
		};

		// Save migrated format
		void this.saveData(settings);
		return settings;
	}

	private _registerFeatures(): void {
		this._featureCommandIds.push(
			...registerRandomFileFeature(this),
			...registerPomodoroFeature(this),
		);
	}
}
