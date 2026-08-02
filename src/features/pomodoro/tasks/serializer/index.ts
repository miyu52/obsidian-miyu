import type { TaskFormat } from '../../types';
import type { PomodoroCount } from '../../types';
import type { Moment } from 'moment';
import { DataviewTaskSerializer } from './dataview-task-serializer';
import {
	DefaultTaskSerializer,
	DEFAULT_SYMBOLS,
} from './default-task-serializer';

/**
 * A subset of fields of {@link Task} that can be parsed from the textual
 * description of that Task.
 *
 * All fields are writeable for convenience.
 */
export type TaskDetails = {
	description: string;
	priority: string;
	startDate: Moment | null;
	createdDate: Moment | null;
	scheduledDate: Moment | null;
	dueDate: Moment | null;
	doneDate: Moment | null;
	cancelledDate: Moment | null;
	recurrenceRule: string;
	/** 番茄钟计数（结构化；null = 没有计数）。 */
	pomodoros: PomodoroCount | null;
	tags: string[];
};

/**
 * An abstraction that manages how a {@link Task} is read from and written
 * to a file.
 *
 * A {@link TaskDeserializer} is only responsible for the single line of text
 * that follows after the checkbox:
 *
 *        - [ ] This is a task description
 *              ~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
export interface TaskDeserializer {
	/**
	 * Parses task details from the string representation of a task
	 *
	 * @param line The single line of text to parse
	 * @returns {TaskDetails} Details parsed from {@link line}
	 */
	deserialize(line: string): TaskDetails;
}

export { DefaultTaskSerializer, DEFAULT_SYMBOLS } from './default-task-serializer';
export { DataviewTaskSerializer } from './dataview-task-serializer';

export const DESERIALIZERS: Record<TaskFormat, TaskDeserializer> = {
	TASKS: new DefaultTaskSerializer(DEFAULT_SYMBOLS),
	DATAVIEW: new DataviewTaskSerializer(),
};
