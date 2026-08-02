import { Menu, type ItemView } from 'obsidian';
import type MiyuPlugin from '../../../main';
import { t } from '../../../i18n';
import type { Unsubscriber } from '../../../core/store';
import type { TaskGroup, TaskItem, TaskStore, TaskTrackerState } from '../types';
import type { TaskParser } from '../tasks/parser';
import { collectTasks } from '../tasks/parser';
import type { TaskTracker } from '../tasks/tracker';
import type { SessionStore } from '../stats';
import { pomodoroSettings } from '../settings';

const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;

const ICON_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>`;

const ICON_REMOVE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>`;

type FilterStatus = 'todo' | 'completed' | 'all';

const FILTER_ORDER: FilterStatus[] = ['todo', 'completed', 'all'];

/**
 * 任务面板：今日番茄钟进度卡片 + 文件下拉框 + 待办/已完成/全部过滤 +
 * 标题分组树（嵌套、可折叠、折叠状态持久化）。
 * 视觉语言与统计面板一致（圆角卡片、pill 过滤、柔和配色）。
 */
export class TasksPanel {
	private plugin: MiyuPlugin;

	private view: ItemView;

	private parser: TaskParser;

	private tracker: TaskTracker;

	private stats: SessionStore;

	private root: HTMLElement;

	private summaryValueEl: HTMLElement;

	private summaryBarFill: HTMLElement;

	private fileSelect: HTMLSelectElement;

	private countEl: HTMLElement;

	private activeEl: HTMLElement;

	private treeEl: HTMLElement;

	private searchEl: HTMLInputElement;

	private filterEls: Map<FilterStatus, HTMLElement> = new Map();

	private status: FilterStatus = 'todo';

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
		this.view = view;
		this.parser = plugin.pomodoro!.parser;
		this.tracker = plugin.pomodoro!.tracker;
		this.stats = plugin.pomodoro!.stats;
		const locale = plugin.settings.language;

		this.root = container.createDiv({ cls: 'miyu-tasks' });

		// --- 今日番茄钟进度 ---
		const summary = this.root.createDiv({ cls: 'miyu-tasks-summary' });
		summary.createSpan({
			cls: 'miyu-tasks-summary-label',
			text: t('stats.today', locale),
		});
		this.summaryValueEl = summary.createSpan({
			cls: 'miyu-tasks-summary-value',
		});
		const bar = summary.createDiv({ cls: 'miyu-tasks-summary-bar' });
		this.summaryBarFill = bar.createDiv({
			cls: 'miyu-tasks-summary-bar-fill',
		});

		// --- 文件下拉框 + 任务计数 ---
		const toolbar = this.root.createDiv({ cls: 'miyu-tasks-toolbar' });
		this.fileSelect = toolbar.createEl('select', {
			cls: 'miyu-tasks-file-select',
		});
		this.fileSelect.addEventListener('change', () => {
			plugin.settings.pomodoro.activeFile = this.fileSelect.value;
			void plugin.saveSettings();
		});
		this.countEl = toolbar.createSpan({ cls: 'miyu-tasks-count' });

		// --- 过滤 pill + 搜索 ---
		const filterRow = this.root.createDiv({ cls: 'miyu-tasks-filters' });
		for (const status of FILTER_ORDER) {
			const label =
				status === 'todo'
					? t('panel.filter.todo', locale)
					: status === 'completed'
						? t('panel.filter.completed', locale)
						: t('panel.filter.all', locale);
			const el = filterRow.createEl('button', {
				cls: `miyu-tasks-filter${status === 'todo' ? ' is-active' : ''}`,
				text: label,
			});
			el.addEventListener('click', () => {
				this.status = status;
				this.renderTree();
				this.updateFilterClasses();
			});
			this.filterEls.set(status, el);
		}
		this.searchEl = filterRow.createEl('input', {
			cls: 'miyu-tasks-search',
			type: 'search',
			attr: { placeholder: t('panel.search', locale) },
		});
		this.searchEl.addEventListener('input', () => {
			this.query = this.searchEl.value;
			this.renderTree();
		});

		// --- 活动任务 ---
		this.activeEl = this.root.createDiv({ cls: 'miyu-tasks-active' });

		// --- 分组树 ---
		this.treeEl = this.root.createDiv({ cls: 'miyu-tasks-tree' });

