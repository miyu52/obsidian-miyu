import { Plugin } from 'obsidian';
import {
	MiyuSettings,
	MiyuSettingTab,
	normalizeSettings,
} from './settings';
import { t, type I18nKey } from './i18n';
import type { MiyuFeature } from './features/types';
import { randomFileFeature } from './features/random-file';
import { pomodoroFeature, type PomodoroManager } from './features/pomodoro';

/** 全部功能模块（注册表驱动：init → registerCommands → destroy）。 */
const FEATURES: MiyuFeature[] = [randomFileFeature, pomodoroFeature];

export default class MiyuPlugin extends Plugin {
	settings!: MiyuSettings;
	/** Exposed so the settings tab can re-render on language change. */
	settingTab!: MiyuSettingTab;
	/** Pomodoro feature state (created by the feature's init). */
	pomodoro?: PomodoroManager;
	/** 设置变化订阅者（saveSettings 后逐个通知）。 */
	private _settingsChanged = new Set<() => void>();
	/** Tracked command IDs for re-registration on language change. */
	private _featureCommandIds: string[] = [];

	/** 按当前语言翻译（用户可见字符串的统一入口）。 */
	t(key: I18nKey, vars?: Record<string, string>): string {
		return t(key, this.settings.language, vars);
	}

	/** 订阅设置变化（saveSettings 之后触发），返回退订函数。 */
	onSettingsChanged(cb: () => void): () => void {
		this._settingsChanged.add(cb);
		return () => {
			this._settingsChanged.delete(cb);
		};
	}

	async onload() {
		this.settings = normalizeSettings(
			(await this.loadData()) as Partial<MiyuSettings> | null,
		);

		this.settingTab = new MiyuSettingTab(this.app, this, FEATURES);
		this.addSettingTab(this.settingTab);

		for (const feature of FEATURES) {
			feature.init?.(this);
		}
		this._registerFeatures();
	}

	onunload() {
		for (const feature of FEATURES) {
			feature.destroy?.(this);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		for (const cb of this._settingsChanged) {
			cb();
		}
	}

	/**
	 * Re-register all feature commands (e.g. after language change).
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
		for (const feature of FEATURES) {
			this._featureCommandIds.push(...feature.registerCommands(this));
		}
	}
}
