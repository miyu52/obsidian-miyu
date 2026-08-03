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

	/** 最近一次解析的激活文件路径（检测切换 → 清空展开状态）。 */
	private lastLoadedPath = '';

	/** 重新解析激活文件并发布新的分组树。 */
	load(): void {
		const activeFile = this.plugin.settings.pomodoro.activeFile;

		// 切换激活文件：展开状态只记录当前文件的，旧文件状态清空
		if (this.lastLoadedPath !== activeFile) {
			const p = this.plugin.settings.pomodoro;
			if (p.expandedSections.length > 0) {
				p.expandedSections = [];
				void this.plugin.saveSettings();
			}
			this.lastLoadedPath = activeFile;
		}

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
				// 标题缺块 ID → 自动补写（展开状态的稳定键），写回后重新解析
				const missing = headingsMissingBlockId(content, metadata);
				if (missing.length > 0) {
					this.ensureHeadingBlockIds(file, content, missing);
					return;
				}
				const tree = parseTaskTree(
					this.plugin.settings.pomodoro.taskFormat,
					file,
					content,
					metadata,
				);
				this.store.set(tree);
				this.syncActiveTask(tree);
				this.pruneExpandedSections(tree);
			})
			.catch((e) => {
				console.error('[miyu] task parsing failed:', e);
			});
	}

	/** 给缺失块 ID 的标题行追加 ` ^xxxx` 并写回文件（与任务追踪的补 ID 同模式）。 */
	private ensureHeadingBlockIds(
		file: TFile,
		content: string,
		missing: number[],
	) {
		const lines = content.split('\n');
		for (const line of missing) {
			const text = lines[line];
			if (text !== undefined) {
				lines[line] = `${text.trimEnd()} ${makeBlockId()}`;
			}
		}
		void this.plugin.app.vault.modify(file, lines.join('\n')).then(() => {
			// 延迟重解析：行尾块 ID 直接从内容读取，无需等 metadataCache 更新
			window.setTimeout(() => this.load(), 100);
		});
	}

	/**
	 * 清理展开状态中的 stale ID（标题块 ID 被外部插件重写丢失后，
	 * 解析补写的新 ID 会让旧 ID 永久失配——这里按当前树收敛，
	 * 避免数组无限累积。切换文件时的整体清空逻辑仍保留）。
	 */
	private pruneExpandedSections(tree: TaskStore) {
		const p = this.plugin.settings.pomodoro;
		if (p.expandedSections.length === 0) {
			return;
		}
		const valid = new Set(collectGroupIds(tree));
		const next = p.expandedSections.filter((id) => valid.has(id));
		if (next.length !== p.expandedSections.length) {
			p.expandedSections = next;
			void this.plugin.saveSettings();
		}
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
			// 任务不存在：仅当文件确认存在（exists）且属于当前文件时才清除；
			// 缺失文件可能是启动时序（vault 未就绪），此时保留等待重试后恢复
			if (tree.exists && persisted.path === tree.filePath) {
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

/** 收集树中所有分组 id（展开状态 stale 清理用）。 */
export function collectGroupIds(tree: TaskStore): string[] {
	const ids: string[] = [];
	const walk = (groups: TaskGroup[]) => {
		for (const g of groups) {
			ids.push(g.id);
			walk(g.children);
		}
	};
	walk(tree.groups);
	return ids;
}

/** 行尾块 ID（` ^xxxx`）——展开状态持久化的稳定定位键。 */
const BLOCK_ID_RE = / \^[a-zA-Z0-9-]+$/;

/** 生成 Obsidian 块 ID（与 TaskTracker.ensureBlockId 同风格）。 */
export function makeBlockId(): string {
	return `^${Math.random().toString(36).substring(2, 6)}`;
}

/** 从文件内容中取某行行尾的块 ID（无则 null）。 */
export function headingBlockId(
	content: string,
	line: number,
): string | null {
	const text = content.split('\n')[line] ?? '';
	const match = text.match(BLOCK_ID_RE);
	return match ? match[0].trim().slice(1) : null;
}

/** 找出没有块 ID 的标题行号（需要自动补写）。 */
export function headingsMissingBlockId(
	content: string,
	metadata: CachedMetadata | null,
): number[] {
	if (!content || !metadata) {
		return [];
	}
	const missing: number[] = [];
	for (const h of metadata.headings ?? []) {
		if (headingBlockId(content, h.position.start.line) === null) {
			missing.push(h.position.start.line);
		}
	}
	return missing;
}

/**
 * 解析文件内容为分组树：
 * - 标题数据来自 metadataCache.headings（文本/级别/行号）
 * - 每个任务归属"它之前最近的标题"；无标题 → topTasks
 * - 嵌套：标题 A 之后出现的更深级标题作为 A 的 children
 * - 分组 id = `${path}:${标题块 ID}`（块 ID 稳定，行号偏移不影响展开状态）
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
			// heading 缓存文本包含行尾块 ID，剥离后显示（`# Alpha ^abc` → `Alpha`）
			title: h.heading.replace(BLOCK_ID_RE, '').trim(),
			blockId: headingBlockId(content, h.position.start.line),
		}))
		.sort((a, b) => a.line - b.line);

	const tasks = resolveTasks(format, file, content, metadata);

	// 按行号线性扫描：标题开组（按级别嵌套），任务挂到当前组
	const stack: TaskGroup[] = [];
	type Event =
		| {
				line: number;
				kind: 'heading';
				level: number;
				title: string;
				blockId: string | null;
		  }
		| { line: number; kind: 'task'; task: TaskItem };
	const events: Event[] = [
		...headings.map((h) => ({
			line: h.line,
			kind: 'heading' as const,
			level: h.level,
			title: h.title,
			blockId: h.blockId,
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
				// 优先块 ID；补写前的瞬时解析用行号兜底（无害）
				id: `${file.path}:${ev.blockId ?? ev.line}`,
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
		const count = detail.pomodoros;

		cache[lineNr] = {
			path: file.path,
			name: detail.description,
			blockLink: components.blockLink,
			checked: rawElement.task !== '' && rawElement.task !== ' ',
			expectedPomodoros: count?.expected ?? 0,
			actualPomodoros: count?.actual ?? 0,
			line: lineNr,
		};
	}

	return Object.values(cache);
}
