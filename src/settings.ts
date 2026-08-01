import { App, PluginSettingTab, Setting, AbstractInputSuggest, TFile } from 'obsidian';
import type MiyuPlugin from './main';
import { t, type Locale } from './i18n';
import type { PomodoroLog, ActiveTask, PanelMode } from './types';
import { POMODORO_VIEW_TYPE } from './features/pomodoro/view';

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
						// Close and reopen pomodoro views to pick up new language
						const leaves = plugin.app.workspace.getLeavesOfType(POMODORO_VIEW_TYPE);
						plugin.app.workspace.detachLeavesOfType(POMODORO_VIEW_TYPE);
						if (leaves.length > 0) {
							const nl = plugin.app.workspace.getRightLeaf(false);
							if (nl) await nl.setViewState({ type: POMODORO_VIEW_TYPE, active: true });
						}
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

		// Task file paths — list with file suggester
		const taskFilesContainer = containerEl.createDiv({ cls: 'miyu-task-files-container' });
		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-file-paths.name'))
			.setDesc(s(plugin, 'settings.task-file-paths.desc'))
			.addButton((btn) => btn.setButtonText('+ add file').onClick(() => showFileSuggest()));

		function showFileSuggest() {
			const row = taskFilesContainer.createDiv({ cls: 'miyu-file-suggest-row' });
			const input = row.createEl('input', { type: 'text', placeholder: 'Type file name...' });
			input.addClass('miyu-file-suggest-input');
			new FileSuggest(plugin.app, input, (file) => {
				const paths = [...plugin.settings.pomodoro.taskFilePaths];
				if (!paths.includes(file.path)) {
					paths.push(file.path);
					plugin.settings.pomodoro.taskFilePaths = paths;
					void plugin.saveSettings();
					row.remove();
					refreshTaskFileList();
				}
			});
		}

		function refreshTaskFileList() {
			const existing = taskFilesContainer.querySelectorAll(':scope > .miyu-file-item');
			existing.forEach((el) => el.remove());
			for (const path of plugin.settings.pomodoro.taskFilePaths) {
				const row = taskFilesContainer.createDiv({ cls: 'miyu-file-item' });
				row.createSpan({ text: path, cls: 'miyu-file-item-path' });
				const rmBtn = row.createEl('button', { text: '✕', cls: 'miyu-file-item-remove' });
				rmBtn.onclick = async () => {
					plugin.settings.pomodoro.taskFilePaths =
						plugin.settings.pomodoro.taskFilePaths.filter((p) => p !== path);
					await plugin.saveSettings();
					row.remove();
				};
			}
		}
		refreshTaskFileList();

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

/** File suggester for task file paths — uses Obsidian's AbstractInputSuggest. */
class FileSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		private cb: (file: TFile) => void,
	) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const lower = query.toLowerCase();
		return files
			.filter((f) => f.path.toLowerCase().includes(lower))
			.slice(0, 10);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createDiv({ text: file.path });
	}

	selectSuggestion(file: TFile): void {
		this.cb(file);
		this.close();
	}
}
