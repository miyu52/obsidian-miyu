import {
	App,
	PluginSettingTab,
	Setting,
	moment,
} from 'obsidian';
import type MiyuPlugin from './main';
import { t, type Locale } from './i18n';
import { appHasDailyNotesPluginLoaded, appHasWeeklyNotesPluginLoaded } from './features/pomodoro/daily-notes';
import { getTemplater } from './features/pomodoro/task-utils';

export type LogFileType = 'DAILY' | 'WEEKLY' | 'FILE' | 'NONE';
export type LogLevel = 'ALL' | 'WORK' | 'BREAK';
export type LogFormat = 'SIMPLE' | 'VERBOSE' | 'CUSTOM';
export type TaskFormat = 'TASKS' | 'DATAVIEW';

export interface MiyuSettings {
	language: Locale;
	randomLength: number;
	randomUppercase: boolean;
	randomLowercase: boolean;
	randomNumbers: boolean;
	randomSymbols: boolean;

	// Pomodoro timer.
	// NOTE: key names intentionally match the `obsidian-pomodoro-timer`
	// plugin's data file so user settings migrate over seamlessly.
	workLen: number;
	breakLen: number;
	autostart: boolean;
	useStatusBarTimer: boolean;
	lowFps: boolean;
	useSystemNotification: boolean;
	notificationSound: boolean;
	customSound: string;
	enableTaskTracking: boolean;
	showTaskProgress: boolean;
	taskFormat: TaskFormat;
	logFile: LogFileType;
	logFocused: boolean;
	logPath: string;
	logLevel: LogLevel;
	logTemplate: string;
	logFormat: LogFormat;
}

