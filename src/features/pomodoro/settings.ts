import { writable, type Writable } from '../../core/store';
import type { PomodoroRecord, TaskFormat } from './types';

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
	/** 参与番茄钟的 md 文件列表。 */
	files: string[];
	/** 当前激活文件（面板下拉框选择，持久化）。 */
	activeFile: string;
	/** 折叠标题的持久化键（TaskGroup.id）。 */
	collapsedSections: string[];
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
	files: [],
	activeFile: '',
	collapsedSections: [],
	records: [],
};

/**
 * 响应式镜像：由 index.ts 在每次 saveSettings 后刷新（onSettingsChanged 钩子）。
 * UI 组件订阅它来响应设置变化。
 */
export const pomodoroSettings: Writable<PomodoroSettings> = writable({
	...DEFAULT_POMODORO_SETTINGS,
});
