import { App, PluginSettingTab, Setting } from 'obsidian';
import type MiyuPlugin from './main';
import { t, type Locale } from './i18n';
import type { PomodoroLog, ActiveTask, PanelMode } from './types';

// --- Nested settings ---

export interface RandomFileSettings {
	length: number;
	uppercase: boolean;
	lowercase: boolean;
	numbers: boolean;
	symbols: boolean;
}

export interface PomodoroSettings {
	taskFilePaths: string[];
	activeTaskFilePath: string;
	workMinutes: number;
	breakMinutes: number;
	autoStart: boolean;
	notificationSound: boolean;
	showStatusBar: boolean;
	lowFrameRate: boolean;
	// Runtime state
	logs: PomodoroLog[];
	activeTask: ActiveTask | null;
	panelMode: PanelMode;
	taskFilter: string;
	taskSearch: string;
	headingCollapse: Record<string, boolean>;
}

export interface MiyuSettings {
	language: Locale;
	randomFile: RandomFileSettings;
	pomodoro: PomodoroSettings;
}

export const DEFAULT_RANDOM_FILE: RandomFileSettings = {
	length: 8,
	uppercase: true,
	lowercase: false,
	numbers: true,
	symbols: false,
};

export const DEFAULT_POMODORO: PomodoroSettings = {
	taskFilePaths: [],
	activeTaskFilePath: '',
	workMinutes: 25,
	breakMinutes: 5,
	autoStart: false,
	notificationSound: true,
	showStatusBar: true,
	lowFrameRate: false,
	logs: [],
	activeTask: null,
	panelMode: 'none',
	taskFilter: 'all',
	taskSearch: '',
	headingCollapse: {},
};

export const DEFAULT_SETTINGS: MiyuSettings = {
	language: 'zh-CN',
	randomFile: { ...DEFAULT_RANDOM_FILE },
	pomodoro: { ...DEFAULT_POMODORO },
};

/** Helper: get the current locale string from plugin settings. */
function s(plugin: MiyuPlugin, key: string, vars?: Record<string, string>) {
	return t(key, plugin.settings.language, vars);
}

export class MiyuSettingTab extends PluginSettingTab {
	plugin: MiyuPlugin;

	constructor(app: App, plugin: MiyuPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const plugin = this.plugin;
		containerEl.empty();

		// --- Language ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.language.name'))
			.setDesc(s(plugin, 'settings.language.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('zh-CN', '简体中文')
					.addOption('en', 'English')
					.setValue(plugin.settings.language)
					.onChange(async (value) => {
						plugin.settings.language = value as Locale;
						await plugin.saveSettings();
						plugin.reloadFeatures();
						plugin.settingTab.display();
					}),
			);

		// --- Random file name ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.random-file'))
			.setHeading();

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-length.name'))
			.setDesc(s(plugin, 'settings.random-length.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(1, 64, 1)
					.setValue(plugin.settings.randomFile.length)
					.setDynamicTooltip()
					.onChange(async (value) => {
						plugin.settings.randomFile.length = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-uppercase.name'))
			.setDesc(s(plugin, 'settings.random-uppercase.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomFile.uppercase)
					.onChange(async (value) => {
						plugin.settings.randomFile.uppercase = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-lowercase.name'))
			.setDesc(s(plugin, 'settings.random-lowercase.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomFile.lowercase)
					.onChange(async (value) => {
						plugin.settings.randomFile.lowercase = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-numbers.name'))
			.setDesc(s(plugin, 'settings.random-numbers.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomFile.numbers)
					.onChange(async (value) => {
						plugin.settings.randomFile.numbers = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-symbols.name'))
			.setDesc(s(plugin, 'settings.random-symbols.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomFile.symbols)
					.onChange(async (value) => {
						plugin.settings.randomFile.symbols = value;
						await plugin.saveSettings();
					}),
			);

		// --- Pomodoro ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.pomodoro'))
			.setHeading();

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-file-paths.name'))
			.setDesc(s(plugin, 'settings.task-file-paths.desc'))
			.addTextArea((text) => {
				text.setValue(plugin.settings.pomodoro.taskFilePaths.join('\n'));
				text.setPlaceholder('Tasks.md');
				text.inputEl.addClass('miyu-setting-textarea');
				text.onChange(async (value) => {
					plugin.settings.pomodoro.taskFilePaths = value
						.split('\n')
						.map((p) => p.trim())
						.filter((p) => p.length > 0);
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(s(plugin, 'settings.work-minutes.name'))
			.setDesc(s(plugin, 'settings.work-minutes.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(1, 120, 1)
					.setValue(plugin.settings.pomodoro.workMinutes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						plugin.settings.pomodoro.workMinutes = value;
						if (plugin.timer) plugin.timer.syncSettings();
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.break-minutes.name'))
			.setDesc(s(plugin, 'settings.break-minutes.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(0, 60, 1)
					.setValue(plugin.settings.pomodoro.breakMinutes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						plugin.settings.pomodoro.breakMinutes = value;
						if (plugin.timer) plugin.timer.syncSettings();
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.auto-start.name'))
			.setDesc(s(plugin, 'settings.auto-start.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.autoStart)
					.onChange(async (value) => {
						plugin.settings.pomodoro.autoStart = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.notification-sound.name'))
			.setDesc(s(plugin, 'settings.notification-sound.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.notificationSound)
					.onChange(async (value) => {
						plugin.settings.pomodoro.notificationSound = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.show-status-bar.name'))
			.setDesc(s(plugin, 'settings.show-status-bar.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.showStatusBar)
					.onChange(async (value) => {
						plugin.settings.pomodoro.showStatusBar = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.low-frame-rate.name'))
			.setDesc(s(plugin, 'settings.low-frame-rate.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.lowFrameRate)
					.onChange(async (value) => {
						plugin.settings.pomodoro.lowFrameRate = value;
						await plugin.saveSettings();
					}),
			);
	}
}
