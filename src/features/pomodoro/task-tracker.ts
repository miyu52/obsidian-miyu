import { TFile } from 'obsidian';
import type MiyuPlugin from '../../main';
import type { PomodoroTask } from '../../types';
import { writePomodoroCount } from './task-parser';

/**
 * Tracks the currently active task for pomodoro timing.
 * Handles activating tasks and incrementing their 🍅 actual counter.
 */
export class TaskTracker {
	private plugin: MiyuPlugin;

	constructor(plugin: MiyuPlugin) {
		this.plugin = plugin;
	}

	/** Get the currently active task from persisted settings. */
	getActive() {
		return this.plugin.settings.pomodoro.activeTask;
	}

	/** Activate a task for tracking. Persists to settings. */
	activate(task: PomodoroTask, filePath: string): void {
		this.plugin.settings.pomodoro.activeTask = {
			filePath,
			description: task.description,
			line: task.line,
			actual: task.actual,
			expected: task.expected,
		};
		void this.plugin.saveSettings();
	}

	/** Clear the active task. */
	clear(): void {
		this.plugin.settings.pomodoro.activeTask = null;
		void this.plugin.saveSettings();
	}

	/** Increment the actual pomodoro count for the active task. */
	async incrementActual(): Promise<void> {
		const active = this.plugin.settings.pomodoro.activeTask;
		if (!active) return;

		const newActual = active.actual + 1;
		active.actual = newActual;

		// Update the markdown file
		const file =
			this.plugin.app.vault.getAbstractFileByPath(active.filePath);
		if (file instanceof TFile) {
			try {
				await writePomodoroCount(
					file,
					active.line,
					newActual,
					active.expected,
					this.plugin.app.vault,
				);
			} catch {
				// If writing fails, still keep the in-memory state
			}
		}

		void this.plugin.saveSettings();
	}

	/** Get the task file as TFile, or null. */
	getTaskFile(filePath: string): TFile | null {
		const f =
			this.plugin.app.vault.getAbstractFileByPath(filePath);
		return f instanceof TFile ? f : null;
	}
}
