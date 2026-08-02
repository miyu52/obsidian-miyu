import { moment, Setting, setIcon, type PluginSettingTab } from 'obsidian';
import type MiyuPlugin from '../../main';
import { FileSuggestModal } from '../../ui/FileSuggestModal';
import { addNumberInput, addToggleSetting } from '../../ui/settings-helpers';
import { pomodoroSettings, type PomodoroSettings } from './settings';

/** 渲染番茄钟设置小节（Timer / Notification / Task / Daily goal / Files）。 */
export function renderPomodoroSettings(
	plugin: MiyuPlugin,
	containerEl: HTMLElement,
	tab: PluginSettingTab,
): void {
	new Setting(containerEl)
		.setName(plugin.t('settings.section.pomodoro'))
		.setHeading();

	const workSetting = new Setting(containerEl)
		.setName(plugin.t('settings.work-minutes.name'))
		.setDesc(plugin.t('settings.work-minutes.desc'));
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
		.setName(plugin.t('settings.break-minutes.name'))
		.setDesc(plugin.t('settings.break-minutes.desc'));
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

	const autostartSetting = new Setting(containerEl)
		.setName(plugin.t('settings.auto-start-next.name'))
		.setDesc(plugin.t('settings.auto-start-next.desc'));
	addToggleSetting(
		autostartSetting,
		() => plugin.settings.pomodoro.autoStartNext,
		(value) => {
			plugin.settings.pomodoro.autoStartNext = value;
			void plugin.saveSettings();
		},
	);

	const statusBarSetting = new Setting(containerEl)
		.setName(plugin.t('settings.status-bar-timer.name'))
		.setDesc(plugin.t('settings.status-bar-timer.desc'));
	addToggleSetting(
		statusBarSetting,
		() => plugin.settings.pomodoro.showStatusBarTimer,
		(value) => {
			plugin.settings.pomodoro.showStatusBarTimer = value;
			void plugin.saveSettings();
		},
	);

	const lowFpsSetting = new Setting(containerEl)
		.setName(plugin.t('settings.low-fps.name'))
		.setDesc(plugin.t('settings.low-fps.desc'));
	addToggleSetting(
		lowFpsSetting,
		() => plugin.settings.pomodoro.lowFps,
		(value) => {
			plugin.settings.pomodoro.lowFps = value;
			void plugin.saveSettings();
		},
	);

	const sysNotifSetting = new Setting(containerEl)
		.setName(plugin.t('settings.system-notification.name'));
	addToggleSetting(
		sysNotifSetting,
		() => plugin.settings.pomodoro.systemNotification,
		(value) => {
			plugin.settings.pomodoro.systemNotification = value;
			void plugin.saveSettings();
		},
	);

	const soundSetting = new Setting(containerEl)
		.setName(plugin.t('settings.notification-sound.name'));
	addToggleSetting(
		soundSetting,
		() => plugin.settings.pomodoro.notificationSound,
		(value) => {
			plugin.settings.pomodoro.notificationSound = value;
			void plugin.saveSettings();
			tab.display();
		},
	);

	if (plugin.settings.pomodoro.notificationSound) {
		new Setting(containerEl)
			.setName(plugin.t('settings.custom-sound.name'))
			.setDesc(plugin.t('settings.custom-sound.desc'))
			.addText((text) => {
				text.inputEl.addClass('miyu-setting-input');
				text.setPlaceholder(
					plugin.t('settings.custom-sound.placeholder'),
				);
				text.setValue(plugin.settings.pomodoro.soundFile);
				text.onChange((value) => {
					plugin.settings.pomodoro.soundFile = value;
					void plugin.saveSettings();
				});
			})
			.addExtraButton((button) => {
				button.setIcon('play');
				button.setTooltip(plugin.t('settings.custom-sound.play'));
				button.onClick(() => {
					plugin.pomodoro?.timer.toggleAudioPreview();
				});
			});
	}

	const taskTrackingSetting = new Setting(containerEl)
		.setName(plugin.t('settings.task-tracking.name'))
		.setDesc(plugin.t('settings.task-tracking.desc'));
	addToggleSetting(
		taskTrackingSetting,
		() => plugin.settings.pomodoro.taskTracking,
		(value) => {
			plugin.settings.pomodoro.taskTracking = value;
			void plugin.saveSettings();
		},
	);

	const taskProgressSetting = new Setting(containerEl)
		.setName(plugin.t('settings.task-progress.name'));
	addToggleSetting(
		taskProgressSetting,
		() => plugin.settings.pomodoro.showTaskProgress,
		(value) => {
			plugin.settings.pomodoro.showTaskProgress = value;
			void plugin.saveSettings();
		},
	);

	new Setting(containerEl)
		.setName(plugin.t('settings.task-format.name'))
		.addDropdown((dropdown) =>
			dropdown
				.addOption('TASKS', plugin.t('settings.task-format.tasks'))
				.addOption(
					'DATAVIEW',
					plugin.t('settings.task-format.dataview'),
				)
				.setValue(plugin.settings.pomodoro.taskFormat)
				.onChange((value) => {
					plugin.settings.pomodoro.taskFormat =
						value as PomodoroSettings['taskFormat'];
					void plugin.saveSettings();
					tab.display();
				}),
		);

	const goalSetting = new Setting(containerEl)
		.setName(plugin.t('settings.daily-goal.name'))
		.setDesc(plugin.t('settings.daily-goal.desc'));
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
		.setName(plugin.t('settings.week-start.name'))
		.setDesc(plugin.t('settings.week-start.desc'))
		.addDropdown((dropdown) => {
			dropdown.addOption(
				'locale',
				plugin.t('settings.week-start.locale', {
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
			dropdown.onChange((value) => {
				plugin.settings.pomodoro.weekStart =
					value === 'locale' ? null : parseInt(value);
				void plugin.saveSettings();
			});
		});

	const filesSetting = new Setting(containerEl)
		.setName(plugin.t('settings.files.name'))
		.setDesc(plugin.t('settings.files.desc'))
		.addButton((button) => {
			button.setButtonText(plugin.t('settings.files.add'));
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
					tab.display();
				}).open();
			});
		});

	// 文件列表：作为"文件"设置项内部的子元素（占满整行，不挤掉右侧按钮）
	filesSetting.settingEl.addClass('miyu-setting-files-wrap');
	const fileListEl = filesSetting.settingEl.createDiv({
		cls: 'miyu-setting-files',
	});
	if (plugin.settings.pomodoro.files.length === 0) {
		fileListEl.createDiv({
			cls: 'miyu-setting-files-empty',
			text: plugin.t('settings.files.empty'),
		});
	}
	for (const path of plugin.settings.pomodoro.files) {
		const row = fileListEl.createDiv({ cls: 'miyu-setting-file' });
		row.createSpan({
			cls: 'miyu-setting-file-name',
			text: path,
			attr: { title: path },
		});
		const remove = row.createEl('button', {
			cls: 'miyu-setting-file-remove',
			attr: {
				'aria-label': plugin.t('settings.files.remove'),
			},
		});
		setIcon(remove, 'trash');
		remove.addEventListener('click', () => {
			const p = plugin.settings.pomodoro;
			p.files = p.files.filter((f) => f !== path);
			if (p.activeFile === path) {
				p.activeFile = p.files[0] ?? '';
			}
			void plugin.saveSettings();
			tab.display();
		});
	}

	// --- 记录存储文件（'' = data.json；配置后写该文件的 miyu:records 块） ---
	const recordsFileSetting = new Setting(containerEl)
		.setName(plugin.t('settings.records-file.name'))
		.setDesc(plugin.t('settings.records-file.desc'))
		.addButton((button) => {
			button.setButtonText(plugin.t('settings.records-file.select'));
			button.onClick(() => {
				new FileSuggestModal(plugin.app, (file) => {
					// 单选：重复选择直接覆盖
					plugin.settings.pomodoro.recordsFile = file.path;
					void plugin.saveSettings();
					void reloadStats(plugin);
					tab.display();
				}).open();
			});
		});

	// 当前记录文件列表：设置项内部的子元素（占满整行，不挤掉右侧按钮）
	// 空 = 未设置，使用 data.json
	recordsFileSetting.settingEl.addClass('miyu-setting-files-wrap');
	const recordsFileListEl = recordsFileSetting.settingEl.createDiv({
		cls: 'miyu-setting-files',
	});
	const recordsPath = plugin.settings.pomodoro.recordsFile;
	if (!recordsPath) {
		recordsFileListEl.createDiv({
			cls: 'miyu-setting-files-empty',
			text: plugin.t('settings.records-file.unset'),
		});
	} else {
		const row = recordsFileListEl.createDiv({ cls: 'miyu-setting-file' });
		row.createSpan({
			cls: 'miyu-setting-file-name',
			text: recordsPath,
			attr: { title: recordsPath },
		});
		const remove = row.createEl('button', {
			cls: 'miyu-setting-file-remove',
			attr: { 'aria-label': plugin.t('settings.files.remove') },
		});
		setIcon(remove, 'trash');
		remove.addEventListener('click', () => {
			plugin.settings.pomodoro.recordsFile = '';
			void plugin.saveSettings();
			void reloadStats(plugin);
			tab.display();
		});
	}
}

/** 设置变更后重新加载记录并刷新依赖统计的 UI。 */
async function reloadStats(plugin: MiyuPlugin): Promise<void> {
	await plugin.pomodoro?.stats.load();
	pomodoroSettings.set(plugin.settings.pomodoro);
}
