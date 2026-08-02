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
import { DESERIALIZERS, POMODORO_REGEX } from './serializer';
import { extractTaskComponents } from './line-utils';

const DEFAULT_TRACKER_STATE: TaskTrackerState = {};

/**
 * 活动任务追踪：面板选中的任务（blockLink 定位）+ 会话完成时把番茄数写回文件。
 * 不关心分组/文件归属——只认 blockLink。
 */
export class TaskTracker implements Readable<TaskTrackerState> {
	private plugin: MiyuPlugin;

	private state: TaskTrackerState = DEFAULT_TRACKER_STATE;

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
		this.store.update((state) => {
			state.task = task;
			return state;
		});
		this.persist();
	}

	clear() {
		this.store.update((state) => {
			state.task = undefined;
			return state;
		});
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

	/** 打开任务所在文件并跳转到任务行。 */
	openTask = (event: MouseEvent, task: TaskItem) => {
		const file = this.plugin.app.vault.getAbstractFileByPath(task.path);
		if (file instanceof TFile && task.line >= 0) {
			const leaf = this.plugin.app.workspace.getLeaf(
				Keymap.isModEvent(event),
			);
			void leaf.openFile(file, { eState: { line: task.line } });
		}
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
		this.store.update((state) => {
			if (state.task) {
				state.task.actualPomodoros += 1;
			}
			return state;
		});
		await this.incrTaskActual(this.task.blockLink, file);
	}

	/** 切换任务的完成状态并写回文件（`- [ ]` ↔ `- [x]`）。 */
	async toggleComplete(task: TaskItem, completed: boolean) {
		const file = this.plugin.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile) || file.extension !== 'md') {
			return;
		}
		const content = await this.plugin.app.vault.read(file);
		const lines = content.split('\n');
		const line = lines[task.line];
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
		lines[task.line] = updated;
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
			this.store.update((state) => {
				state.task = task;
				return state;
			});
		}
	}

	private async ensureBlockId(task: TaskItem) {
		const file = this.plugin.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile) || file.extension !== 'md') {
			return;
		}
		const content = await this.plugin.app.vault.read(file);
		const lines = content.split('\n');
		if (lines.length <= task.line) {
			return;
		}
		const line = lines[task.line] ?? '';
		if (task.blockLink) {
			if (!line.endsWith(task.blockLink)) {
				// block id mismatch
				lines[task.line] = line + task.blockLink;
				void this.plugin.app.vault.modify(file, lines.join('\n'));
			}
			return;
		}
		// 生成块 ID
		const blockId = ` ^${Math.random().toString(36).substring(2, 6)}`;
		task.blockLink = blockId;
		lines[task.line] = line + blockId;
		void this.plugin.app.vault.modify(file, lines.join('\n'));
	}

	private async incrTaskActual(blockLink: string, file: TFile) {
		if (file.extension !== 'md') {
			return;
		}
		const format = this.plugin.settings.pomodoro.taskFormat;
		const metadata = this.plugin.app.metadataCache.getFileCache(file);
		const content = await this.plugin.app.vault.read(file);
		if (!content || !metadata) {
			return;
		}

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
			if (!components || components.blockLink !== blockLink) {
				continue;
			}

			let updated: string;
			const match = components.body.match(POMODORO_REGEX);
			if (match !== null) {
				let [actual, expected] = (match[1] ?? '').split('/');
				actual = actual || '0';
				let text = `🍅:: ${parseInt(actual) + 1}`;
				if (expected !== undefined) {
					text += `/${expected.trim()}`;
				}
				updated = line
					.replace(/🍅:: *(\d* *\/? *\d* *)/, text)
					.trim();
			} else {
				const detail = DESERIALIZERS[format].deserialize(
					components.body,
				);
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
				metadata,
			);
			this.plugin.app.workspace
				.getActiveViewOfType(MarkdownView)
				?.load();
			break;
		}
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
	}
}
