import { Menu, TFile, type ItemView } from 'obsidian';
import type MiyuPlugin from '../../../main';
import type { Unsubscriber } from '../../../core/store';
import type { TaskFilter, TaskGroup, TaskItem, TaskStore, TaskTrackerState } from '../types';
import type { TaskParser } from '../tasks/parser';
import { collectTasks } from '../tasks/parser';
import type { TaskTracker } from '../tasks/tracker';
import type { SessionStore } from '../stats';
import { pomodoroSettings } from '../settings';
import { FileSuggestModal } from '../../../ui/FileSuggestModal';

const ICON_TASK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-todo"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`;

const ICON_FILE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;

const ICON_REMOVE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

const ICON_SEARCH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

const ICON_CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;

const ICON_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;

const ICON_FOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 27 24" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" class="svg-icon folder"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/><path d="M2 10h20"/></svg>`;

const ICON_FOLDER_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-open"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`;

const FILTER_ORDER: TaskFilter[] = ['todo', 'completed', 'all'];

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

	private fileSelectBtn: HTMLButtonElement;

	private fileSelectLabel: HTMLElement;

	private fileSelectArrow: HTMLElement;

	private openBtn: HTMLButtonElement;

	private countEl: HTMLElement;

	private activeEl: HTMLElement;

	private treeEl: HTMLElement;

	private searchEl: HTMLInputElement;

	private filterLabelEl: HTMLElement;

	private status: TaskFilter = 'todo';

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

		this.status = plugin.settings.pomodoro.taskFilter;

		this.root = container.createDiv({ cls: 'miyu-tasks' });

		// --- 今日番茄钟进度 ---
		const summary = this.root.createDiv({ cls: 'miyu-tasks-summary' });
		summary.createSpan({
			cls: 'miyu-tasks-summary-label',
			text: this.plugin.t('stats.today'),
		});
		this.summaryValueEl = summary.createSpan({
			cls: 'miyu-tasks-summary-value',
		});
		const bar = summary.createDiv({ cls: 'miyu-tasks-summary-bar' });
		this.summaryBarFill = bar.createDiv({
			cls: 'miyu-tasks-summary-bar-fill',
		});

		// --- 文件选择按钮 + 打开源文件 + 任务计数 ---
		const toolbar = this.root.createDiv({ cls: 'miyu-tasks-toolbar' });
		this.fileSelectBtn = toolbar.createEl('button', {
			cls: 'miyu-tasks-file-select',
			attr: { 'aria-label': this.plugin.t('panel.select-file') },
		});
		const fileIcon = this.fileSelectBtn.createSpan({
			cls: 'miyu-tasks-file-select-icon',
		});
		fileIcon.innerHTML = ICON_FILE;
		this.fileSelectLabel = this.fileSelectBtn.createSpan({
			cls: 'miyu-tasks-file-select-label',
		});
		this.fileSelectArrow = this.fileSelectBtn.createSpan({
			cls: 'miyu-tasks-file-select-arrow',
		});
		this.fileSelectArrow.innerHTML = ICON_CHEVRON_DOWN;
		this.fileSelectBtn.addEventListener('click', () => {
			this.showFileMenu();
		});
		this.openBtn = toolbar.createEl('button', {
			cls: 'miyu-tasks-open',
			attr: { 'aria-label': this.plugin.t('panel.open-source') },
		});
		const openIcon = this.openBtn.createSpan({ cls: 'miyu-tasks-open-icon' });
		openIcon.innerHTML = ICON_OPEN;
		this.openBtn.addEventListener('click', () => {
			this.openActiveFile();
		});
		this.countEl = toolbar.createSpan({ cls: 'miyu-tasks-count' });

		// --- 过滤循环控件（居中，◀/▶ 循环切换） + 搜索框 ---
		const filterRow = this.root.createDiv({ cls: 'miyu-tasks-filters' });
		const prevBtn = filterRow.createEl('button', {
			cls: 'miyu-tasks-filter-nav',
			attr: { 'aria-label': this.plugin.t('panel.filter.prev') },
		});
		prevBtn.setText('◀');
		prevBtn.addEventListener('click', () => {
			this.cycleFilter(-1);
		});
		this.filterLabelEl = filterRow.createSpan({
			cls: 'miyu-tasks-filter-label',
			text: this.filterLabelText(),
		});
		const nextBtn = filterRow.createEl('button', {
			cls: 'miyu-tasks-filter-nav',
			attr: { 'aria-label': this.plugin.t('panel.filter.next') },
		});
		nextBtn.setText('▶');
		nextBtn.addEventListener('click', () => {
			this.cycleFilter(1);
		});

		const searchRow = this.root.createDiv({
			cls: 'miyu-tasks-search-row',
		});
		const searchIcon = searchRow.createSpan({
			cls: 'miyu-tasks-search-icon',
		});
		searchIcon.innerHTML = ICON_SEARCH;
		this.searchEl = searchRow.createEl('input', {
			cls: 'miyu-tasks-search',
			type: 'search',
			attr: { placeholder: this.plugin.t('panel.search') },
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
			pomodoroSettings.subscribe((p) => {
				if (p.taskFilter !== this.status) {
					this.status = p.taskFilter;
					this.filterLabelEl.setText(this.filterLabelText());
				}
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

	// ---------- 文件选择 ----------

	private renderFileSelect() {
		const p = this.plugin.settings.pomodoro;

		if (p.activeFile) {
			const name = p.activeFile.split('/').pop() ?? p.activeFile;
			this.fileSelectLabel.setText(name);
			this.fileSelectLabel.setAttribute('title', p.activeFile);
		} else {
			this.fileSelectLabel.setText(this.plugin.t('panel.select-file'));
			this.fileSelectLabel.removeAttribute('title');
		}
		this.openBtn.style.display = p.activeFile ? '' : 'none';
	}

	private showFileMenu() {

		const p = this.plugin.settings.pomodoro;
		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle(this.plugin.t('panel.select-file')).onClick(() => {
				new FileSuggestModal(this.plugin.app, (file) => {
					if (!p.files.includes(file.path)) {
						p.files.push(file.path);
					}
					p.activeFile = file.path;
					void this.plugin.saveSettings();
				}).open();
			});
		});
		if (p.files.length > 0) {
			menu.addSeparator();
		}
		for (const path of p.files) {
			menu.addItem((item) => {
				item
					.setTitle(path)
					.setChecked(path === p.activeFile)
					.onClick(() => {
						p.activeFile = path;
						void this.plugin.saveSettings();
					});
			});
		}
		if (p.files.length === 0) {
			menu.addItem((item) =>
				item
					.setTitle(this.plugin.t('panel.select-file-empty'))
					.setDisabled(true),
			);
		}
		const rect = this.fileSelectBtn.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	private openActiveFile() {
		const path = this.plugin.settings.pomodoro.activeFile;
		if (!path) {
			return;
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			void this.plugin.app.workspace.getLeaf('tab').openFile(file);
		}
	}

	// ---------- 活动任务 ----------

	private renderActive() {
		const task = this.trackerState.task;
		this.activeEl.empty();
		if (!task) {
			return;
		}
		const row = this.activeEl.createDiv({
			cls: 'miyu-task-row is-active',
		});
		const icon = row.createSpan({ cls: 'miyu-task-icon' });
		icon.innerHTML = ICON_TASK;
		row.createSpan({
			cls: 'miyu-task-active-name',
			text: task.name,
		});
		const remove = row.createSpan({ cls: 'miyu-task-remove' });
		remove.innerHTML = ICON_REMOVE;
		remove.addEventListener('click', () => {
			this.tracker.clear();
		});
		row.addEventListener('contextmenu', (e) => {
			this.showItemMenu(e, task);
		});
	}

	// ---------- 分组树 ----------

	private renderTree() {
		this.treeEl.empty();
		this.renderActive();

		const store = this.taskStore;
		if (!store.filePath) {
			this.countEl.setText(
				this.plugin.t('panel.no-file'),
			);
			return;
		}
		if (!store.exists) {
			this.countEl.setText(
				this.plugin.t('panel.file-missing'),
			);
			return;
		}

		const visible = this.filteredTree(store);
		this.countEl.setText(
			this.plugin.t('panel.tasks-count', {
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
			this.renderTaskRow(this.treeEl, task);
		}
		for (const group of store.groups) {
			this.renderGroup(this.treeEl, group);
		}
		if (store.topTasks.length === 0 && store.groups.length === 0) {
			this.treeEl.createDiv({
				cls: 'miyu-tasks-empty',
				text: this.plugin.t('panel.no-tasks'),
			});
		}
	}

	private renderGroup(container: HTMLElement, group: TaskGroup) {
		// 默认折叠：展开状态才持久化（expandedSections）
		const expanded = this.plugin.settings.pomodoro.expandedSections.includes(
			group.id,
		);

		const folder = container.createDiv({
			cls: `miyu-task-group${expanded ? '' : ' is-collapsed'}`,
		});
		const header = folder.createDiv({ cls: 'miyu-task-group-title' });
		const icon = header.createSpan({ cls: 'miyu-task-group-icon' });
		icon.innerHTML = expanded ? ICON_FOLDER_OPEN : ICON_FOLDER;
		header.createDiv({
			cls: 'miyu-task-group-label',
			text: group.title,
		});
		const total = group.tasks.length + countNestedTasks(group);
		header.createSpan({
			cls: 'miyu-task-group-badge',
			text: String(total),
		});
		header.addEventListener('click', () => {
			this.toggleExpanded(group.id);
		});

		if (!expanded) {
			return;
		}

		const children = folder.createDiv({ cls: 'miyu-task-children' });
		for (const task of group.tasks) {
			this.renderTaskRow(children, task);
		}
		for (const child of group.children) {
			this.renderGroup(children, child);
		}
	}

	private toggleExpanded(id: string) {
		const p = this.plugin.settings.pomodoro;
		const list = [...p.expandedSections];
		const idx = list.indexOf(id);
		if (idx >= 0) {
			list.splice(idx, 1);
		} else {
			list.push(id);
		}
		p.expandedSections = list;
		void this.plugin.saveSettings();
	}

	private renderTaskRow(container: HTMLElement, item: TaskItem) {
		const isActive =
			this.trackerState.task?.blockLink &&
			this.trackerState.task.blockLink === item.blockLink;
		const el = container.createDiv({
			cls: `miyu-task-row${item.checked ? ' is-checked' : ''}${isActive ? ' is-active' : ''}`,
		});

		el.style.setProperty(
			'--miyu-progress',
			`${this.progress(item)}%`,
		);

		el.addEventListener('click', () => {
			void this.tracker.active(item);
		});
		el.addEventListener('contextmenu', (e) => {
			this.showItemMenu(e, item);
		});

		const icon = el.createSpan({ cls: 'miyu-task-icon' });
		icon.innerHTML = ICON_TASK;

		const desc = el.createDiv({ cls: 'miyu-task-desc' });
		this.renderMarkdown(item.name, desc);

		const pomos = this.progressText(item);
		if (this.plugin.settings.pomodoro.showTaskProgress && pomos) {
			el.createSpan({
				cls: 'miyu-task-pomos',
				text: pomos,
			});
		}
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
			const finished = Math.min(actualPomodoros, expectedPomodoros);
			const left = expectedPomodoros - finished;
			if (finished > 0 && left > 0) {
				return `${finished}/${expectedPomodoros}`;
			}
			if (left > 0) {
				return `0/${expectedPomodoros}`;
			}
			if (actualPomodoros > expectedPomodoros) {
				return `${expectedPomodoros}/${expectedPomodoros}+${actualPomodoros - expectedPomodoros}`;
			}
			return `${expectedPomodoros}/${expectedPomodoros}`;
		}
		return actualPomodoros > 0 ? String(actualPomodoros) : '';
	}

	private renderMarkdown(content: string, el: HTMLElement) {
		el.empty();
		const view = this.view as {
			renderMarkdown?: (content: string, el: HTMLElement) => void;
		};
		view.renderMarkdown?.(content, el);
	}

	private showItemMenu(e: MouseEvent, task: TaskItem) {

		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle(this.plugin.t('panel.open-task')).onClick(() => {
				void this.tracker.openTask(e, task);
			});
		});
		menu.addItem((item) => {
			item
				.setTitle(
					this.plugin.t(
						task.checked
							? 'panel.uncomplete-task'
							: 'panel.complete-task',
					),
				)
				.onClick(() => {
					void this.tracker.toggleComplete(task, !task.checked);
				});
		});
		menu.showAtMouseEvent(e);
	}

	private filterLabelText(): string {

		return this.status === 'todo'
			? this.plugin.t('panel.filter.todo')
			: this.status === 'completed'
				? this.plugin.t('panel.filter.completed')
				: this.plugin.t('panel.filter.all');
	}

	private cycleFilter(dir: number) {
		const idx = FILTER_ORDER.indexOf(this.status);
		const next =
			FILTER_ORDER[
				(idx + dir + FILTER_ORDER.length) % FILTER_ORDER.length
			] ?? this.status;
		this.status = next;
		this.plugin.settings.pomodoro.taskFilter = next;
		void this.plugin.saveSettings();
		this.filterLabelEl.setText(this.filterLabelText());
		this.renderTree();
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
