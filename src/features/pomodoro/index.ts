import { WorkspaceLeaf, Menu, setTooltip } from 'obsidian';
import type MiyuPlugin from '../../main';
import type { TimerDisplay } from '../../types';
import { PomodoroTimer } from './timer';
import { TaskTracker } from './task-tracker';
import { PomodoroView, POMODORO_VIEW_TYPE } from './view';
import { t } from '../../i18n';

/** Register all pomodoro feature commands, views, and initialize runtime objects. */
export function registerPomodoroFeature(plugin: MiyuPlugin): string[] {
	const locale = plugin.settings.language;
	const i18n = (key: string, vars?: Record<string, string>) =>
		t(key, locale, vars);

	// Initialize runtime objects (only once, not on reload)
	if (!plugin.timer) {
		plugin.timer = new PomodoroTimer(plugin);
	}
	if (!plugin.tracker) {
		plugin.tracker = new TaskTracker(plugin);
	}

	// Register custom view
	plugin.registerView(POMODORO_VIEW_TYPE, (leaf) => {
		return new PomodoroView(plugin, leaf);
	});

	// Ribbon icon to toggle panel
	plugin.addRibbonIcon('timer', 'Toggle pomodoro panel', () => {
		const { workspace } = plugin.app;
		const leaves = workspace.getLeavesOfType(POMODORO_VIEW_TYPE);
		if (leaves.length > 0) {
			workspace.detachLeavesOfType(POMODORO_VIEW_TYPE);
		} else {
			void activateView(plugin);
		}
	});

	// Status bar timer
	setupStatusBar(plugin);

	// Commands
	plugin.addCommand({
		id: 'toggle-pomodoro-timer',
		name: i18n('command.toggle-timer'),
		callback: () => {
			plugin.timer?.toggleTimer();
		},
	});

	plugin.addCommand({
		id: 'toggle-pomodoro-panel',
		name: i18n('command.toggle-timer-panel'),
		callback: () => {
			const { workspace } = plugin.app;
			const leaves = workspace.getLeavesOfType(POMODORO_VIEW_TYPE);
			if (leaves.length > 0) {
				workspace.detachLeavesOfType(POMODORO_VIEW_TYPE);
			} else {
			void activateView(plugin);
			}
		},
	});

	plugin.addCommand({
		id: 'reset-pomodoro-timer',
		name: i18n('command.reset-timer'),
		callback: () => {
			plugin.timer?.reset();
		},
	});

	return [
		'toggle-pomodoro-timer',
		'toggle-pomodoro-panel',
		'reset-pomodoro-timer',
	];
}

function setupStatusBar(plugin: MiyuPlugin): void {
	if (!plugin.settings.pomodoro.showStatusBar) return;

	const statusEl = plugin.addStatusBarItem();
	statusEl.addClass('mod-clickable');

	let currentMode = plugin.timer!.getDisplay().mode;

	// Update tooltip on mode change
	const updateTooltip = (display: TimerDisplay) => {
		if (display.mode !== currentMode) {
			currentMode = display.mode;
			setTooltip(statusEl, currentMode === 'WORK' ? 'Work' : 'Break', {
				delay: 300,
				placement: 'top',
			});
		}
	};

	// Initial render
	renderStatusBar(statusEl, plugin.timer!.getDisplay());
	updateTooltip(plugin.timer!.getDisplay());

	// Left click: toggle timer
	statusEl.addEventListener('click', () => {
		plugin.timer?.toggleTimer();
	});

	// Right click: context menu
	statusEl.addEventListener('contextmenu', (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const timer = plugin.timer!;
		const display = timer.getDisplay();
		const menu = new Menu();

		// Start/Pause/Resume
		const actionLabel = display.running
			? 'Pause'
			: display.sessionStarted
				? 'Resume'
				: 'Start';
		menu.addItem((item) => {
			item.setTitle(actionLabel).onClick(() => timer.toggleTimer());
		});

		// Reset
		menu.addItem((item) => {
			item.setTitle('Reset').onClick(() => timer.reset());
		});

		// Switch mode
		const switchLabel =
			display.mode === 'WORK' ? 'Switch to Break' : 'Switch to Work';
		menu.addItem((item) => {
			item.setTitle(switchLabel).onClick(() => timer.toggleMode());
		});

		menu.addSeparator();

		// Auto-start toggle
		menu.addItem((item) => {
			item
				.setTitle('Auto-start')
				.setChecked(plugin.settings.pomodoro.autoStart)
				.onClick(async () => {
					plugin.settings.pomodoro.autoStart =
						!plugin.settings.pomodoro.autoStart;
					await plugin.saveSettings();
				});
		});

		// Sound toggle
		menu.addItem((item) => {
			item
				.setTitle('Sound')
				.setChecked(plugin.settings.pomodoro.notificationSound)
				.onClick(async () => {
					plugin.settings.pomodoro.notificationSound =
						!plugin.settings.pomodoro.notificationSound;
					await plugin.saveSettings();
				});
		});

		menu.showAtMouseEvent(e);
	});

	// Subscribe to timer ticks
	plugin.timer!.onTick((display) => {
		renderStatusBar(statusEl, display);
		updateTooltip(display);
	});
}

function renderStatusBar(
	el: HTMLElement,
	display: TimerDisplay,
): void {
	el.empty();
	const icon = el.createSpan({ cls: 'miyu-sb-icon' });
	icon.setText(display.mode === 'WORK' ? '🍅' : '🥤');
	const time = el.createSpan({ cls: 'miyu-sb-time' });
	time.setText(display.remainedHuman);
}

async function activateView(plugin: MiyuPlugin): Promise<void> {
	const { workspace } = plugin.app;
	let leaf: WorkspaceLeaf | undefined =
		workspace.getLeavesOfType(POMODORO_VIEW_TYPE)[0];

	if (!leaf) {
		const rightLeaf = workspace.getRightLeaf(false);
		if (rightLeaf) {
			await rightLeaf.setViewState({
				type: POMODORO_VIEW_TYPE,
				active: true,
			});
			leaf = rightLeaf;
		}
	}

	if (leaf) {
		void workspace.revealLeaf(leaf);
	}
}
