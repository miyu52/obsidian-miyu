/**
 * Shared data models for the pomodoro feature.
 * All modules import their types from here — no cross-module type imports.
 */

export type Mode = 'WORK' | 'BREAK';

export type TaskFormat = 'TASKS' | 'DATAVIEW';

/** 计时器状态机：IDLE = 无会话；RUNNING = 走时中；PAUSED = 暂停（会话仍在）。 */
export type TimerPhase = 'IDLE' | 'RUNNING' | 'PAUSED';

/** 进行中的会话。完成后转存为持久化的 PomodoroRecord。 */
export interface PomodoroSession {
	id: string;
	mode: Mode;
	/** 会话起点（epoch ms）。 */
	startedAt: number;
	/** 计划分钟数（开始时的设置快照）。 */
	plannedMinutes: number;
	/** 实际走时毫秒（完成 = 整段；中断 = 累计值，中断不落库）。 */
	actualMs: number;
}

export interface TimerState {
	phase: TimerPhase;
	/** 当前/下一段类型（IDLE 时表示下次开始的段）。 */
	mode: Mode;
	session: PomodoroSession | null;
	/** 当前运行段之前已累计的走时（暂停时冻结）。 */
	accumulatedMs: number;
	/** 当前运行段起点；非 RUNNING 时为 null。 */
	runningSince: number | null;
	autoStartNext: boolean;
	workMinutes: number;
	breakMinutes: number;
}

/** 订阅者看到的视图：原始状态 + 基于墙钟的派生值。 */
export interface TimerDisplay extends TimerState {
	elapsedMs: number;
	remainedMs: number;
	/** "25 : 00" */
	remainedText: string;
	/** 0..1，供进度环。 */
	progress: number;
}

/** 持久化的番茄钟日志：一条 = 一个完成的 WORK 会话。 */
export interface PomodoroRecord {
	/** 完成时刻（epoch ms）——按天统计的唯一依据。 */
	completedAt: number;
	/** 任务名快照（会话结束时活动任务名；空串 = 无任务）。 */
	task: string;
	/** 实际走时毫秒。 */
	durationMs: number;
}

export interface DayStat {
	/** 'YYYY-MM-DD' */
	day: string;
	count: number;
}

export interface TaskStat {
	/** 空串 = 无任务。 */
	name: string;
	count: number;
}

/** 解析出的单个任务（含标题归属前的平铺形态）。 */
export interface TaskItem {
	path: string;
	/** 任务正文（初始 = 解析结果，面板内可编辑，不写回文件）。 */
	name: string;
	/** 块 ID（任务追踪 / 番茄计数写回的定位键）。 */
	blockLink: string;
	checked: boolean;
	expectedPomodoros: number;
	actualPomodoros: number;
	/** 行号（写回时基于最新解析值定位）。 */
	line: number;
}

/** 标题分组节点（嵌套树）。 */
export interface TaskGroup {
	/** `${path}:${headingLine}` —— 折叠状态持久化的键。 */
	id: string;
	title: string;
	level: number;
	tasks: TaskItem[];
	children: TaskGroup[];
}

export interface TaskStore {
	/** 当前解析的文件路径（'' = 未选择）。 */
	filePath: string;
	/** 文件是否存在。 */
	exists: boolean;
	/** 无标题归属的任务（渲染最前）。 */
	topTasks: TaskItem[];
	/** 标题分组，文档顺序。 */
	groups: TaskGroup[];
}

export interface TaskTrackerState {
	task?: TaskItem;
}
