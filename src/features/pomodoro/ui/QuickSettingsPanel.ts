import type MiyuPlugin from '../../../main';
import type { Unsubscriber } from '../../../core/store';
import { pomodoroSettings } from '../settings';

/**
 * 面板内快速设置：工作时长 / 休息时长 / 自动开始 / 通知音效。
 * 与统一设置页共享数据（plugin.settings.pomodoro），设置页改动自动反映。
 */
export class QuickSettingsPanel {
	private plugin: MiyuPlugin;

	private root: HTMLElement;

	private workInput: HTMLInputElement;

	private breakInput: HTMLInputElement;

	private goalInput: HTMLInputElement;

	private autostartInput: HTMLInputElement;

	private soundInput: HTMLInputElement;

	private unsubscribers: Unsubscriber[] = [];

	constructor(plugin: MiyuPlugin, container: HTMLElement) {
		this.plugin = plugin;


		this.root = container.createDiv({ cls: 'pomodoro-settings-wrapper' });
		const list = this.root.createDiv({ cls: 'pomodoro-settings-list' });

		this.workInput = this.addNumberRow(
			list,
			plugin.t('mode.work'),
			1,
			120,
			(value) => {
				plugin.settings.pomodoro.workMinutes = value;
				void plugin.saveSettings();
			},
		);

		this.breakInput = this.addNumberRow(
			list,
			plugin.t('mode.break'),
			0,
			60,
			(value) => {
				plugin.settings.pomodoro.breakMinutes = value;
				void plugin.saveSettings();
			},
		);

		this.goalInput = this.addNumberRow(
			list,
			plugin.t('panel.settings.daily-goal'),
			0,
			30,
			(value) => {
				plugin.settings.pomodoro.dailyGoal = value;
				void plugin.saveSettings();
			},
		);

		this.autostartInput = this.addToggleRow(
			list,
			plugin.t('statusbar.autostart'),
			() => plugin.settings.pomodoro.autoStartNext,
			(value) => {
				plugin.settings.pomodoro.autoStartNext = value;
				void plugin.saveSettings();
			},
		);

		this.soundInput = this.addToggleRow(
			list,
			plugin.t('panel.settings.sound'),
			() => plugin.settings.pomodoro.notificationSound,
			(value) => {
				plugin.settings.pomodoro.notificationSound = value;
				void plugin.saveSettings();
			},
		);

		this.syncFromSettings();

		// 外部设置变化（设置页/恢复默认）时同步；聚焦中的输入框不被覆盖
		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.syncFromSettings();
			}),
		);
	}

	private syncFromSettings() {
		const p = this.plugin.settings.pomodoro;
		if (document.activeElement !== this.workInput) {
			this.workInput.value = String(p.workMinutes);
		}
		if (document.activeElement !== this.breakInput) {
			this.breakInput.value = String(p.breakMinutes);
		}
		if (document.activeElement !== this.goalInput) {
			this.goalInput.value = String(p.dailyGoal);
		}
		this.autostartInput.checked = p.autoStartNext;
		this.soundInput.checked = p.notificationSound;
	}

	private addNumberRow(
		list: HTMLElement,
		label: string,
		min: number,
		max: number,
		onCommit: (value: number) => void,
	): HTMLInputElement {
		const item = list.createDiv({ cls: 'pomodoro-settings-item' });
		item.createDiv({ cls: 'pomodoro-settings-label', text: label });
		const control = item.createDiv({ cls: 'pomodoro-settings-control' });
		const input = control.createEl('input', {
			type: 'number',
			attr: { min: String(min), max: String(max) },
		});
		input.addEventListener('change', () => {
			const value = parseInt(input.value);
			if (!isNaN(value) && value >= min && value <= max) {
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

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.root.remove();
	}
}
