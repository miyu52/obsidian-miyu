import type MiyuPlugin from '../../../main';
import { t } from '../../../i18n';
import type { Unsubscriber } from '../../../core/store';
import { pomodoroSettings } from '../settings-store';

/**
 * Quick settings shown inside the timer view (work/break lengths, autostart,
 * sound, log destination). Vanilla-TS port of the original
 * TimerSettingsComponent.svelte — everything lives in the unified settings
 * tab too; this panel is just for fast access.
 */
export class TimerSettingsPanel {
	private plugin: MiyuPlugin;

	private root: HTMLElement;

	private workInput: HTMLInputElement;

	private breakInput: HTMLInputElement;

	private autostartInput: HTMLInputElement;

	private soundInput: HTMLInputElement;

	private logFocusedInput: HTMLInputElement;

	private unsubscribers: Unsubscriber[] = [];

	constructor(plugin: MiyuPlugin, container: HTMLElement) {
		this.plugin = plugin;
		const locale = plugin.settings.language;

		this.root = container.createDiv({ cls: 'pomodoro-settings-wrapper' });
		const list = this.root.createDiv({ cls: 'pomodoro-settings-list' });

		this.workInput = this.addNumberRow(
			list,
			t('mode.work', locale),
			1,
			(value) => {
				plugin.settings.workLen = value;
				void plugin.saveSettings();
			},
		);

		this.breakInput = this.addNumberRow(
			list,
			t('mode.break', locale),
			0,
			(value) => {
				plugin.settings.breakLen = value;
				void plugin.saveSettings();
			},
		);

		this.autostartInput = this.addToggleRow(
			list,
			t('statusbar.autostart', locale),
			() => plugin.settings.autostart,
			(value) => {
				plugin.settings.autostart = value;
				void plugin.saveSettings();
			},
		);

		this.soundInput = this.addToggleRow(
			list,
			t('panel.settings.sound', locale),
			() => plugin.settings.notificationSound,
			(value) => {
				plugin.settings.notificationSound = value;
				void plugin.saveSettings();
			},
		);

		this.logFocusedInput = this.addToggleRow(
			list,
			t('panel.settings.log-focused', locale),
			() => plugin.settings.logFocused,
			(value) => {
				plugin.settings.logFocused = value;
				void plugin.saveSettings();
			},
		);

		this.syncFromSettings();

		// Reflect external settings changes (e.g. settings tab, restore
		// defaults). Skip focused inputs so typing isn't clobbered.
		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.syncFromSettings();
			}),
		);
	}

	private syncFromSettings() {
		const s = this.plugin.settings;
		if (document.activeElement !== this.workInput) {
			this.workInput.value = String(s.workLen);
		}
		if (document.activeElement !== this.breakInput) {
			this.breakInput.value = String(s.breakLen);
		}
		this.autostartInput.checked = s.autostart;
		this.soundInput.checked = s.notificationSound;
		this.logFocusedInput.checked = s.logFocused;
	}

	private addNumberRow(
		list: HTMLElement,
		label: string,
		min: number,
		onCommit: (value: number) => void,
	): HTMLInputElement {
		const item = list.createDiv({ cls: 'pomodoro-settings-item' });
		item.createDiv({ cls: 'pomodoro-settings-label', text: label });
		const control = item.createDiv({ cls: 'pomodoro-settings-control' });
		const input = control.createEl('input', {
			type: 'number',
			attr: { min: String(min) },
		});
		input.addEventListener('change', () => {
			const value = parseInt(input.value);
			if (value >= min) {
				onCommit(value);
			} else {
				this.syncFromSettings();
			}
		});
		return input;
	}

	private addToggleRow(
		list: HTMLElement,
		label: string,
		get: () => boolean,
		onCommit: (value: boolean) => void,
	): HTMLInputElement {
		const item = list.createDiv({ cls: 'pomodoro-settings-item' });
		item.createDiv({ cls: 'pomodoro-settings-label', text: label });
		const control = item.createDiv({ cls: 'pomodoro-settings-control' });
		const input = control.createEl('input', { type: 'checkbox' });
		input.checked = get();
		input.addEventListener('change', () => {
			onCommit(input.checked);
		});
		return input;
	}

	public destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.root.remove();
	}
}
