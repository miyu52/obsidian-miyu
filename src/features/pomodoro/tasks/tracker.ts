import { Keymap, MarkdownView, TFile } from 'obsidian';
import type MiyuPlugin from '../../../main';
import {
	writable,
	type Readable,
	type Subscriber,
	type Unsubscriber,
	type Writable,
} from '../../../core/store';
import type { TaskItem, TaskTrackerState } from '../types';
import { DESERIALIZERS } from './serializer';
import { extractTaskComponents, findLineByBlockLink } from './line-utils';
import { incrementPomodoroText } from '../pomodoro-count';

/**
 * 活动任务追踪：面板选中的任务（blockLink 定位）+ 会话完成时把番茄数写回文件。
 * 不关心分组/文件归属——只认 blockLink。
 */
export class TaskTracker implements Readable<TaskTrackerState> {
	private plugin: MiyuPlugin;

	/** 初始状态每实例新建——不要用模块级共享对象（会被原地 update 污染）。 */
	private state: TaskTrackerState = { task: undefined };

	private store: Writable<TaskTrackerState>;

	private unsubscribers: Unsubscriber[] = [];

	public subscribe: (run: Subscriber<TaskTrackerState>) => Unsubscriber;

	constructor(plugin: MiyuPlugin) {
		this.plugin = plugin;
		this.store = writable(this.state);
		this.subscribe = (run) => this.store.subscribe(run);
		this.unsubscribers.push(
			this.store.subscribe((state) => {
				this.state = state;
			}),
		);
	}

	get task() {
		return this.state.task;
	}

	/** 激活任务（必要时自动补块 ID）。 */
	async active(task: TaskItem) {
		await this.ensureBlockId(task);
		this.store.update(() => ({ task }));
		this.persist();
	}

	clear() {
		this.store.update(() => ({ task: undefined }));
		this.persist();
	}

	/** 把活动任务定位写入设置（只存 path + blockLink）。 */
	private persist() {
		const task = this.state.task;
		const p = this.plugin.settings.pomodoro;
		p.activeTask =
			task?.blockLink !== undefined && task.blockLink !== ''
				? { path: task.path, blockLink: task.blockLink }
				: null;
		void this.plugin.saveSettings();
	}

