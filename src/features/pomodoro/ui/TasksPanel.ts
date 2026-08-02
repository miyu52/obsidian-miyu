import { Menu, type ItemView } from 'obsidian';
import type MiyuPlugin from '../../../main';
import { t } from '../../../i18n';
import type { Unsubscriber } from '../../../core/store';
import type Tasks from '../Tasks';
import type { TaskItem } from '../Tasks';
import type TaskTracker from '../TaskTracker';
import type { TaskTrackerState } from '../TaskTracker';
import { pomodoroSettings } from '../settings-store';

const ICON_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`;

const ICON_PIN_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-off"><line x1="2" x2="22" y1="2" y2="22"/><line x1="12" x2="12" y1="17" y2="22"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"/><path d="M15 9.34V6h1a2 2 0 0 0 0-4H7.89"/></svg>`;

const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;

const ICON_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>`;

const ICON_REMOVE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

type FilterStatus = '' | 'todo' | 'completed';

/**
 * Task list panel shown below the timer. Vanilla-TS port of the original
 * TasksComponent.svelte / TaskItemComponent.svelte.
 */
export class TasksPanel {
	private plugin: MiyuPlugin;

	private container: HTMLElement;

	private view: ItemView;

	private tasks: Tasks;

	private tracker: TaskTracker;

	private wrapper: HTMLElement;

	private pinEl: HTMLElement;

	private fileNameEl: HTMLElement;

	private countEl: HTMLElement;

	private activeArea: HTMLElement;

	private filterEls: Map<FilterStatus, HTMLElement> = new Map();

	private searchEl: HTMLInputElement;

	private listEl: HTMLElement;

	private status: FilterStatus = '';

	private query = '';

	private taskList: TaskItem[] = [];

	private trackerState: TaskTrackerState = { pinned: false };

	private unsubscribers: Unsubscriber[] = [];

	constructor(
		plugin: MiyuPlugin,
		container: HTMLElement,
		view: ItemView,
	) {
		this.plugin = plugin;
		this.container = container;
		this.view = view;
		this.tasks = plugin.pomodoro!.tasks;
		this.tracker = plugin.pomodoro!.tracker;
		const locale = plugin.settings.language;

		this.wrapper = container.createDiv({
			cls: 'pomodoro-tasks-wrapper',
		});

		const header = this.wrapper.createDiv({ cls: 'pomodoro-tasks-header' });

		const titleRow = header.createDiv({
			cls: 'pomodoro-tasks-header-title',
		});

		this.pinEl = titleRow.createSpan({ cls: 'pomodoro-tasks-pin' });
		this.pinEl.addEventListener('click', () => {
			this.tracker.togglePinned();
		});

		this.fileNameEl = titleRow.createSpan({
			cls: 'pomodoro-tasks-file-name',
		});
		this.fileNameEl.addEventListener('click', (e) => {
			this.tracker.openFile(e);
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
				this.renderList();
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
			this.renderList();
		});

		this.listEl = this.wrapper.createDiv({ cls: 'pomodoro-tasks-list' });

		this.unsubscribers.push(
			this.tracker.subscribe((state) => {
				this.trackerState = state;
				this.renderHeader();
				this.renderList();
			}),
		);
		this.unsubscribers.push(
			this.tasks.subscribe((state) => {
				this.taskList = state.list;
				this.renderList();
			}),
		);
		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.renderList();
			}),
		);

		this.renderHeader();
		this.renderList();
	}

	private get filtered(): TaskItem[] {
		return this.taskList.filter((item) => {
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
		});
	}

	private renderHeader() {
		const locale = this.plugin.settings.language;
		const tracker = this.tracker;
		this.pinEl.innerHTML = tracker.pinned ? ICON_PIN_OFF : ICON_PIN;
		const file = this.trackerState.file;
		this.wrapper.setCssProps({ display: file ? '' : 'none' });
		if (file) {
			this.fileNameEl.setText(file.name);
			this.fileNameEl.setCssProps({ display: '' });
		} else {
			this.fileNameEl.setCssProps({ display: 'none' });
		}

		const task = this.trackerState.task;
		// Keep the user's focus while typing in the active task input —
		// rebuilding it on every tracker emission would drop the cursor.
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
				const input = name.createEl('input', {
					type: 'text',
					value: task.name,
				});
				input.addEventListener('input', () => {
					this.tracker.setTaskName(input.value);
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

		const count = this.filtered.length;
		this.countEl.setText(
			t('panel.tasks-count', locale, { count: String(count) }),
		);
		this.updateFilterClasses();
	}

	private updateFilterClasses() {
		for (const [status, el] of this.filterEls) {
			el.toggleClass('filter-active', status === this.status);
		}
	}

	private renderList() {
		this.listEl.empty();
		this.renderHeader();

		for (const item of this.filtered) {
			const el = this.listEl.createDiv({
				cls: `pomodoro-tasks-item${item.checked ? ' pomodoro-tasks-checked' : ''}`,
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
			this.renderMarkdown(item.description, desc);

			el.createDiv({
				cls: 'pomodoro-tasks-progress',
				text: this.progressText(item),
			});
		}
	}

	private progress(item: TaskItem): number {
		if (!this.plugin.settings.showTaskProgress) {
			return 0;
		}
		if (item.expected > 0 && item.actual >= 0) {
			return (item.actual / item.expected) * 100;
		}
		return 0;
	}

	private progressText(item: TaskItem): string {
		let { actual, expected } = item;
		if (expected > 0) {
			let unfinished = expected - actual;
			let max = Math.max(expected, actual);
			if (max > 10) {
				if (unfinished > 0) {
					return `◌ x ${unfinished} 🍅 x ${actual}`;
				} else {
					return `🍅 x ${expected}  🥫 x ${Math.abs(unfinished)}`;
				}
			} else {
				if (unfinished > 0) {
					return `${'🍅'.repeat(actual)}${'◌'.repeat(unfinished)}`;
				} else {
					return `${'🍅'.repeat(expected)}${'🥫'.repeat(
						Math.abs(unfinished),
					)}`;
				}
			}
		} else {
			return actual > 10
				? `🍅 x ${actual}`
				: actual > 0
					? `${'🍅'.repeat(actual)}`
					: `- -`;
		}
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

	public destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.wrapper.remove();
	}
}
