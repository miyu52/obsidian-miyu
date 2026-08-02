import { Plugin } from 'obsidian';
import {
	MiyuSettings,
	MiyuSettingTab,
	normalizeSettings,
} from './settings';
import { registerRandomFileFeature } from './features/random-file';
import {
	registerPomodoroFeature,
	type PomodoroManager,
} from './features/pomodoro';

export default class MiyuPlugin extends Plugin {
	settings!: MiyuSettings;
	/** Exposed so the settings tab can re-render on language change. */
	settingTab!: MiyuSettingTab;
	/** Pomodoro feature state (created on first feature registration). */
	pomodoro?: PomodoroManager;
	/**
	 * Hook invoked after every `saveSettings()`. Features assign this to react
	 * to settings changes (e.g. update reactive mirrors, refresh UI).
	 * Only one hook can be set — a feature must chain if it needs more.
	 */
	onSettingsChanged?: () => void;
	/** Tracked command IDs for re-registration on language change. */
	private _featureCommandIds: string[] = [];

	async onload() {
		this.settings = normalizeSettings(
			(await this.loadData()) as Partial<MiyuSettings> | null,
		);

		this.settingTab = new MiyuSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		this._registerFeatures();
	}

	onunload() {
		this.pomodoro?.destroy();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.onSettingsChanged?.();
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
		this._featureCommandIds.push(...registerRandomFileFeature(this));
		this._featureCommandIds.push(...registerPomodoroFeature(this));
	}
}
