import { App, PluginSettingTab, Setting } from 'obsidian';
import type MiyuPlugin from './main';
import { t, type Locale } from './i18n';

export interface MiyuSettings {
	language: Locale;
	randomLength: number;
	randomUppercase: boolean;
	randomLowercase: boolean;
	randomNumbers: boolean;
	randomSymbols: boolean;
}

export const DEFAULT_SETTINGS: MiyuSettings = {
	language: 'en',
	randomLength: 8,
	randomUppercase: true,
	randomLowercase: false,
	randomNumbers: true,
	randomSymbols: false,
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
	}
}
