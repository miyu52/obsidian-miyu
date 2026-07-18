import { Plugin } from 'obsidian';
import { MiyuSettings, MiyuSettingTab, DEFAULT_SETTINGS } from './settings';
import { registerRandomFileFeature } from './features/random-file';

export default class MiyuPlugin extends Plugin {
	settings!: MiyuSettings;

	async onload() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MiyuSettings>,
		);

		this.addSettingTab(new MiyuSettingTab(this.app, this));

		registerRandomFileFeature(this);
	}

	onunload() {}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
