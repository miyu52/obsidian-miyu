/** Timer mode. */
export type TimerMode = 'WORK' | 'BREAK';

/** Runtime timer state (not persisted). */
export interface TimerState {
	running: boolean;
	mode: TimerMode;
	elapsed: number; // ms elapsed in current session
	duration: number; // total ms for current session
	autoStart: boolean;
	startTime: number | null; // Unix ms
}

/** Derived display values for UI. */
export interface TimerDisplay {
	mode: TimerMode;
	remainedMs: number;
	remainedHuman: string; // "MM:SS"
	progress: number; // 0..1 for SVG ring
	running: boolean;
	sessionStarted: boolean; // true if not fresh (has startTime)
}

/** A parsed task from markdown. */
export interface PomodoroTask {
	description: string; // task text (without checkbox, without pomodoro tag)
	line: number; // 0-indexed line in file
	checked: boolean;
	actual: number; // completed pomodoros
	expected: number; // planned pomodoros
	headingPath: string[]; // e.g. ["本周", "开发"]
}

/** A heading group in the task panel. */
export interface TaskHeading {
	text: string;
	level: number; // 1–3
	collapsed: boolean;
	taskCount: number;
	actualTotal: number;
	expectedTotal: number;
	children: TaskHeading[];
}

/** Completed pomodoro log entry (persisted). */
export interface PomodoroLog {
	ts: number; // Unix ms completion time
	task: string; // task description snapshot (empty if no task)
	minutes: number; // session duration in minutes
}

/** Active task state (persisted). */
export interface ActiveTask {
	filePath: string;
	description: string;
	line: number;
	actual: number;
	expected: number;
}

/** Panel display mode. */
export type PanelMode = 'none' | 'tasks' | 'stats';
