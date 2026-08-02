import { Menu, setTooltip } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t } from '../../i18n';
import type { Unsubscriber } from '../../core/store';
import Timer, { modeLabel, type TimerStore } from './Timer';
import { pomodoroSettings } from './settings-store';

const ICON_RUNNING = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;

const ICON_IDLE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer-off"><path d="M10 2h4"/><path d="M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7"/><path d="M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2"/><path d="m2 2 20 20"/><path d="M12 12v-2"/></svg>`;

/**
 * Status bar timer item. Left-click toggles the timer, right-click opens a
 * context menu (pause/resume, reset, switch mode, autostart, sound).
 * Visible only while `useStatusBarTimer` is enabled.
 */
export class StatusBarTimer {
	private plugin: MiyuPlugin;

	private timer: Timer;

	private el: HTMLElement;

	private icon: HTMLElement;

	private text: HTMLElement;

	private current!: TimerStore;

	private unsubscribers: Unsubscriber[] = [];

	constructor(plugin: MiyuPlugin, timer: Timer, container: HTMLElement) {
		this.plugin = plugin;
		this.timer = timer;

		this.el = container.createSpan({ cls: 'miyu-timer' });
		this.icon = this.el.createSpan({
			cls: 'item-icon',
		});
		this.icon.setCssProps({ marginRight: '3px' });
		this.text = this.el.createSpan();

		this.el.addEventListener('click', () => {
			this.timer.toggleTimer();
		});
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showMenu(e);
		});

		this.unsubscribers.push(
			this.timer.subscribe((state) => {
				this.current = state;
				this.icon.innerHTML = state.running ? ICON_RUNNING : ICON_IDLE;
				this.text.setText(state.remained.human);
				const tooltip = modeLabel(
					state.mode,
					this.plugin.settings.language,
				);
				setTooltip(this.el, tooltip, {
					delay: 300,
					placement: 'top',
				});
				this.refreshVisibility();
			}),
		);

		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.refreshVisibility();
			}),
		);
	}

	private refreshVisibility() {
		this.el.style.display = this.plugin.settings.useStatusBarTimer
			? ''
			: 'none';
	}

	private showMenu(e: MouseEvent) {
		const plugin = this.plugin;
		const locale = plugin.settings.language;
		const state = this.current;
		const menu = new Menu();
		menu.addItem((item) => {
			const label = state.running
				? t('statusbar.pause', locale)
				: state.inSession
					? t('statusbar.resume', locale)
					: t('statusbar.start', locale);
			item.setTitle(label).onClick(() => {
				this.timer.toggleTimer();
			});
		});

		menu.addItem((item) => {
			item.setTitle(t('statusbar.reset', locale)).onClick(() => {
				this.timer.reset();
			});
		});

		menu.addItem((item) => {
			const isWork = state.mode === 'WORK';
			item.setTitle(
				t('statusbar.switch-mode', locale, {
					mode: modeLabel(isWork ? 'BREAK' : 'WORK', locale),
				}),
			).onClick(() => {
				this.timer.toggleMode();
			});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle(t('statusbar.autostart', locale));
			item.setChecked(plugin.settings.autostart);
			item.onClick(async () => {
				plugin.settings.autostart = !plugin.settings.autostart;
				await plugin.saveSettings();
			});
		});

		menu.addItem((item) => {
			item.setTitle(t('statusbar.sound', locale));
			item.setChecked(plugin.settings.notificationSound);
			item.onClick(async () => {
				plugin.settings.notificationSound =
					!plugin.settings.notificationSound;
				await plugin.saveSettings();
			});
		});

		menu.showAtMouseEvent(e);
	}

	public destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.el.remove();
	}
}
