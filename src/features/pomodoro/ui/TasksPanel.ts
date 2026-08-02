import { Menu, type ItemView } from 'obsidian';
import type MiyuPlugin from '../../../main';
import { t } from '../../../i18n';
import type { Unsubscriber } from '../../../core/store';
import type { TaskGroup, TaskItem, TaskStore, TaskTrackerState } from '../types';
import type { TaskParser } from '../tasks/parser';
import { collectTasks } from '../tasks/parser';
import type { TaskTracker } from '../tasks/tracker';
import { pomodoroSettings } from '../settings';

const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;

const ICON_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>`;

const ICON_REMOVE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

const ICON_ARROW = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>`;

type FilterStatus = '' | 'todo' | 'completed';

/**
 * 任务面板：文件下拉框（激活文件，持久化）+ 标题分组树（嵌套、可折叠、折叠状态持久化）。
 * 搜索/过滤保持分组，空分组隐藏；无标题的顶级任务恒在最前。
 */
export class TasksPanel {
	private plugin: MiyuPlugin;

	private container: HTMLElement;

	private view: ItemView;

	private parser: TaskParser;

	private tracker: TaskTracker;

	private wrapper: HTMLElement;

	private fileSelect: HTMLSelectElement;

	private countEl: HTMLElement;

	private activeArea: HTMLElement;

	private treeEl: HTMLElement;

	private filterEls: Map<FilterStatus, HTMLElement> = new Map();

	private searchEl: HTMLInputElement;

	private status: FilterStatus = '';

	private query = '';

	private taskStore: TaskStore = {
		filePath: '',
		exists: false,
		topTasks: [],
		groups: [],
	};

	private trackerState: TaskTrackerState = {};

	private unsubscribers: Unsubscriber[] = [];

