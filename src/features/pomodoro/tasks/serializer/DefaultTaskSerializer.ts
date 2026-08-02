import { moment } from 'obsidian';
import type { Moment } from 'moment';
import { extractHashtags, toInlineFieldRegex } from '../line-utils';
import type { TaskDetails, TaskDeserializer } from '.';
import { Priority, TaskRegularExpressions } from './TaskModels';

/* Interface describing the symbols that {@link DefaultTaskSerializer}
 * uses to serialize and deserialize tasks.
 */
export interface DefaultTaskSerializerSymbols {
	readonly prioritySymbols: {
		Highest: string;
		High: string;
		Medium: string;
		Low: string;
		Lowest: string;
		None: string;
	};
	readonly startDateSymbol: string;
	readonly createdDateSymbol: string;
	readonly scheduledDateSymbol: string;
	readonly dueDateSymbol: string;
	readonly doneDateSymbol: string;
	readonly cancelledDateSymbol: string;
	readonly recurrenceSymbol: string;
	readonly pomodorosSymbol: string;
	readonly TaskFormatRegularExpressions: {
		priorityRegex: RegExp;
		startDateRegex: RegExp;
		createdDateRegex: RegExp;
		scheduledDateRegex: RegExp;
		dueDateRegex: RegExp;
		doneDateRegex: RegExp;
		cancelledDateRegex: RegExp;
		recurrenceRegex: RegExp;
		pomodorosRegex: RegExp;
	};
}

/**
 * A symbol map for obsidian-task's default task style.
 * Uses emojis to concisely convey meaning.
 */
export const DEFAULT_SYMBOLS: DefaultTaskSerializerSymbols = {
	prioritySymbols: {
		Highest: '🔺',
		High: '⏫',
		Medium: '🔼',
		Low: '🔽',
		Lowest: '⏬',
		None: '',
	},
	startDateSymbol: '🛫',
	createdDateSymbol: '➕',
	scheduledDateSymbol: '⏳',
	dueDateSymbol: '📅',
	doneDateSymbol: '✅',
	cancelledDateSymbol: '❌',
	recurrenceSymbol: '🔁',
	pomodorosSymbol: '🍅::',
	TaskFormatRegularExpressions: {
		// The following regex's end with `$` because they will be matched and
		// removed from the end until none are left.
		priorityRegex: /([🔺⏫🔼🔽⏬])$/u,
		startDateRegex: /🛫 *(\d{4}-\d{2}-\d{2})$/u,
		createdDateRegex: /➕ *(\d{4}-\d{2}-\d{2})$/u,
		scheduledDateRegex: /[⏳⌛] *(\d{4}-\d{2}-\d{2})$/u,
		dueDateRegex: /[📅📆🗓] *(\d{4}-\d{2}-\d{2})$/u,
		doneDateRegex: /✅ *(\d{4}-\d{2}-\d{2})$/u,
		cancelledDateRegex: /❌ *(\d{4}-\d{2}-\d{2})$/u,
		recurrenceRegex: /🔁 ?([a-zA-Z0-9, !]+)$/iu,
		pomodorosRegex: toInlineFieldRegex(/🍅:: *(\d* *\/? *\d*)/),
	},
} as const;

export class DefaultTaskSerializer implements TaskDeserializer {
	constructor(public readonly symbols: DefaultTaskSerializerSymbols) {}

	/**
	 * Given the string captured in the first capture group of
	 * {@link DefaultTaskSerializerSymbols.TaskFormatRegularExpressions.priorityRegex},
	 * returns the corresponding Priority level.
	 *
	 * @param p String captured by priorityRegex
	 * @returns Corresponding priority if parsing was successful, otherwise {@link Priority.None}
	 */
	protected parsePriority(p: string): Priority {
		const { prioritySymbols } = this.symbols;
		switch (p) {
			case prioritySymbols.Lowest:
				return Priority.Lowest;
			case prioritySymbols.Low:
				return Priority.Low;
			case prioritySymbols.Medium:
				return Priority.Medium;
			case prioritySymbols.High:
				return Priority.High;
			case prioritySymbols.Highest:
				return Priority.Highest;
			default:
				return Priority.None;
		}
	}