	/** 打开任务所在文件并跳转到任务行（按块 ID 重定位，失败回退解析时行号）。 */
	openTask = async (event: MouseEvent, task: TaskItem) => {
		const file = this.plugin.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) {
			return;
		}
		const located = await this.locateTaskLine(file, task);
		const line = located?.lineNr ?? task.line;
		if (line < 0) {
			return;
		}
		const leaf = this.plugin.app.workspace.getLeaf(
			Keymap.isModEvent(event),
		);
		await leaf.openFile(file, { eState: { line } });
	};

	/** 会话完成时递增番茄数并写回文件。 */
	async updateActual() {
		const p = this.plugin.settings.pomodoro;
		if (!p.taskTracking || !this.task?.blockLink) {
			return;
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(
			this.task.path,
		);
		if (!(file instanceof TFile)) {
			return;
		}
		this.store.update((state) =>
			state.task
				? {
						task: {
							...state.task,
							actualPomodoros: state.task.actualPomodoros + 1,
						},
					}
				: state,
		);
		await this.incrTaskActual(this.task.blockLink, file);
	}

	/** 切换任务的完成状态并写回文件（`- [ ]` ↔ `- [x]`）。 */
	async toggleComplete(task: TaskItem, completed: boolean) {
		const file = this.plugin.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile) || file.extension !== 'md') {
			return;
		}
		const located = await this.locateTaskLine(file, task);
		if (!located) {
			return;
		}
		const { lines, lineNr, content } = located;
		const line = lines[lineNr];
		if (line === undefined) {
			return;
		}
		const updated = line.replace(
			/\[[ xX]\]/,
			completed ? '[x]' : '[ ]',
		);
		if (updated === line) {
			return;
		}
		lines[lineNr] = updated;
		const metadata = this.plugin.app.metadataCache.getFileCache(file);
		await this.plugin.app.vault.modify(file, lines.join('\n'));
		this.plugin.app.metadataCache.trigger(
			'changed',
			file,
			content,
			metadata,
		);
	}

	/** 重新解析后同步活动任务（名称不可编辑，整体替换）。 */
	sync(task: TaskItem) {
		if (
			this.state.task?.blockLink &&
			this.state.task.blockLink === task.blockLink
		) {
			this.store.update(() => ({ task }));
		}
	}

	/**
	 * 写回/跳转前在最新文件内容中重定位任务行：
	 * - 有块 ID → 行尾块 ID 匹配（文件编辑后行号漂移也不影响）
	 * - 无块 ID → 回退解析时行号，但校验该行仍是任务行（避免写错行）
	 */
	private async locateTaskLine(
		file: TFile,
		task: TaskItem,
	): Promise<{ content: string; lines: string[]; lineNr: number } | null> {
		if (task.blockLink) {
			return this.locateTaskLineByBlockLink(file, task.blockLink);
		}
		const content = await this.plugin.app.vault.read(file);
		const lines = content.split('\n');
		const lineNr = task.line;
		if (
			lineNr >= 0 &&
			lineNr < lines.length &&
			extractTaskComponents(lines[lineNr] ?? '') !== null
		) {
			return { content, lines, lineNr };
		}
		return null;
	}

	/** 按块 ID 在最新内容中定位任务行（写回前必须重定位，行号快照会漂移）。 */
	private async locateTaskLineByBlockLink(
		file: TFile,
		blockLink: string,
	): Promise<{ content: string; lines: string[]; lineNr: number } | null> {
		const content = await this.plugin.app.vault.read(file);
		const lines = content.split('\n');
		const lineNr = findLineByBlockLink(content, blockLink);
		return lineNr !== null ? { content, lines, lineNr } : null;
	}

	private async ensureBlockId(task: TaskItem) {
		const file = this.plugin.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile) || file.extension !== 'md') {
			return;
		}
		const located = await this.locateTaskLine(file, task);
		if (!located) {
			return;
		}
		const { lines, lineNr } = located;
		const line = lines[lineNr] ?? '';
		if (task.blockLink) {
			if (!line.endsWith(task.blockLink)) {
				// block id mismatch
				lines[lineNr] = line + task.blockLink;
				void this.plugin.app.vault.modify(file, lines.join('\n'));
			}
			return;
		}
		// 生成块 ID
		const blockId = ` ^${Math.random().toString(36).substring(2, 6)}`;
		task.blockLink = blockId;
		lines[lineNr] = line + blockId;
		void this.plugin.app.vault.modify(file, lines.join('\n'));
	}

	private async incrTaskActual(blockLink: string, file: TFile) {
		if (file.extension !== 'md') {
			return;
		}
		const format = this.plugin.settings.pomodoro.taskFormat;
		const located = await this.locateTaskLineByBlockLink(file, blockLink);
		if (!located) {
			return;
		}
		const { lines, lineNr, content } = located;
		const line = lines[lineNr] ?? '';
		const components = extractTaskComponents(line);
		if (!components) {
			return;
		}

		let updated: string;
		const next = incrementPomodoroText(components.body);
		if (next !== components.body) {
			// 只去尾部空白——整行 trim() 会误删嵌套任务的缩进
			updated = line.replace(components.body, next).replace(/\s+$/, '');
		} else {
			const detail = DESERIALIZERS[format].deserialize(components.body);
			updated = line.replace(
				detail.description,
				`${detail.description} [🍅:: 1]`,
			);
		}

		lines[lineNr] = updated;
		await this.plugin.app.vault.modify(file, lines.join('\n'));
		this.plugin.app.metadataCache.trigger(
			'changed',
			file,
			content,
			this.plugin.app.metadataCache.getFileCache(file),
		);
		this.plugin.app.workspace
			.getActiveViewOfType(MarkdownView)
			?.load();
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
	}
}
