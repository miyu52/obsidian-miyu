import { type CachedMetadata, TFile } from 'obsidian';
import type MiyuPlugin from '../../../main';
import {
	writable,
	type Readable,
	type Subscriber,
	type Unsubscriber,
	type Writable,
} from '../../../core/store';
import type { TaskFormat, TaskGroup, TaskItem, TaskStore } from '../types';
import type { TaskTracker } from './tracker';
import { extractTaskComponents } from './line-utils';
import { DESERIALIZERS } from './serializer';
import { pomodoroSettings } from '../settings';

/**
 * 任务解析：把激活文件的 md 内容解析为分组树（标题归属 + 嵌套）。
 * 无状态、全量重建——用户手动编辑文件（增删标题/任务）后，下一次
 * 解析自动反映，无需增量维护。
 */
export class TaskParser implements Readable<TaskStore> {
	private plugin: MiyuPlugin;

	private tracker: TaskTracker;

	private state: TaskStore = {
		filePath: '',
		exists: false,
		topTasks: [],
		groups: [],
	};

	private store: Writable<TaskStore>;

	private unsubscribers: Unsubscriber[] = [];

	public subscribe: (run: Subscriber<TaskStore>) => Unsubscriber;

	constructor(plugin: MiyuPlugin, tracker: TaskTracker) {
		this.plugin = plugin;
		this.tracker = tracker;
		this.store = writable(this.state);
		this.subscribe = (run) => this.store.subscribe(run);
		this.unsubscribers.push(
			this.store.subscribe((state) => {
				this.state = state;
			}),
		);

		// 激活文件变化（下拉框/设置）→ 重解析
		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.load();
			}),
		);

		// 文件内容/删除/重命名/重建 → 重解析
		plugin.registerEvent(
			plugin.app.metadataCache.on('changed', (file: TFile) => {
				if (file.path === plugin.settings.pomodoro.activeFile) {
					this.load();
				}
			}),
		);
		plugin.registerEvent(
			plugin.app.vault.on('create', (file) => {
				if (file.path === plugin.settings.pomodoro.activeFile) {
					this.load();
				}
			}),
		);
		plugin.registerEvent(
			plugin.app.vault.on('delete', (file) => {
				if (file.path === plugin.settings.pomodoro.activeFile) {
					this.load();
				}
			}),
		);
		plugin.registerEvent(
			plugin.app.vault.on('rename', (file) => {
				if (file.path === plugin.settings.pomodoro.activeFile) {
					this.load();
				}
			}),
		);

		// 启动早期 vault 可能尚未完整可查：布局就绪后再加载一次
		plugin.app.workspace.onLayoutReady(() => {
			this.load();
		});

		this.load();
	}

	/** 未找到文件时的有限重试次数（启动时序兜底）。 */
	private missingRetries = 0;

	/** 重新解析激活文件并发布新的分组树。 */
	load(): void {
		const activeFile = this.plugin.settings.pomodoro.activeFile;
		if (!activeFile) {
			this.missingRetries = 0;
			const tree = {
				filePath: '',
				exists: false,
				topTasks: [],
				groups: [],
			} satisfies TaskStore;
			this.store.set(tree);
			this.syncActiveTask(tree);
			return;
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(activeFile);
		if (!(file instanceof TFile)) {
			const tree = {
				filePath: activeFile,
				exists: false,
				topTasks: [],
				groups: [],
			} satisfies TaskStore;
			this.store.set(tree);
			this.syncActiveTask(tree);
			// 启动早期查询可能失败，稍后重试几次；文件确实不存在时
			// 重试耗尽后保持"文件不存在"状态
			if (this.missingRetries < 5) {
				this.missingRetries++;
				window.setTimeout(() => this.load(), 500);
			}
			return;
		}
		this.missingRetries = 0;
		void this.plugin.app.vault
			.cachedRead(file)
			.then((content) => {
				const metadata = this.plugin.app.metadataCache.getFileCache(
					file,
				);
				const tree = parseTaskTree(
					this.plugin.settings.pomodoro.taskFormat,
					file,
					content,
					metadata,
				);
				this.store.set(tree);
				this.syncActiveTask(tree);
			})
			.catch((e) => {
				console.error('[miyu] task parsing failed:', e);
			});
	}

	/** 活动任务与最新解析结果同步：任务被删则清除，任务有变则更新；启动时恢复持久化。 */
	private syncActiveTask(tree: TaskStore) {
		const persisted = this.plugin.settings.pomodoro.activeTask;
		const active = this.tracker.task;

		// 内存中无活动任务 → 尝试恢复持久化的定位
		if (!active && persisted) {
			const found = collectTasks(tree).find(
				(t) => t.blockLink && t.blockLink === persisted.blockLink,
			);
			if (found) {
				void this.tracker.active(found);
				return;
			}
			// 任务不存在：属于当前文件 → 清除；属于其他文件 → 保留（切回时再恢复）
			if (persisted.path === tree.filePath) {
				this.plugin.settings.pomodoro.activeTask = null;
				void this.plugin.saveSettings();
			}
			return;
		}

		if (!active) return;
		const found = collectTasks(tree).find(
			(t) => t.blockLink && t.blockLink === active.blockLink,
		);
		if (found) {
			this.tracker.sync(found);
		} else {
			this.tracker.clear();
		}
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
	}
}

