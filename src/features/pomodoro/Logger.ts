import { Notice, TFile, moment } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t } from '../../i18n';
import type { TimerState, Mode } from './Timer';
import type { TaskItem } from './Tasks';
import * as utils from './task-utils';
import { getDailyNoteFile, getWeeklyNoteFile } from './daily-notes';

export type TimerLog = {
	duration: number;
	begin: number;
	end: number;
	mode: Mode;
	session: number;
	task: TaskLog;
	finished: boolean;
};

export type TaskLog = Pick<
	TaskItem,
	| 'fileName'
	| 'path'
	| 'name'
	| 'text'
	| 'description'
	| 'blockLink'
	| 'actual'
	| 'expected'
	| 'status'
	| 'checked'
	| 'created'
	| 'start'
	| 'scheduled'
	| 'due'
	| 'done'
	| 'cancelled'
	| 'priority'
	| 'recurrence'
	| 'tags'
>;

export type LogContext = TimerState & { task: TaskItem };

export default class Logger {
	private plugin: MiyuPlugin;

	constructor(plugin: MiyuPlugin) {
		this.plugin = plugin;
	}

	public async log(ctx: LogContext): Promise<TFile | void> {
		const logFile = await this.resolveLogFile(ctx);
		const log = this.createLog(ctx);
		if (logFile) {
			const logText = await this.toText(log, logFile);
			if (logText) {
				await this.plugin.app.vault.append(logFile, `\n${logText}`);
			}
		}

		return logFile;
	}

	private async resolveLogFile(ctx: LogContext): Promise<TFile | void> {
		const settings = this.plugin.settings;

		// filter log level
		if (settings.logLevel !== 'ALL' && settings.logLevel !== ctx.mode) {
			return;
		}

		// focused file has the highest priority
		if (
			settings.logFocused &&
			ctx.task.path &&
			ctx.task.path.endsWith('md')
		) {
			const file = this.plugin.app.vault.getAbstractFileByPath(
				ctx.task.path,
			);
			if (file && file instanceof TFile) {
				return file;
			}
			// fall-through
		}

		if (settings.logFile === 'NONE') {
			return;
		}

		// use daily note
		if (settings.logFile === 'DAILY') {
			return (await getDailyNoteFile(this.plugin.app)) ?? undefined;
		}

		// use weekly note
		if (settings.logFile == 'WEEKLY') {
			return (await getWeeklyNoteFile(this.plugin.app)) ?? undefined;
		}

		// log to file
		if (settings.logFile === 'FILE') {
			if (settings.logPath) {
				let path = settings.logPath;
				if (!path.endsWith('md')) {
					path += '.md';
				}
				try {
					return await utils.ensureFileExists(this.plugin.app, path);
				} catch (error) {
					if (error instanceof Error) {
						new Notice(error.message);
					}
					return;
				}
			}
		}
	}

	private createLog(ctx: LogContext): TimerLog {
		const end = new Date().getTime();
		const begin = ctx.sessionStart ?? ctx.startTime ?? end;
		return {
			mode: ctx.mode,
			duration: Math.max(1, Math.floor((end - begin) / 60000)),
			begin,
			end,
			session: ctx.duration,
			task: ctx.task,
			finished: ctx.count > 0 && ctx.elapsed >= ctx.count,
		};
	}

	private async toText(log: TimerLog, file: TFile): Promise<string> {
		const settings = this.plugin.settings;
		if (
			settings.logFormat === 'CUSTOM' &&
			utils.getTemplater(this.plugin.app)
		) {
			// use templater
			try {
				return await utils.parseWithTemplater(
					this.plugin.app,
					file,
					settings.logTemplate,
					log,
				);
			} catch (e) {
				new Notice(
					t(
						'notice.invalid-template',
						this.plugin.settings.language,
					),
				);
				console.error('invalid templater:', e);
				return '';
			}
		} else {
			// Built-in log: ignore unfinished session
			if (!log.finished) {
				return '';
			}

			let begin = moment(log.begin);
			let end = moment(log.end);
			if (settings.logFormat === 'SIMPLE') {
				return `**${log.mode}(${log.duration}m)**: ${begin.format(
					'HH:mm',
				)} - ${end.format('HH:mm')}`;
			}

			if (settings.logFormat === 'VERBOSE') {
				const emoji = log.mode == 'WORK' ? '🍅' : '🥤';
				return `- ${emoji} (pomodoro::${log.mode}) (duration:: ${
					log.duration
				}m) (begin:: ${begin.format(
					'YYYY-MM-DD HH:mm',
				)}) - (end:: ${end.format('YYYY-MM-DD HH:mm')})`;
			}

			return '';
		}
	}
}
