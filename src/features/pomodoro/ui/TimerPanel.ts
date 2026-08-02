import type { ItemView } from 'obsidian';
import type MiyuPlugin from '../../../main';
import { t } from '../../../i18n';
import type { Unsubscriber } from '../../../core/store';
import Timer, { modeLabel, type TimerStore } from '../Timer';
import { TasksPanel } from './TasksPanel';
import { TimerSettingsPanel } from './TimerSettingsPanel';

const ICON_LIST_TODO = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-todo"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`;

const ICON_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

const ICON_PAUSE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>`;

const ICON_RESET = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>`;

const CIRCLE_RADIUS = 69.85699;
const CIRCLE_OFFSET = 440;

type ExtraPanel = 'tasks' | 'settings' | 'close';

/**
 * Timer panel shown in the `timer-view` sidebar leaf.
 * Vanilla-TS port of the original TimerViewComponent.svelte.
 */
export class TimerPanel {
	private plugin: MiyuPlugin;

	private timer: Timer;

	private root: HTMLElement;

	private statusEl: HTMLElement;

	private breathEl: HTMLElement;

	private modeEl: HTMLElement;

	private timerTextEl: HTMLElement;

	private progressCircle: SVGCircleElement;

	private playBtn: HTMLElement;

	private tasksArea: HTMLElement;

	private settingsArea: HTMLElement;

	private tasksPanel: TasksPanel | null = null;

	private settingsPanel: TimerSettingsPanel | null = null;

	private extra: ExtraPanel = 'tasks';

	private unsubscribers: Unsubscriber[] = [];

	constructor(
		plugin: MiyuPlugin,
		container: HTMLElement,
		view: ItemView,
	) {
		this.plugin = plugin;
		this.timer = plugin.pomodoro!.timer;
		const locale = plugin.settings.language;

		this.root = container.createDiv({ cls: 'pomodoro-container' });

		const main = this.root.createDiv({ cls: 'pomodoro-main' });

		const ring = main.createDiv({ cls: 'pomodoro-ring' });

		// NOTE: innerHTML replaces all children — set it FIRST, then build
		// the absolutely-positioned display overlay on top of the svg.
		ring.innerHTML = `<svg class="pomodoro-ring-svg" width="160" height="160" xmlns="http://www.w3.org/2000/svg"><g><circle class="pomodoro-circle-track" r="${CIRCLE_RADIUS}" cy="81" cx="81" stroke-width="2" fill="none"/><circle class="pomodoro-circle-progress" r="${CIRCLE_RADIUS}" cy="81" cx="81" stroke-width="8" fill="none"/></g></svg>`;
		this.progressCircle = ring.querySelector(
			'.pomodoro-circle-progress',
		) as SVGCircleElement;
		this.progressCircle.style.strokeDasharray = String(CIRCLE_OFFSET);
		this.progressCircle.style.strokeDashoffset = String(CIRCLE_OFFSET);

		const display = ring.createDiv({ cls: 'pomodoro-timer-display' });

		this.statusEl = display.createDiv({
			cls: 'pomodoro-status pomodoro-control',
		});
		this.breathEl = this.statusEl.createSpan({ cls: 'breath' });
		this.modeEl = this.statusEl.createSpan({ cls: 'mode' });
		this.statusEl.createSpan();
		this.statusEl.addEventListener('click', () => {
			this.timer.toggleMode();
		});

		const textControl = display.createDiv({ cls: 'pomodoro-control' });
		this.timerTextEl = textControl.createDiv({ cls: 'pomodoro-timer-text' });
		textControl.addEventListener('click', () => {
			this.timer.toggleTimer();
		});

		const controls = main.createDiv({ cls: 'pomodoro-controls' });

		const tasksBtn = controls.createDiv({
			cls: 'pomodoro-control',
			attr: { 'aria-label': t('panel.tasks', locale) },
		});
		tasksBtn.innerHTML = ICON_LIST_TODO;
		tasksBtn.addEventListener('click', () => {
			this.toggleExtra('tasks');
		});

		this.playBtn = controls.createDiv({
			cls: 'pomodoro-control',
			attr: { 'aria-label': t('panel.start', locale) },
		});
		this.playBtn.addEventListener('click', () => {
			this.timer.toggleTimer();
		});

		const resetBtn = controls.createDiv({
			cls: 'pomodoro-control',
			attr: { 'aria-label': t('panel.reset', locale) },
		});
		resetBtn.innerHTML = ICON_RESET;
		resetBtn.addEventListener('click', () => {
			this.timer.reset();
		});

		const settingsBtn = controls.createDiv({
			cls: 'pomodoro-control',
			attr: { 'aria-label': t('panel.settings', locale) },
		});
		settingsBtn.innerHTML = ICON_SETTINGS;
		settingsBtn.addEventListener('click', () => {
			this.toggleExtra('settings');
		});

		this.tasksArea = this.root.createDiv({ cls: 'pomodoro-extra' });
		this.settingsArea = this.root.createDiv({ cls: 'pomodoro-extra' });
		this.tasksPanel = new TasksPanel(plugin, this.tasksArea, view);
		this.settingsPanel = new TimerSettingsPanel(plugin, this.settingsArea);
		this.updateExtraVisibility();

		this.unsubscribers.push(
			this.timer.subscribe((state) => {
				this.renderState(state);
			}),
		);
	}

	private renderState(state: TimerStore) {
		const locale = this.plugin.settings.language;
		this.timerTextEl.setText(state.remained.human);
		this.modeEl.setText(modeLabel(state.mode, locale));
		this.breathEl.style.display = state.running ? '' : 'none';
		this.playBtn.innerHTML = state.running ? ICON_PAUSE : ICON_PLAY;
		this.playBtn.setAttribute(
			'aria-label',
			t(state.running ? 'panel.pause' : 'panel.start', locale),
		);
		const offset =
			state.count > 0
				? (state.remained.millis / state.count) * CIRCLE_OFFSET
				: CIRCLE_OFFSET;
		this.progressCircle.style.strokeDashoffset = String(offset);
	}

	private toggleExtra(value: 'tasks' | 'settings') {
		this.extra = this.extra === value ? 'close' : value;
		this.updateExtraVisibility();
	}

	private updateExtraVisibility() {
		this.tasksArea.setCssProps({
			display: this.extra === 'tasks' ? '' : 'none',
		});
		this.settingsArea.setCssProps({
			display: this.extra === 'settings' ? '' : 'none',
		});
	}

	public destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.tasksPanel?.destroy();
		this.settingsPanel?.destroy();
		this.root.remove();
	}
}
