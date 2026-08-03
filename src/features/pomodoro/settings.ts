import { writable, type Writable } from '../../core/store';
import { deepMerge } from '../../utils';
import type {
	ActiveTaskRef,
	PomodoroRecord,
	TaskFilter,
	TaskFormat,
} from './types';

/** 番茄钟功能设置（嵌套在 MiyuSettings.pomodoro 下）。 */
export interface PomodoroSettings {
	// 计时
	workMinutes: number;
	breakMinutes: number;
	autoStartNext: boolean;
	lowFps: boolean;
	// 界面
	showStatusBarTimer: boolean;
	showTaskProgress: boolean;
	// 通知
	systemNotification: boolean;
	notificationSound: boolean;
	/** 自定义音效的库内路径（空 = 默认音效）。 */
	soundFile: string;
	// 任务
	taskTracking: boolean;
	taskFormat: TaskFormat;
	// 目标与文件
	/** 每日目标番茄数，0 = 关闭。 */
	dailyGoal: number;
	/** 周起始日（0=周日 … 6=周六），null = 跟随 Obsidian 语言环境。 */
	weekStart: number | null;
	/** 会话记录存储文件（'' = 存 data.json；配置后存该 md 文件的 miyu:records 块）。 */
	recordsFile: string;
	/** 参与番茄钟的 md 文件列表。 */
	files: string[];
	/** 当前激活文件（面板下拉框选择，持久化）。 */
	activeFile: string;
	/** 展开的标题分组（默认折叠；键 = `${path}:${headingBlockId}`）。 */
	expandedSections: string[];
	/** 任务面板过滤条件（默认待办，持久化）。 */
	taskFilter: TaskFilter;
	/** 活动任务定位（null = 无活动任务，持久化）。 */
	activeTask: ActiveTaskRef | null;
	// 日志
	records: PomodoroRecord[];
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
	workMinutes: 25,
	breakMinutes: 5,
	autoStartNext: false,
	lowFps: false,
	showStatusBarTimer: false,
	showTaskProgress: true,
	systemNotification: false,
	notificationSound: true,
	soundFile: '',
	taskTracking: false,
	taskFormat: 'TASKS',
	dailyGoal: 0,
	weekStart: 0,
	recordsFile: '',
	files: [],
	activeFile: '',
	expandedSections: [],
	taskFilter: 'todo',
	activeTask: null,
	records: [],
};

/**
 * 深合并持久化设置与默认值：数组/对象一律克隆，
 * 避免与 DEFAULT_POMODORO_SETTINGS 共享引用被运行时突变。
 */
export function normalizePomodoroSettings(
	loaded: Partial<PomodoroSettings> | null | undefined,
): PomodoroSettings {
	return deepMerge(DEFAULT_POMODORO_SETTINGS, loaded);
}

/**
 * 响应式镜像：由 index.ts 在每次 saveSettings 后刷新（onSettingsChanged 钩子）。
 * UI 组件订阅它来响应设置变化。
 */
export const pomodoroSettings: Writable<PomodoroSettings> = writable({
	...DEFAULT_POMODORO_SETTINGS,
});
