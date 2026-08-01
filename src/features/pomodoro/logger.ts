import type { PomodoroLog } from '../../types';
import type MiyuPlugin from '../../main';

export function createPomodoroLogger(plugin: MiyuPlugin) {
	return {
		log(task: string, minutes: number) {
			const entry: PomodoroLog = {
				ts: Date.now(),
				task,
				minutes,
			};
			plugin.settings.pomodoro.logs.push(entry);
			void plugin.saveSettings();
		},
		getLogsByMonth(year: number, month: number): PomodoroLog[] {
			return plugin.settings.pomodoro.logs.filter((l) => {
				const d = new Date(l.ts);
				return (
					d.getFullYear() === year && d.getMonth() === month
				);
			});
		},
		getAllLogs(): PomodoroLog[] {
			return [...plugin.settings.pomodoro.logs];
		},
	};
}

export type PomodoroLogger = ReturnType<typeof createPomodoroLogger>;
