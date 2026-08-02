import {
	App,
	PluginSettingTab,
	Setting,
	SuggestModal,
	TFile,
	moment,
} from 'obsidian';
import type MiyuPlugin from './main';
import { t, type Locale } from './i18n';
import {
	DEFAULT_POMODORO_SETTINGS,
	type PomodoroSettings,
} from './features/pomodoro/settings';
export interface RandomFileSettings {
	length: number;
	uppercase: boolean;
	lowercase: boolean;
	numbers: boolean;
	symbols: boolean;
}

export interface MiyuSettings {
	language: Locale;
	randomFile: RandomFileSettings;
	pomodoro: PomodoroSettings;
}

export const DEFAULT_SETTINGS: MiyuSettings = {
	language: 'zh-CN',
	randomFile: {
		length: 8,
		uppercase: true,
		lowercase: false,
		numbers: true,
		symbols: false,
	},
	pomodoro: { ...DEFAULT_POMODORO_SETTINGS },
};

/**
 * 合并持久化的设置与默认值（嵌套字段逐项深合并）：
 * Object.assign 的浅合并会让后新增的嵌套键变成 undefined，
 * 例如旧 data.json 的 pomodoro 对象没有 weekStart 键 → 回退到语言环境默认。
 */
export function normalizeSettings(
	loaded: Partial<MiyuSettings> | null,
): MiyuSettings {
	return {
		...DEFAULT_SETTINGS,
		...loaded,
		randomFile: {
			...DEFAULT_SETTINGS.randomFile,
			...loaded?.randomFile,
		},
		pomodoro: {
			...DEFAULT_POMODORO_SETTINGS,
			...loaded?.pomodoro,
		},
	};
}

/** Helper: get the current locale string from plugin settings. */
function s(plugin: MiyuPlugin, key: string, vars?: Record<string, string>) {
	return t(key, plugin.settings.language, vars);
}

/** 文件选择弹窗：从 vault 中搜索 md 文件。 */
class FileSuggestModal extends SuggestModal<TFile> {
	private onPick: (file: TFile) => void;

	constructor(app: App, onPick: (file: TFile) => void) {
		super(app);
		this.onPick = onPick;
	}

	getSuggestions(query: string): TFile[] {
		const q = query.trim().toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((f) => !q || f.path.toLowerCase().includes(q))
			.slice(0, 30);
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.setText(file.path);
	}

