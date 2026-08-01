import { WorkspaceLeaf } from 'obsidian';
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

	// Initialize runtime objects
	plugin.timer = new PomodoroTimer(plugin);
	plugin.tracker = new TaskTracker(plugin);

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
	statusEl.addClass('miyu-pomodoro-statusbar');
	statusEl.addClass('miyu-sb-clickable');

	// Show initial state
	renderStatusBar(statusEl, plugin.timer!.getDisplay(), plugin);

	// Click handlers (set once)
	statusEl.onclick = () => plugin.timer?.toggleTimer();
	statusEl.oncontextmenu = (e) => {
		e.preventDefault();
		plugin.timer?.reset();
	};

	// Update on every tick
	plugin.timer!.onTick((display) => {
		renderStatusBar(statusEl, display, plugin);
	});
}

function renderStatusBar(
	el: HTMLElement,
	display: TimerDisplay,
	_plugin: MiyuPlugin,
): void {
	el.empty();
	const emoji = display.mode === 'WORK' ? '🍅' : '🥤';
	const icon = el.createSpan({ cls: 'miyu-sb-icon' });
	icon.setText(emoji);
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