		this.unsubscribers.push(
			this.parser.subscribe((state) => {
				this.taskStore = state;
				this.renderFileSelect();
				this.renderSummary();
				this.renderTree();
			}),
		);
		this.unsubscribers.push(
			this.tracker.subscribe((state) => {
				this.trackerState = state;
				this.renderActive();
				this.renderTree();
			}),
		);
		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.renderFileSelect();
				this.renderSummary();
				this.renderTree();
			}),
		);

		this.renderFileSelect();
		this.renderSummary();
		this.renderActive();
		this.renderTree();
	}

	// ---------- 今日进度 ----------

	private renderSummary() {
		const goal = this.plugin.settings.pomodoro.dailyGoal;
		const count = this.stats.todayCompletedCount();
		if (goal > 0) {
			this.summaryValueEl.setText(`${count}/${goal}`);
			const pct = Math.min(100, (count / goal) * 100);
			this.summaryBarFill.setCssProps({ width: `${pct}%` });
			this.summaryValueEl.toggleClass('is-done', count >= goal);
		} else {
			this.summaryValueEl.setText(String(count));
			this.summaryBarFill.setCssProps({ width: '0%' });
			this.summaryValueEl.toggleClass('is-done', false);
		}
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

	private renderActive() {
		const task = this.trackerState.task;
		this.activeEl.empty();
		if (!task) {
			return;
		}
		const row = this.activeEl.createDiv({ cls: 'miyu-task-row is-active' });
		const icon = row.createSpan({ cls: 'miyu-task-icon' });
		icon.innerHTML = ICON_CIRCLE;
		row.createEl('input', {
			cls: 'miyu-task-name-input',
			type: 'text',
			value: task.name,
			attr: { readonly: 'readonly' },
		});
		const remove = row.createSpan({ cls: 'miyu-task-remove' });
		remove.innerHTML = ICON_REMOVE;
		remove.addEventListener('click', () => {
			this.tracker.clear();
		});
	}

	// ---------- 分组树 ----------

	private renderTree() {
		this.treeEl.empty();
		this.renderActive();

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

	/** 过滤分组树：任务匹配，空分组递归隐藏。 */
	private filteredTree(store: TaskStore): TaskStore {
		if (!this.query && this.status === 'all') {
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
			if (this.status === 'todo') statusMatch = !item.checked;
			if (this.status === 'completed') statusMatch = item.checked;
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
		for (const task of store.topTasks) {
			this.renderTaskRow(this.treeEl, task, 0);
		}
		for (const group of store.groups) {
			this.renderGroup(this.treeEl, group, 0);
		}
		if (store.topTasks.length === 0 && store.groups.length === 0) {
			this.treeEl.createDiv({
				cls: 'miyu-tasks-empty',
				text: t('panel.no-tasks', this.plugin.settings.language),
			});
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
			cls: `miyu-task-group${collapsed ? ' is-collapsed' : ''}`,
		});
		header.setCssProps({ paddingLeft: `${0.5 + depth * 0.75}rem` });
		const arrow = header.createSpan({ cls: 'miyu-task-group-arrow' });
		arrow.innerHTML = ICON_CHEVRON;
		arrow.setCssProps({ transform: collapsed ? '' : 'rotate(90deg)' });
		header.createSpan({
			cls: 'miyu-task-group-title',
			text: group.title,
		});
		const total = group.tasks.length + countNestedTasks(group);
		header.createSpan({
			cls: 'miyu-task-group-badge',
			text: String(total),
		});
		header.addEventListener('click', () => {
			this.toggleCollapsed(group.id);
		});

		if (collapsed) {
			return;
		}

		for (const task of group.tasks) {
			this.renderTaskRow(container, task, depth + 1);
		}
		for (const child of group.children) {
			this.renderGroup(container, child, depth + 1);
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

	private renderTaskRow(
		container: HTMLElement,
		item: TaskItem,
		depth: number,
	) {
		const el = container.createDiv({
			cls: `miyu-task-row${item.checked ? ' is-checked' : ''}`,
		});
		el.setCssProps({ paddingLeft: `${0.5 + depth * 0.75}rem` });

		const progress = this.progress(item);
		el.style.background = `linear-gradient(to right, rgba(var(--color-green-rgb),0.16) ${progress}%, transparent ${progress}%)`;

		el.addEventListener('click', () => {
			void this.tracker.active(item);
		});
		el.addEventListener('contextmenu', (e) => {
			this.showItemMenu(e, item);
		});

		const icon = el.createSpan({ cls: 'miyu-task-icon' });
		icon.innerHTML = item.checked ? ICON_CHECK : ICON_CIRCLE;

		const desc = el.createDiv({ cls: 'miyu-task-desc' });
		this.renderMarkdown(item.name, desc);

		el.createSpan({
			cls: 'miyu-task-pomos',
			text: this.progressText(item),
		});
	}

	private progress(item: TaskItem): number {
		if (!this.plugin.settings.pomodoro.showTaskProgress) {
			return 0;
		}
		if (item.expectedPomodoros > 0 && item.actualPomodoros >= 0) {
			return (item.actualPomodoros / item.expectedPomodoros) * 100;
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
				: '';
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
			el.toggleClass('is-active', status === this.status);
		}
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.root.remove();
	}
}

function countNestedTasks(group: TaskGroup): number {
	let count = 0;
	for (const child of group.children) {
		count += child.tasks.length + countNestedTasks(child);
	}
	return count;
}