	/** Parse TaskDetails from the textual description of a {@link Task}. */
	public deserialize(line: string): TaskDetails {
		const { TaskFormatRegularExpressions } = this.symbols;

		// Keep matching and removing special strings from the end of the
		// description in any order.
		let matched: boolean;
		let priority: Priority = Priority.None;
		let startDate: Moment | null = null;
		let scheduledDate: Moment | null = null;
		let dueDate: Moment | null = null;
		let doneDate: Moment | null = null;
		let cancelledDate: Moment | null = null;
		let createdDate: Moment | null = null;
		let recurrenceRule: string = '';
		let pomodoros: string = '';
		// Tags that are removed from the end while parsing, but we want to add them back for being part of the description.
		let trailingTags = '';
		// Add a "max runs" failsafe to never end in an endless loop:
		const maxRuns = 20;
		let runs = 0;
		do {
			matched = false;

			const pomodorosMatch = line.match(
				TaskFormatRegularExpressions.pomodorosRegex,
			);
			if (pomodorosMatch !== null) {
				pomodoros = pomodorosMatch[1] ?? '';
				line = line
					.replace(TaskFormatRegularExpressions.pomodorosRegex, '')
					.trim();
				matched = true;
			}

			const priorityMatch = line.match(
				TaskFormatRegularExpressions.priorityRegex,
			);
			if (priorityMatch !== null) {
				priority = this.parsePriority(priorityMatch[1] ?? '');
				line = line
					.replace(TaskFormatRegularExpressions.priorityRegex, '')
					.trim();
				matched = true;
			}

			const doneDateMatch = line.match(
				TaskFormatRegularExpressions.doneDateRegex,
			);
			if (doneDateMatch !== null) {
				doneDate = moment(
					doneDateMatch[1],
					TaskRegularExpressions.dateFormat,
				);
				line = line
					.replace(TaskFormatRegularExpressions.doneDateRegex, '')
					.trim();
				matched = true;
			}

			const cancelledDateMatch = line.match(
				TaskFormatRegularExpressions.cancelledDateRegex,
			);
			if (cancelledDateMatch !== null) {
				cancelledDate = moment(
					cancelledDateMatch[1],
					TaskRegularExpressions.dateFormat,
				);
				line = line
					.replace(
						TaskFormatRegularExpressions.cancelledDateRegex,
						'',
					)
					.trim();
				matched = true;
			}

			const dueDateMatch = line.match(
				TaskFormatRegularExpressions.dueDateRegex,
			);
			if (dueDateMatch !== null) {
				dueDate = moment(
					dueDateMatch[1],
					TaskRegularExpressions.dateFormat,
				);
				line = line
					.replace(TaskFormatRegularExpressions.dueDateRegex, '')
					.trim();
				matched = true;
			}

			const scheduledDateMatch = line.match(
				TaskFormatRegularExpressions.scheduledDateRegex,
			);
			if (scheduledDateMatch !== null) {
				scheduledDate = moment(
					scheduledDateMatch[1],
					TaskRegularExpressions.dateFormat,
				);
				line = line
					.replace(
						TaskFormatRegularExpressions.scheduledDateRegex,
						'',
					)
					.trim();
				matched = true;
			}

			const startDateMatch = line.match(
				TaskFormatRegularExpressions.startDateRegex,
			);
			if (startDateMatch !== null) {
				startDate = moment(
					startDateMatch[1],
					TaskRegularExpressions.dateFormat,
				);
				line = line
					.replace(TaskFormatRegularExpressions.startDateRegex, '')
					.trim();
				matched = true;
			}

			const createdDateMatch = line.match(
				TaskFormatRegularExpressions.createdDateRegex,
			);
			if (createdDateMatch !== null) {
				createdDate = moment(
					createdDateMatch[1],
					TaskRegularExpressions.dateFormat,
				);
				line = line
					.replace(TaskFormatRegularExpressions.createdDateRegex, '')
					.trim();
				matched = true;
			}

			const recurrenceMatch = line.match(
				TaskFormatRegularExpressions.recurrenceRegex,
			);
			if (recurrenceMatch !== null) {
				// Save the recurrence rule, but *do not parse it yet*.
				recurrenceRule = (recurrenceMatch[1] ?? '').trim();
				line = line
					.replace(TaskFormatRegularExpressions.recurrenceRegex, '')
					.trim();
				matched = true;
			}

			// Match tags from the end to allow users to mix the various task components with
			// tags. These tags will be added back to the description below.
			const tagsMatch = line.match(TaskRegularExpressions.hashTagsFromEnd);
			if (tagsMatch != null) {
				line = line
					.replace(TaskRegularExpressions.hashTagsFromEnd, '')
					.trim();
				matched = true;
				const tagName = (tagsMatch[0] ?? '').trim();
				// Adding to the left because the matching is done right-to-left
				trailingTags =
					trailingTags.length > 0
						? [tagName, trailingTags].join(' ')
						: tagName;
			}

			runs++;
		} while (matched && runs <= maxRuns);

		// Add back any trailing tags to the description.
		if (trailingTags.length > 0) line += ' ' + trailingTags;

		return {
			description: line,
			priority,
			startDate,
			createdDate,
			scheduledDate,
			dueDate,
			doneDate,
			cancelledDate,
			recurrenceRule,
			pomodoros,
			tags: extractHashtags(line),
		};
	}
}
