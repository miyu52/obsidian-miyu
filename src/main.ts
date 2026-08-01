import { Plugin } from 'obsidian';
import {
	MiyuSettings,
	MiyuSettingTab,
	DEFAULT_SETTINGS,
} from './settings';
import { registerRandomFileFeature } from './features/random-file';

export default class MiyuPlugin extends Plugin {
	settings!: MiyuSettings;
	/** Exposed so the settings tab can re-render on language change. */
	settingTab!: MiyuSettingTab;
	/** Tracked command IDs for re-registration on language change. */
	private _featureCommandIds: string[] = [];

	async onload() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MiyuSettings>,
		);

		this.settingTab = new MiyuSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		this._registerFeatures();
	}

	onunload() {}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Re-register all features (e.g. after language change).
	 * Removes existing command registrations first.
	 */
	reloadFeatures(): void {
		for (const id of this._featureCommandIds) {
			this.removeCommand(id);
		}
		this._featureCommandIds = [];
		this._registerFeatures();
	}

	/** Internal: register all feature commands. */
	private _registerFeatures(): void {
		this._featureCommandIds.push(
			...registerRandomFileFeature(this),
		);
	}
}
