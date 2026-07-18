import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type MiyuPlugin from './main';

export interface MiyuSettings {
	randomLength: number;
	randomUppercase: boolean;
	randomLowercase: boolean;
	randomNumbers: boolean;
	randomSymbols: boolean;
}

export const DEFAULT_SETTINGS: MiyuSettings = {
	randomLength: 8,
	randomUppercase: true,
	randomLowercase: false,
	randomNumbers: true,
	randomSymbols: false,
};

export class MiyuSettingTab extends PluginSettingTab {
	plugin: MiyuPlugin;

	constructor(app: App, plugin: MiyuPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Random file name' });

		new Setting(containerEl)
			.setName('Length')
			.setDesc('Number of characters in the random string (1–64)')
			.addSlider((slider) =>
				slider
					.setLimits(1, 64, 1)
					.setValue(this.plugin.settings.randomLength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.randomLength = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Uppercase letters')
			.setDesc('Include A–Z')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.randomUppercase)
					.onChange(async (value) => {
						this.plugin.settings.randomUppercase = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Lowercase letters')
			.setDesc('Include a–z')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.randomLowercase)
					.onChange(async (value) => {
						this.plugin.settings.randomLowercase = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Numbers')
			.setDesc('Include 0–9')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.randomNumbers)
					.onChange(async (value) => {
						this.plugin.settings.randomNumbers = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Symbols')
			.setDesc('Include ! @ # $ % ^ & ( ) - _ [ ] { } + =')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.randomSymbols)
					.onChange(async (value) => {
						this.plugin.settings.randomSymbols = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
