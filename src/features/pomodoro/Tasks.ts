import {
	type CachedMetadata,
	type TFile,
} from 'obsidian';
import type MiyuPlugin from '../../main';
import type { TaskFormat } from '../../settings';
import {
	derived,
	writable,
	type Readable,
	type Subscriber,
	type Unsubscriber,
	type Writable,
} from '../../core/store';
import type TaskTracker from './TaskTracker';
import { extractTaskComponents } from './task-utils';
import { DESERIALIZERS } from './serializer';

export type TaskItem = {
	path: string;
	text: string;
	fileName: string;
	name: string;
	status: string;
	blockLink: string;
	checked: boolean;
	done: string;
	due: string;
	created: string;
	cancelled: string;
	scheduled: string;
	start: string;
	description: string;
	priority: string;
	recurrence: string;
	expected: number;
	actual: number;
	tags: string[];
	line: number;
};

export type TaskStore = {
	list: TaskItem[];
};

export default class Tasks implements Readable<TaskStore> {
	private plugin: MiyuPlugin;

	private _store: Writable<TaskStore>;

	public subscribe: (run: Subscriber<TaskStore>) => Unsubscriber;

	private unsubscribers: Unsubscriber[] = [];

	private state: TaskStore = {
		list: [],
	};

	public static getDeserializer(format: TaskFormat) {
		return DESERIALIZERS[format];
	}

	constructor(plugin: MiyuPlugin, tracker: TaskTracker) {
		this.plugin = plugin;

		this._store = writable(this.state);

		this.unsubscribers.push(
			this._store.subscribe((state) => {
				this.state = state;
			}),
		);

		this.unsubscribers.push(
			derived(tracker, ($tracker) => {
				return $tracker.file?.path;
			}).subscribe(() => {
				let file = tracker.file;
				if (file) {
					this.loadFileTasks(file);
				} else {
					this.clearTasks();
				}
			}),
		);

		this.subscribe = (run) => this._store.subscribe(run);

		this.plugin.registerEvent(
			plugin.app.metadataCache.on(
				'changed',
				(file: TFile, content: string, cache: CachedMetadata) => {
					if (
						file.extension === 'md' &&
						file == this.plugin.pomodoro?.tracker.file
					) {
						let tasks = resolveTasks(
							this.plugin.settings.taskFormat,
							file,
							content,
							cache,
						);
						this._store.update((state) => {
							state.list = tasks;
							return state;
						});

						// sync active task
						if (this.plugin.pomodoro?.tracker.task?.blockLink) {
							let task = tasks.find(
								(item) =>
									item.blockLink &&
									item.blockLink ===
										this.plugin.pomodoro?.tracker.task
											?.blockLink,
							);
							if (task) {
								this.plugin.pomodoro?.tracker.sync(task);
							}
						}
					}
				},
			),
		);
	}

	public loadFileTasks(file: TFile) {
		if (file.extension == 'md') {
			void this.plugin.app.vault.cachedRead(file).then((c) => {
				let tasks = resolveTasks(
					this.plugin.settings.taskFormat,
					file,
					c,
					this.plugin.app.metadataCache.getFileCache(file),
				);
				this._store.update(() => ({
					list: tasks,
				}));
			});
		} else {
			this._store.update(() => ({
				list: [],
			}));
		}
	}

	public clearTasks() {
		this._store.update(() => ({
			list: [],
		}));
	}

	public destroy() {
		for (let unsub of this.unsubscribers) {
			unsub();
		}
	}
}

export function resolveTasks(
	format: TaskFormat,
	file: TFile,
	content: string,
	metadata: CachedMetadata | null,
): TaskItem[] {
	if (!content || !metadata) {
		return [];
	}

	let cache: Record<number, TaskItem> = {};
	const lines = content.split('\n');
	for (let rawElement of metadata.listItems || []) {
		if (rawElement.task) {
			let lineNr = rawElement.position.start.line;
			let line = lines[lineNr];
			if (line === undefined) {
				continue;
			}

			const components = extractTaskComponents(line);
			if (!components) {
				continue;
			}
			let detail = DESERIALIZERS[format].deserialize(components.body);

			let [actual, expected] = detail.pomodoros.split('/');

			const dateformat = 'YYYY-MM-DD';
			let item: TaskItem = {
				text: line,
				path: file.path,
				fileName: file.name,
				name: detail.description,
				status: components.status,
				blockLink: components.blockLink,
				checked: rawElement.task != '' && rawElement.task != ' ',
				description: detail.description,
				done: detail.doneDate?.format(dateformat) ?? '',
				due: detail.dueDate?.format(dateformat) ?? '',
				created: detail.createdDate?.format(dateformat) ?? '',
				cancelled: detail.cancelledDate?.format(dateformat) ?? '',
				scheduled: detail.scheduledDate?.format(dateformat) ?? '',
				start: detail.startDate?.format(dateformat) ?? '',
				priority: detail.priority,
				recurrence: detail.recurrenceRule,
				expected: expected ? parseInt(expected) : 0,
				actual: actual === '' ? 0 : parseInt(actual ?? '0'),
				tags: detail.tags,
				line: lineNr,
			};

			cache[lineNr] = item;
		}
	}

	return Object.values(cache);
}