	constructor(
		plugin: MiyuPlugin,
		container: HTMLElement,
		view: ItemView,
	) {
		this.plugin = plugin;
		this.container = container;
		this.view = view;
		this.parser = plugin.pomodoro!.parser;
		this.tracker = plugin.pomodoro!.tracker;
		const locale = plugin.settings.language;

		this.wrapper = container.createDiv({ cls: 'pomodoro-tasks-wrapper' });

		const header = this.wrapper.createDiv({ cls: 'pomodoro-tasks-header' });

		const titleRow = header.createDiv({
			cls: 'pomodoro-tasks-header-title',
		});

		this.fileSelect = titleRow.createEl('select', {
			cls: 'pomodoro-tasks-file-select',
		});
		this.fileSelect.addEventListener('change', () => {
			plugin.settings.pomodoro.activeFile = this.fileSelect.value;
			void plugin.saveSettings();
		});

		this.countEl = titleRow.createSpan({ cls: 'pomodoro-tasks-count' });

		this.activeArea = header.createDiv({ cls: 'pomodoro-tasks-active' });

		const toolbar = header.createDiv({ cls: 'pomodoro-tasks-toolbar' });
		const filters = toolbar.createDiv({ cls: 'pomodoro-tasks-filters' });
		for (const status of ['', 'todo', 'completed'] as const) {
			const label =
				status === ''
					? t('panel.filter.all', locale)
					: status === 'todo'
						? t('panel.filter.todo', locale)
						: t('panel.filter.completed', locale);
			const el = filters.createSpan({
				cls: 'pomodoro-tasks-filter',
				text: label,
			});
			el.addEventListener('click', () => {
				this.status = status;
				this.renderTree();
				this.updateFilterClasses();
			});
			this.filterEls.set(status, el);
		}

		const textFilter = header.createDiv({
			cls: 'pomodoro-tasks-text-filter',
		});
		this.searchEl = textFilter.createEl('input', {
			type: 'text',
			attr: { placeholder: t('panel.search', locale) },
		});
		this.searchEl.addEventListener('input', () => {
			this.query = this.searchEl.value;
			this.renderTree();
		});

		this.treeEl = this.wrapper.createDiv({ cls: 'pomodoro-tasks-tree' });

		this.unsubscribers.push(
			this.parser.subscribe((state) => {
				this.taskStore = state;
				this.renderFileSelect();
				this.renderTree();
			}),
		);
		this.unsubscribers.push(
			this.tracker.subscribe((state) => {
				this.trackerState = state;
				this.renderActiveTask();
				this.renderTree();
			}),
		);
		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.renderFileSelect();
				this.renderTree();
			}),
		);

		this.renderFileSelect();
		this.renderActiveTask();
		this.renderTree();
	}

	// ---------- 文件下拉框 ----------

	private renderFileSelect() {
		const p = this.plugin.settings.pomodoro;
		const locale = this.plugin.settings.language;
		this.fileSelect.empty();

		this.fileSelect.createEl('option', {
			text: t('panel.select-file', locale),
			attr: { value: '' },
		});
		for (const path of p.files) {
			const name = path.split('/').pop() ?? path;
			this.fileSelect.createEl('option', {
				text: name,
				attr: { value: path, title: path },
			});
		}
		this.fileSelect.value = p.activeFile;
	}

	// ---------- 活动任务 ----------

	private renderActiveTask() {
		const task = this.trackerState.task;
		const activeInput = this.activeArea.querySelector('input');
		if (activeInput && document.activeElement === activeInput) {
			if (task && activeInput.value !== task.name) {
				activeInput.value = task.name;
			}
		} else {
			this.activeArea.empty();
			if (task) {
				const item = this.activeArea.createDiv({
					cls: 'pomodoro-tasks-item',
				});
				const name = item.createDiv({ cls: 'pomodoro-tasks-name' });
				name.createEl('input', {
					type: 'text',
					value: task.name,
					attr: { readonly: 'readonly' },
				});
				const remove = name.createSpan({
					cls: 'pomodoro-tasks-remove',
				});
				remove.innerHTML = ICON_REMOVE;
				remove.addEventListener('click', () => {
					this.tracker.clear();
				});
			}
		}
	}

	// ---------- 分组树 ----------

	private renderTree() {
		this.treeEl.empty();
		this.renderActiveTask();

		const store = this.taskStore;
		if (!store.filePath) {
			this.countEl.setText(
				t('panel.no-file', this.plugin.settings.language),
			);
			return;
		}
		if (!store.exists) {
			this.countEl.setText(
				t('panel.file-missing', this.plugin.settings.language),
			);
			return;
		}

		const visible = this.filteredTree(store);
		this.countEl.setText(
			t('panel.tasks-count', this.plugin.settings.language, {
				count: String(collectTasks(visible).length),
			}),
		);
		this.renderGroupBlock(visible);
	}

	/** 过滤分组树：任务匹配，空分组递归隐藏（搜索/过滤时保持分组结构）。 */
	private filteredTree(store: TaskStore): TaskStore {
		if (!this.query && !this.status) {
			return store;
		}
		const matches = (item: TaskItem) => {
			let statusMatch = true;
			let textMatch = true;
			if (this.query) {
				textMatch = item.name
					.toLowerCase()
					.includes(this.query.toLowerCase());
			}
			if (this.status) {
				if (this.status === 'todo') statusMatch = !item.checked;
				if (this.status === 'completed') statusMatch = item.checked;
			}
			return statusMatch && textMatch;
		};
		const filterGroup = (group: TaskGroup): TaskGroup | null => {
			const tasks = group.tasks.filter(matches);
			const children: TaskGroup[] = [];
			for (const child of group.children) {
				const filtered = filterGroup(child);
				if (filtered) children.push(filtered);
			}
			if (tasks.length === 0 && children.length === 0) {
				return null;
			}
			return { ...group, tasks, children };
		};
		return {
			...store,
			topTasks: store.topTasks.filter(matches),
			groups: store.groups
				.map(filterGroup)
				.filter((g): g is TaskGroup => g !== null),
		};
	}

	private renderGroupBlock(store: TaskStore) {
		const list = this.treeEl.createDiv({ cls: 'pomodoro-tasks-list' });
		for (const task of store.topTasks) {
			this.renderTaskItem(list, task, 0);
		}
		for (const group of store.groups) {
			this.renderGroup(list, group, 0);
		}
		if (store.topTasks.length === 0 && store.groups.length === 0) {
			this.renderEmpty(list);
		}
	}

	private renderGroup(
		container: HTMLElement,
		group: TaskGroup,
		depth: number,
	) {
		const collapsed = this.plugin.settings.pomodoro.collapsedSections.includes(
			group.id,
		);

		const header = container.createDiv({
			cls: `pomodoro-tasks-group-header${collapsed ? ' is-collapsed' : ''}`,
		});
		header.setCssProps({ paddingLeft: `${0.5 + depth * 0.75}rem` });
		const arrow = header.createSpan({ cls: 'pomodoro-tasks-group-arrow' });
		arrow.innerHTML = ICON_ARROW;
		arrow.setCssProps({
			transform: collapsed ? '' : 'rotate(90deg)',
		});
		header.createSpan({
			cls: 'pomodoro-tasks-group-title',
			text: group.title,
		});
		const groupCount = group.tasks.length + countNestedTasks(group);
		header.createSpan({
			cls: 'pomodoro-tasks-group-count',
			text: String(groupCount),
		});
		header.addEventListener('click', () => {
			this.toggleCollapsed(group.id);
		});

		if (collapsed) {
			return;
		}

		const body = container.createDiv({
			cls: 'pomodoro-tasks-group-body',
		});
		for (const task of group.tasks) {
			this.renderTaskItem(body, task, depth + 1);
		}
		for (const child of group.children) {
			this.renderGroup(body, child, depth + 1);
		}
	}

	private toggleCollapsed(id: string) {
		const p = this.plugin.settings.pomodoro;
		const list = [...p.collapsedSections];
		const idx = list.indexOf(id);
		if (idx >= 0) {
			list.splice(idx, 1);
		} else {
			list.push(id);
		}
		p.collapsedSections = list;
		void this.plugin.saveSettings();
	}

	private renderTaskItem(
		container: HTMLElement,
		item: TaskItem,
		depth: number,
	) {
		const el = container.createDiv({
			cls: `pomodoro-tasks-item${item.checked ? ' pomodoro-tasks-checked' : ''}`,
		});
		el.setCssProps({
			paddingLeft: `${0.5 + depth * 0.75}rem`,
		});

		const progress = this.progress(item);
		el.style.background = `linear-gradient(to right, rgba(var(--color-green-rgb),0.25) ${progress}%, transparent 0%)`;

		el.addEventListener('click', () => {
			void this.tracker.active(item);
		});
		el.addEventListener('contextmenu', (e) => {
			this.showItemMenu(e, item);
		});

		const name = el.createDiv({ cls: 'pomodoro-tasks-name' });
		name.createSpan({ cls: 'pomodoro-tasks-icon' }).innerHTML = item
			.checked
			? ICON_CHECK
			: ICON_CIRCLE;

		const desc = name.createDiv({ cls: 'miyu-pomodoro-tasks-item-desc' });
		this.renderMarkdown(item.name, desc);

		el.createDiv({
			cls: 'pomodoro-tasks-progress',
			text: this.progressText(item),
		});
	}

	private renderEmpty(container: HTMLElement) {
		container.createDiv({
			cls: 'pomodoro-tasks-empty',
			text: t('panel.no-tasks', this.plugin.settings.language),
		});
	}

	private progress(item: TaskItem): number {
		if (!this.plugin.settings.pomodoro.showTaskProgress) {
			return 0;
		}
		if (item.expectedPomodoros > 0 && item.actualPomodoros >= 0) {
			return (
				(item.actualPomodoros / item.expectedPomodoros) * 100
			);
		}
		return 0;
	}

	private progressText(item: TaskItem): string {
		const { actualPomodoros, expectedPomodoros } = item;
		if (expectedPomodoros > 0) {
			const unfinished = expectedPomodoros - actualPomodoros;
			const max = Math.max(expectedPomodoros, actualPomodoros);
			if (max > 10) {
				if (unfinished > 0) {
					return `◌ x ${unfinished} 🍅 x ${actualPomodoros}`;
				}
				return `🍅 x ${expectedPomodoros}  🥫 x ${Math.abs(unfinished)}`;
			}
			if (unfinished > 0) {
				return `${'🍅'.repeat(actualPomodoros)}${'◌'.repeat(unfinished)}`;
			}
			return `${'🍅'.repeat(expectedPomodoros)}${'🥫'.repeat(
				Math.abs(unfinished),
			)}`;
		}
		return actualPomodoros > 10
			? `🍅 x ${actualPomodoros}`
			: actualPomodoros > 0
				? `${'🍅'.repeat(actualPomodoros)}`
				: `- -`;
	}

	private renderMarkdown(content: string, el: HTMLElement) {
		el.empty();
		const view = this.view as {
			renderMarkdown?: (content: string, el: HTMLElement) => void;
		};
		view.renderMarkdown?.(content, el);
	}

	private showItemMenu(e: MouseEvent, task: TaskItem) {
		const locale = this.plugin.settings.language;
		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle(t('panel.open-task', locale)).onClick(() => {
				this.tracker.openTask(e, task);
			});
		});
		menu.showAtMouseEvent(e);
	}

	private updateFilterClasses() {
		for (const [status, el] of this.filterEls) {
			el.toggleClass('filter-active', status === this.status);
		}
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.wrapper.remove();
	}
}

function countNestedTasks(group: TaskGroup): number {
	let count = 0;
	for (const child of group.children) {
		count += child.tasks.length + countNestedTasks(child);
	}
	return count;
}