	onChooseSuggestion(file: TFile) {
		this.onPick(file);
	}
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
					.addOption('en', 'English')
					.addOption('zh-CN', '简体中文')
					.setValue(plugin.settings.language)
					.onChange(async (value) => {
						plugin.settings.language = value as Locale;
						await plugin.saveSettings();
						// Reload features so command names update
						plugin.reloadFeatures();
						// Re-render the settings tab for the new language
						plugin.settingTab.display();
					}),
			);

		// --- Random file name ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.random-file'))
			.setHeading();

		const lengthSetting = new Setting(containerEl)
			.setName(s(plugin, 'settings.random-length.name'))
			.setDesc(s(plugin, 'settings.random-length.desc'));
		addNumberInput(
			lengthSetting,
			() => plugin.settings.randomFile.length,
			1,
			64,
			(value) => {
				plugin.settings.randomFile.length = value;
				void plugin.saveSettings();
			},
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

		// --- Pomodoro timer ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.pomodoro'))
			.setHeading();

		const workSetting = new Setting(containerEl)
			.setName(s(plugin, 'settings.work-minutes.name'))
			.setDesc(s(plugin, 'settings.work-minutes.desc'));
		addNumberInput(
			workSetting,
			() => plugin.settings.pomodoro.workMinutes,
			1,
			120,
			(value) => {
				plugin.settings.pomodoro.workMinutes = value;
				void plugin.saveSettings();
			},
		);

		const breakSetting = new Setting(containerEl)
			.setName(s(plugin, 'settings.break-minutes.name'))
			.setDesc(s(plugin, 'settings.break-minutes.desc'));
		addNumberInput(
			breakSetting,
			() => plugin.settings.pomodoro.breakMinutes,
			0,
			60,
			(value) => {
				plugin.settings.pomodoro.breakMinutes = value;
				void plugin.saveSettings();
			},
		);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.auto-start-next.name'))
			.setDesc(s(plugin, 'settings.auto-start-next.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.autoStartNext)
					.onChange(async (value) => {
						plugin.settings.pomodoro.autoStartNext = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.status-bar-timer.name'))
			.setDesc(s(plugin, 'settings.status-bar-timer.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.showStatusBarTimer)
					.onChange(async (value) => {
						plugin.settings.pomodoro.showStatusBarTimer = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.low-fps.name'))
			.setDesc(s(plugin, 'settings.low-fps.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.lowFps)
					.onChange(async (value) => {
						plugin.settings.pomodoro.lowFps = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.system-notification.name'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.systemNotification)
					.onChange(async (value) => {
						plugin.settings.pomodoro.systemNotification = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.notification-sound.name'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.notificationSound)
					.onChange(async (value) => {
						plugin.settings.pomodoro.notificationSound = value;
						await plugin.saveSettings();
						plugin.settingTab.display();
					}),
			);

		if (plugin.settings.pomodoro.notificationSound) {
			new Setting(containerEl)
				.setName(s(plugin, 'settings.custom-sound.name'))
				.setDesc(s(plugin, 'settings.custom-sound.desc'))
				.addText((text) => {
					text.inputEl.addClass('miyu-setting-input');
					text.setPlaceholder(
						s(plugin, 'settings.custom-sound.placeholder'),
					);
					text.setValue(plugin.settings.pomodoro.soundFile);
					text.onChange(async (value) => {
						plugin.settings.pomodoro.soundFile = value;
						await plugin.saveSettings();
					});
				})
				.addExtraButton((button) => {
					button.setIcon('play');
					button.setTooltip(s(plugin, 'settings.custom-sound.play'));
					button.onClick(() => {
						plugin.pomodoro?.timer.toggleAudioPreview();
					});
				});
		}

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-tracking.name'))
			.setDesc(s(plugin, 'settings.task-tracking.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.taskTracking)
					.onChange(async (value) => {
						plugin.settings.pomodoro.taskTracking = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-progress.name'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.pomodoro.showTaskProgress)
					.onChange(async (value) => {
						plugin.settings.pomodoro.showTaskProgress = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-format.name'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('TASKS', s(plugin, 'settings.task-format.tasks'))
					.addOption(
						'DATAVIEW',
						s(plugin, 'settings.task-format.dataview'),
					)
					.setValue(plugin.settings.pomodoro.taskFormat)
					.onChange(async (value) => {
						plugin.settings.pomodoro.taskFormat =
							value as PomodoroSettings['taskFormat'];
						await plugin.saveSettings();
						plugin.settingTab.display();
					}),
			);

		const goalSetting = new Setting(containerEl)
			.setName(s(plugin, 'settings.daily-goal.name'))
			.setDesc(s(plugin, 'settings.daily-goal.desc'));
		addNumberInput(
			goalSetting,
			() => plugin.settings.pomodoro.dailyGoal,
			0,
			30,
			(value) => {
				plugin.settings.pomodoro.dailyGoal = value;
				void plugin.saveSettings();
			},
		);

		// --- 周起始日（参考 calendar 插件的 Start week on 设置） ---
		const localeDow = moment.localeData().firstDayOfWeek();
		const localeWeekStart = moment.weekdays()[localeDow] ?? '';
		new Setting(containerEl)
			.setName(s(plugin, 'settings.week-start.name'))
			.setDesc(s(plugin, 'settings.week-start.desc'))
			.addDropdown((dropdown) => {
				dropdown.addOption(
					'locale',
					s(plugin, 'settings.week-start.locale', {
						day: localeWeekStart,
					}),
				);
				moment.weekdays().forEach((day, i) => {
					dropdown.addOption(String(i), day);
				});
				dropdown.setValue(
					plugin.settings.pomodoro.weekStart === null
						? 'locale'
						: String(plugin.settings.pomodoro.weekStart),
				);
				dropdown.onChange(async (value) => {
					plugin.settings.pomodoro.weekStart =
						value === 'locale' ? null : parseInt(value);
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(s(plugin, 'settings.files.name'))
			.setDesc(s(plugin, 'settings.files.desc'))
			.addButton((button) => {
				button.setButtonText(s(plugin, 'settings.files.add'));
				button.onClick(() => {
					new FileSuggestModal(plugin.app, (file) => {
						const p = plugin.settings.pomodoro;
						if (p.files.includes(file.path)) {
							return;
						}
						p.files.push(file.path);
						if (!p.activeFile) {
							p.activeFile = file.path;
						}
						void plugin.saveSettings();
						plugin.settingTab.display();
					}).open();
				});
			});

		for (const path of plugin.settings.pomodoro.files) {
			new Setting(containerEl)
				.setName(path)
				.addExtraButton((button) => {
					button.setIcon('trash');
					button.setTooltip(s(plugin, 'settings.files.remove'));
					button.onClick(async () => {
						const p = plugin.settings.pomodoro;
						p.files = p.files.filter((f) => f !== path);
						if (p.activeFile === path) {
							p.activeFile = p.files[0] ?? '';
						}
						await plugin.saveSettings();
						plugin.settingTab.display();
					});
				});
		}
	}
}

/** 数字输入框（Obsidian 官方风格）：输入即保存，越界自动回退。 */
function addNumberInput(
	setting: Setting,
	get: () => number,
	min: number,
	max: number,
	set: (value: number) => void,
) {
	setting.addText((text) => {
		text.inputEl.type = 'number';
		text.inputEl.min = String(min);
		text.inputEl.max = String(max);
		text.inputEl.addClass('miyu-setting-input');
		text.setValue(String(get()));
		text.onChange(() => {
			const num = parseInt(text.getValue());
			if (!isNaN(num) && num >= min && num <= max) {
				set(num);
			}
			text.setValue(String(get()));
		});
	});
}