/** 平铺所有分组里的任务（含顶层任务）。 */
export function collectTasks(tree: TaskStore): TaskItem[] {
	const all: TaskItem[] = [...tree.topTasks];
	const walk = (groups: TaskGroup[]) => {
		for (const g of groups) {
			all.push(...g.tasks);
			walk(g.children);
		}
	};
	walk(tree.groups);
	return all;
}

/**
 * 解析文件内容为分组树：
 * - 标题数据来自 metadataCache.headings（文本/级别/行号）
 * - 每个任务归属"它之前最近的标题"；无标题 → topTasks
 * - 嵌套：标题 A 之后出现的更深级标题作为 A 的 children
 */
export function parseTaskTree(
	format: TaskFormat,
	file: TFile,
	content: string,
	metadata: CachedMetadata | null,
): TaskStore {
	const tree: TaskStore = {
		filePath: file.path,
		exists: true,
		topTasks: [],
		groups: [],
	};
	if (!content || !metadata) {
		return tree;
	}

	const headings = (metadata.headings ?? [])
		.map((h) => ({
			line: h.position.start.line,
			level: h.level,
			title: h.heading,
		}))
		.sort((a, b) => a.line - b.line);

	const tasks = resolveTasks(format, file, content, metadata);

	// 按行号线性扫描：标题开组（按级别嵌套），任务挂到当前组
	const stack: TaskGroup[] = [];
	type Event =
		| { line: number; kind: 'heading'; level: number; title: string }
		| { line: number; kind: 'task'; task: TaskItem };
	const events: Event[] = [
		...headings.map((h) => ({
			line: h.line,
			kind: 'heading' as const,
			level: h.level,
			title: h.title,
		})),
		...tasks.map((t) => ({ line: t.line, kind: 'task' as const, task: t })),
	].sort((a, b) => a.line - b.line);

	for (const ev of events) {
		if (ev.kind === 'heading') {
			while (
				stack.length > 0 &&
				(stack[stack.length - 1]?.level ?? 0) >= ev.level
			) {
				stack.pop();
			}
			const group: TaskGroup = {
				id: `${file.path}:${ev.line}`,
				title: ev.title,
				level: ev.level,
				tasks: [],
				children: [],
			};
			const parent = stack[stack.length - 1];
			if (parent) {
				parent.children.push(group);
			} else {
				tree.groups.push(group);
			}
			stack.push(group);
		} else {
			const parent = stack[stack.length - 1];
			if (parent) {
				parent.tasks.push(ev.task);
			} else {
				tree.topTasks.push(ev.task);
			}
		}
	}

	return tree;
}

/** 解析文件内容为平铺任务列表。 */
export function resolveTasks(
	format: TaskFormat,
	file: TFile,
	content: string,
	metadata: CachedMetadata | null,
): TaskItem[] {
	if (!content || !metadata) {
		return [];
	}

	const cache: Record<number, TaskItem> = {};
	const lines = content.split('\n');
	for (const rawElement of metadata.listItems || []) {
		if (!rawElement.task) {
			continue;
		}
		const lineNr = rawElement.position.start.line;
		const line = lines[lineNr];
		if (line === undefined) {
			continue;
		}

		const components = extractTaskComponents(line);
		if (!components) {
			continue;
		}
		const detail = DESERIALIZERS[format].deserialize(components.body);

		const [actual, expected] = detail.pomodoros.split('/');

		cache[lineNr] = {
			path: file.path,
			name: detail.description,
			blockLink: components.blockLink,
			checked: rawElement.task !== '' && rawElement.task !== ' ',
			expectedPomodoros: expected ? parseInt(expected) : 0,
			actualPomodoros: actual === '' ? 0 : parseInt(actual ?? '0'),
			line: lineNr,
		};
	}

	return Object.values(cache);
}