export const DEFAULT_SETTINGS: MiyuSettings = {
	language: 'zh-CN',
	randomLength: 8,
	randomUppercase: true,
	randomLowercase: false,
	randomNumbers: true,
	randomSymbols: false,

	workLen: 25,
	breakLen: 5,
	autostart: false,
	useStatusBarTimer: false,
	lowFps: false,
	useSystemNotification: false,
	notificationSound: true,
	customSound: '',
	enableTaskTracking: false,
	showTaskProgress: true,
	taskFormat: 'TASKS',
	logFile: 'NONE',
	logFocused: false,
	logPath: '',
	logLevel: 'ALL',
	logTemplate: '',
	logFormat: 'VERBOSE',
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

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-length.name'))
			.setDesc(s(plugin, 'settings.random-length.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(1, 64, 1)
					.setValue(plugin.settings.randomLength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						plugin.settings.randomLength = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-uppercase.name'))
			.setDesc(s(plugin, 'settings.random-uppercase.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomUppercase)
					.onChange(async (value) => {
						plugin.settings.randomUppercase = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-lowercase.name'))
			.setDesc(s(plugin, 'settings.random-lowercase.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomLowercase)
					.onChange(async (value) => {
						plugin.settings.randomLowercase = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-numbers.name'))
			.setDesc(s(plugin, 'settings.random-numbers.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomNumbers)
					.onChange(async (value) => {
						plugin.settings.randomNumbers = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.random-symbols.name'))
			.setDesc(s(plugin, 'settings.random-symbols.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.randomSymbols)
					.onChange(async (value) => {
						plugin.settings.randomSymbols = value;
						await plugin.saveSettings();
					}),
			);

		// --- Pomodoro timer ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.pomodoro'))
			.setHeading();

		new Setting(containerEl)
			.setName(s(plugin, 'settings.work-len.name'))
			.setDesc(s(plugin, 'settings.work-len.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(1, 120, 1)
					.setValue(plugin.settings.workLen)
					.setDynamicTooltip()
					.onChange(async (value) => {
						plugin.settings.workLen = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.break-len.name'))
			.setDesc(s(plugin, 'settings.break-len.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(0, 60, 1)
					.setValue(plugin.settings.breakLen)
					.setDynamicTooltip()
					.onChange(async (value) => {
						plugin.settings.breakLen = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.autostart.name'))
			.setDesc(s(plugin, 'settings.autostart.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.autostart)
					.onChange(async (value) => {
						plugin.settings.autostart = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.status-bar-timer.name'))
			.setDesc(s(plugin, 'settings.status-bar-timer.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.useStatusBarTimer)
					.onChange(async (value) => {
						plugin.settings.useStatusBarTimer = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.low-fps.name'))
			.setDesc(s(plugin, 'settings.low-fps.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.lowFps)
					.onChange(async (value) => {
						plugin.settings.lowFps = value;
						await plugin.saveSettings();
					}),
			);

		// --- Pomodoro notification ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.notification'))
			.setHeading();

		new Setting(containerEl)
			.setName(s(plugin, 'settings.system-notification.name'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.useSystemNotification)
					.onChange(async (value) => {
						plugin.settings.useSystemNotification = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.notification-sound.name'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.notificationSound)
					.onChange(async (value) => {
						plugin.settings.notificationSound = value;
						await plugin.saveSettings();
						plugin.settingTab.display();
					}),
			);

		if (plugin.settings.notificationSound) {
			new Setting(containerEl)
				.setName(s(plugin, 'settings.custom-sound.name'))
				.setDesc(s(plugin, 'settings.custom-sound.desc'))
				.addText((text) => {
					text.inputEl.setCssProps({ width: '100%' });
					text.setPlaceholder(s(plugin, 'settings.custom-sound.placeholder'));
					text.setValue(plugin.settings.customSound);
					text.onChange(async (value) => {
						plugin.settings.customSound = value;
						await plugin.saveSettings();
					});
				})
				.addExtraButton((button) => {
					button.setIcon('play');
					button.setTooltip(s(plugin, 'settings.custom-sound.play'));
					button.onClick(() => {
						plugin.pomodoro?.timer.playAudio();
					});
				});
		}

		// --- Pomodoro task ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.task'))
			.setHeading();

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-tracking.name'))
			.setDesc(s(plugin, 'settings.task-tracking.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.enableTaskTracking)
					.onChange(async (value) => {
						plugin.settings.enableTaskTracking = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-progress.name'))
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.showTaskProgress)
					.onChange(async (value) => {
						plugin.settings.showTaskProgress = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(s(plugin, 'settings.task-format.name'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption(
						'TASKS',
						s(plugin, 'settings.task-format.tasks'),
					)
					.addOption(
						'DATAVIEW',
						s(plugin, 'settings.task-format.dataview'),
					)
					.setValue(plugin.settings.taskFormat)
					.onChange(async (value) => {
						plugin.settings.taskFormat = value as TaskFormat;
						await plugin.saveSettings();
						plugin.settingTab.display();
					}),
			);

		// --- Pomodoro log ---
		new Setting(containerEl)
			.setName(s(plugin, 'settings.section.log'))
			.setHeading();

		new Setting(containerEl)
			.setName(s(plugin, 'settings.log-file.name'))
			.addDropdown((dropdown) => {
				dropdown.selectEl.setCssProps({ width: '160px' });
				dropdown.addOption('NONE', s(plugin, 'settings.log-file.none'));
				if (appHasDailyNotesPluginLoaded(plugin.app)) {
					dropdown.addOption(
						'DAILY',
						s(plugin, 'settings.log-file.daily'),
					);
				}
				if (appHasWeeklyNotesPluginLoaded(plugin.app)) {
					dropdown.addOption(
						'WEEKLY',
						s(plugin, 'settings.log-file.weekly'),
					);
				}
				dropdown.addOption('FILE', s(plugin, 'settings.log-file.file'));
				dropdown.setValue(plugin.settings.logFile);
				dropdown.onChange(async (value) => {
					plugin.settings.logFile = value as LogFileType;
					await plugin.saveSettings();
					plugin.settingTab.display();
				});
			});

		if (plugin.settings.logFile !== 'NONE') {
			if (plugin.settings.logFile === 'FILE') {
				new Setting(containerEl)
					.setName(s(plugin, 'settings.log-path.name'))
					.setDesc(s(plugin, 'settings.log-path.desc'))
					.addText((text) => {
						text.inputEl.setCssProps({ width: '300px' });
						text.setValue(plugin.settings.logPath);
						text.onChange(async (value) => {
							plugin.settings.logPath = value;
							await plugin.saveSettings();
						});
					});
			}

			new Setting(containerEl)
				.setName(s(plugin, 'settings.log-level.name'))
				.addDropdown((dropdown) =>
					dropdown
						.addOption('ALL', s(plugin, 'settings.log-level.all'))
						.addOption('WORK', s(plugin, 'settings.log-level.work'))
						.addOption(
							'BREAK',
							s(plugin, 'settings.log-level.break'),
						)
						.setValue(plugin.settings.logLevel)
						.onChange(async (value) => {
							plugin.settings.logLevel = value as LogLevel;
							await plugin.saveSettings();
						}),
				);

			const hasTemplater = !!getTemplater(plugin.app);

			let example = '';
			if (plugin.settings.logFormat == 'SIMPLE') {
				example = `**WORK(25m)**: from ${moment()
					.subtract(25, 'minutes')
					.format('HH:mm')} - ${moment().format('HH:mm')}`;
			}
			if (plugin.settings.logFormat == 'VERBOSE') {
				example = `- 🍅 (pomodoro::WORK) (duration:: 25m) (begin:: ${moment()
					.subtract(25, 'minutes')
					.format('YYYY-MM-DD HH:mm')}) - (end:: ${moment().format(
						'YYYY-MM-DD HH:mm',
					)})`;
			}

			new Setting(containerEl)
				.setName(s(plugin, 'settings.log-format.name'))
				.setDesc(example)
				.addDropdown((dropdown) =>
					dropdown
						.addOption(
							'SIMPLE',
							s(plugin, 'settings.log-format.simple'),
						)
						.addOption(
							'VERBOSE',
							s(plugin, 'settings.log-format.verbose'),
						)
						.addOption(
							'CUSTOM',
							s(plugin, 'settings.log-format.custom'),
						)
						.setValue(plugin.settings.logFormat)
						.onChange(async (value) => {
							plugin.settings.logFormat = value as LogFormat;
							await plugin.saveSettings();
							plugin.settingTab.display();
						}),
				);

			if (plugin.settings.logFormat == 'CUSTOM') {
				const logTemplate = new Setting(containerEl).setName(
					s(plugin, 'settings.log-template.name'),
				);
				if (hasTemplater) {
					logTemplate.addTextArea((text) => {
						text.inputEl.setCssProps({
							width: '100%',
							resize: 'vertical',
						});
						text.setPlaceholder(
							s(plugin, 'settings.log-template.placeholder'),
						);
						text.setValue(plugin.settings.logTemplate);
						text.onChange(async (value) => {
							plugin.settings.logTemplate = value;
							await plugin.saveSettings();
						});
					});
				} else {
					logTemplate
						.setDesc(
							createFragment((fragment) => {
								const text1 = fragment.createSpan();
								text1.setText(
									s(plugin, 'settings.templater.prefix'),
								);
								text1.setCssProps({ color: 'var(--text-error)' });
								const a = fragment.createEl('a');
								a.setText(
									s(plugin, 'settings.templater.link'),
								);
								a.href =
									'obsidian://show-plugin?id=templater-obsidian';
								const text2 = fragment.createSpan();
								text2.setText(
									s(plugin, 'settings.templater.suffix'),
								);
								text2.setCssProps({ color: 'var(--text-error)' });
								fragment.append(text1, a, text2);
							}),
						)
						.addButton((button) => {
							button.setIcon('refresh-ccw');
							button.setTooltip(
								s(plugin, 'settings.templater.refresh'),
							);
							button.onClick(() => {
								this.display();
							});
						});
				}
			}
		}

		new Setting(containerEl).addButton((button) => {
			button.setButtonText(s(plugin, 'settings.restore-defaults'));
			button.onClick(async () => {
				plugin.settings = {
					...DEFAULT_SETTINGS,
					language: plugin.settings.language,
				};
				await plugin.saveSettings();
				plugin.settingTab.display();
			});
		});
	}
}
