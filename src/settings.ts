import { App, PluginSettingTab, Setting } from 'obsidian';
import type MiyuPlugin from './main';
import { type Locale } from './i18n';
import type { MiyuFeature } from './features/types';
import {
	DEFAULT_POMODORO_SETTINGS,
	normalizePomodoroSettings,
	type PomodoroSettings,
} from './features/pomodoro/settings';
import { deepMerge } from './utils';

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
 * 合并持久化的设置与默认值（深合并、数组克隆）：
 * 浅合并会让后新增的嵌套键变成 undefined，且数组共享引用
 * 会被运行时的突变污染模块级默认值。
 */
export function normalizeSettings(
	loaded: Partial<MiyuSettings> | null,
): MiyuSettings {
	return {
		language: loaded?.language ?? DEFAULT_SETTINGS.language,
		randomFile: deepMerge(DEFAULT_SETTINGS.randomFile, loaded?.randomFile),
		pomodoro: normalizePomodoroSettings(loaded?.pomodoro),
	};
}

export class MiyuSettingTab extends PluginSettingTab {
	plugin: MiyuPlugin;
	/** 设置小节按功能模块渲染（language 之外全部由 feature 提供）。 */
	private features: MiyuFeature[];

	constructor(app: App, plugin: MiyuPlugin, features: MiyuFeature[]) {
		super(app, plugin);
		this.plugin = plugin;
		this.features = features;
	}

	display(): void {
		const { containerEl } = this;
		const plugin = this.plugin;
		containerEl.empty();
		// 限定作用域的类：设置解释的换行样式只作用于本插件设置页
		containerEl.addClass('miyu-settings');

		// --- Language ---
		new Setting(containerEl)
			.setName(plugin.t('settings.language.name'))
			.setDesc(plugin.t('settings.language.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('zh-CN', '简体中文')
					.addOption('en', 'English')
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

		// --- Feature sections ---
		for (const feature of this.features) {
			feature.renderSettings?.(plugin, containerEl, this);
		}
	}
}
