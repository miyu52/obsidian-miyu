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
						// Reopen pomodoro view with new language
						const hadView =
							plugin.app.workspace.getLeavesOfType(POMODORO_VIEW_TYPE)
								.length > 0;
						plugin.app.workspace.detachLeavesOfType(
							POMODORO_VIEW_TYPE,
						);
						if (hadView) {
							await plugin.app.workspace
								.getLeaf('split')
								.setViewState({
									type: POMODORO_VIEW_TYPE,
									active: false,
								});
						}
						this.display();
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

		const randomToggles: Array<{
			key: string;
			get: () => boolean;
			set: (v: boolean) => void;
		}> = [
			{
				key: 'settings.random-uppercase.name',
				get: () => plugin.settings.randomFile.uppercase,
				set: (v) => { plugin.settings.randomFile.uppercase = v; },
			},
			{
				key: 'settings.random-lowercase.name',
				get: () => plugin.settings.randomFile.lowercase,
				set: (v) => { plugin.settings.randomFile.lowercase = v; },
			},
			{
				key: 'settings.random-numbers.name',
				get: () => plugin.settings.randomFile.numbers,
				set: (v) => { plugin.settings.randomFile.numbers = v; },
			},
			{
				key: 'settings.random-symbols.name',
				get: () => plugin.settings.randomFile.symbols,
				set: (v) => { plugin.settings.randomFile.symbols = v; },
			},
		];

		for (const { key, get, set } of randomToggles) {
			new Setting(containerEl)
				.setName(s(plugin, key))
				.setDesc(s(plugin, key.replace('.name', '.desc')))
				.addToggle((toggle) =>
					toggle.setValue(get()).onChange(async (value) => {
						set(value);
						await plugin.saveSettings();
					}),
				);
		}

		// --- Pomodoro ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.pomodoro'))
			.setHeading();

		// Task file paths — description area holds the list
		const taskDescFrag = new DocumentFragment();
		const taskListEl = taskDescFrag.createDiv({
			cls: 'miyu-task-files-list',
		});

		function refreshTaskFileList() {
			taskListEl.empty();
			for (const path of plugin.settings.pomodoro.taskFilePaths) {
				const row = taskListEl.createDiv({ cls: 'miyu-file-item' });
				row.createSpan({
					text: path,
					cls: 'miyu-file-item-path',
				});
				const rmBtn = row.createEl('button', {
					text: '✕',
					cls: 'miyu-file-item-remove',
				});
				rmBtn.onclick = async () => {
					plugin.settings.pomodoro.taskFilePaths =
						plugin.settings.pomodoro.taskFilePaths.filter(
							(p) => p !== path,
						);
					await plugin.saveSettings();
					refreshTaskFileList();
				};
			}
		}

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-file-paths.name'))
			.setDesc(taskDescFrag)
			.addButton((btn) =>
				btn.setButtonText('+').onClick(() => {
					const row = containerEl.createDiv({
						cls: 'miyu-file-suggest-row',
					});
					const input = row.createEl('input', {
						type: 'text',
						placeholder: 'search file...',
					});
					input.addClass('miyu-file-suggest-input');
					new FileSuggest(plugin.app, input, (file) => {
						const paths = [
							...plugin.settings.pomodoro.taskFilePaths,
						];
						if (!paths.includes(file.path)) {
							paths.push(file.path);
							plugin.settings.pomodoro.taskFilePaths =
								paths;
							void plugin.saveSettings();
							row.remove();
							refreshTaskFileList();
						}
					});
				}),
			);

		refreshTaskFileList();

		// Work minutes — number input
		new Setting(containerEl)
			.setName(s(plugin, 'settings.work-minutes.name'))
			.setDesc(s(plugin, 'settings.work-minutes.desc'))
			.addText((text) => {
				text.setValue(
					String(plugin.settings.pomodoro.workMinutes),
				);
				text.inputEl.type = 'number';
				text.inputEl.setAttr('min', '1');
				text.inputEl.setAttr('max', '120');
				text.inputEl.addClass('miyu-number-input');
				text.onChange(async (value) => {
					const n = parseInt(value, 10);
					if (n >= 1 && n <= 120) {
						plugin.settings.pomodoro.workMinutes = n;
						if (plugin.timer) plugin.timer.syncSettings();
						await plugin.saveSettings();
					}
				});
			});

		// Break minutes — number input
		new Setting(containerEl)
			.setName(s(plugin, 'settings.break-minutes.name'))
			.setDesc(s(plugin, 'settings.break-minutes.desc'))
			.addText((text) => {
				text.setValue(
					String(plugin.settings.pomodoro.breakMinutes),
				);
				text.inputEl.type = 'number';
				text.inputEl.setAttr('min', '0');
				text.inputEl.setAttr('max', '60');
				text.inputEl.addClass('miyu-number-input');
				text.onChange(async (value) => {
					const n = parseInt(value, 10);
					if (n >= 0 && n <= 60) {
						plugin.settings.pomodoro.breakMinutes = n;
						if (plugin.timer) plugin.timer.syncSettings();
						await plugin.saveSettings();
					}
				});
			});

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
						if (plugin._statusEl) {
							plugin._statusEl.toggleClass('miyu-sb-hidden', !value);
						}
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
