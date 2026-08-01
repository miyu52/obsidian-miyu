<script lang="ts">
	import { TFile } from 'obsidian';
	import type MiyuPlugin from '../../../main';
	import { localeStore } from '../../../stores';
	import { t as i18nT } from '../../../i18n';
	import type { PomodoroTask, TaskHeading, ActiveTask } from '../../../types';
	import { parseTaskFile } from '../task-parser';

	export let plugin: MiyuPlugin;

	// Read from plugin settings
	let taskFilePaths: string[] = [];
	let activeTaskFilePath = '';
	let headingCollapse: Record<string, boolean> = {};
	let filterState = 'all';
	let searchQuery = '';

	// Parsed data
	let tasks: PomodoroTask[] = [];
	let headings: TaskHeading[] = [];
	let activeTask: ActiveTask | null = null;

	// i18n — explicit subscription triggers reactivity
	let locale = 'zh-CN';
	const _localeUnsub = localeStore.subscribe((l) => { locale = l; });

	function t(key: string, vars?: Record<string, string>): string {
		return i18nT(key, locale, vars);
	}

	// Settings access
	$: locale = plugin.settings.language;
	$: taskFilePaths = plugin.settings.pomodoro.taskFilePaths;
	$: activeTaskFilePath = plugin.settings.pomodoro.activeTaskFilePath ||
		(taskFilePaths.length > 0 ? taskFilePaths[0] : '');
	$: headingCollapse = plugin.settings.pomodoro.headingCollapse;
	$: filterState = plugin.settings.pomodoro.taskFilter;
	$: searchQuery = plugin.settings.pomodoro.taskSearch;
	$: activeTask = plugin.settings.pomodoro.activeTask;

	// Reload tasks when active file changes
	$: if (activeTaskFilePath) {
		loadTasks(activeTaskFilePath);
	}

	async function loadTasks(path: string) {
		const file = plugin.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			tasks = [];
			headings = [];
			return;
		}
		const content = await plugin.app.vault.cachedRead(file);
		const result = parseTaskFile(content);
		tasks = result.tasks;
		// Apply collapse state
		headings = result.headings.map(h => applyCollapse(h, path));
	}

	function applyCollapse(h: TaskHeading, filePath: string): TaskHeading {
		const key = `${filePath}::${h.text}`;
		return {
			...h,
			collapsed: headingCollapse[key] ?? false,
			children: h.children.map(c => applyCollapse(c, filePath)),
		};
	}

	// Filter tasks
	$: filteredTasks = tasks.filter(task => {
		if (filterState === 'todo' && task.checked) return false;
		if (filterState === 'done' && !task.checked) return false;
		if (searchQuery && !task.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
		return true;
	});

	// Free tasks (no heading)
	$: uncategorizedTasks = filteredTasks.filter(t => t.headingPath.length === 0);

	// Tasks grouped by heading
	function tasksUnderHeading(htext: string): PomodoroTask[] {
		return filteredTasks.filter(t =>
			t.headingPath.length > 0 && t.headingPath[t.headingPath.length - 1] === htext
		);
	}

	function activateTask(task: PomodoroTask) {
		plugin.settings.pomodoro.activeTask = {
			filePath: activeTaskFilePath,
			description: task.description,
			line: task.line,
			actual: task.actual,
			expected: task.expected,
		};
		activeTask = plugin.settings.pomodoro.activeTask;
		void plugin.saveSettings();
	}

	function isActive(task: PomodoroTask): boolean {
		return !!activeTask &&
			activeTask.line === task.line &&
			activeTask.filePath === activeTaskFilePath;
	}

	function toggleCollapse(h: TaskHeading) {
		const key = `${activeTaskFilePath}::${h.text}`;
		const newState = !(headingCollapse[key] ?? false);
		headingCollapse[key] = newState;
		headingCollapse = headingCollapse; // trigger reactivity
		plugin.settings.pomodoro.headingCollapse = { ...headingCollapse };
		void plugin.saveSettings();
	}

	function isCollapsed(h: TaskHeading): boolean {
		return headingCollapse[`${activeTaskFilePath}::${h.text}`] ?? false;
	}

	function setFilter(f: string) {
		filterState = f;
		plugin.settings.pomodoro.taskFilter = f;
		void plugin.saveSettings();
	}

	function onSearchInput(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;
		plugin.settings.pomodoro.taskSearch = searchQuery;
		void plugin.saveSettings();
	}

	function switchFile(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		activeTaskFilePath = value;
		plugin.settings.pomodoro.activeTaskFilePath = value;
		void plugin.saveSettings();
	}

	function indentStyle(level: number): string {
		return `padding-left: ${(level - 1) * 14}px`;
	}

	// i18n labels
	$: todoLabel = t('pomodoro.todo');
	$: doneLabel = t('pomodoro.done');
	$: allLabel = t('pomodoro.all');
	$: searchPlaceholder = t('pomodoro.search');
	$: noTaskLabel = t('pomodoro.no-task');
</script>

{#key locale}
<div class="miyu-task-panel">
	{#if taskFilePaths.length === 0}
		<div class="miyu-task-empty">{noTaskLabel}</div>
	{:else}
		<!-- File selector -->
		<div class="miyu-task-file-select">
			<select
				value={activeTaskFilePath}
				on:change={switchFile}
			>
				{#each taskFilePaths as path}
					<option value={path}>{path}</option>
				{/each}
			</select>
		</div>

		<!-- Filter tabs -->
		<div class="miyu-task-filters">
			<button
				class="miyu-filter-btn"
				class:active={filterState === 'all'}
				on:click={() => setFilter('all')}
			>{allLabel}</button>
			<button
				class="miyu-filter-btn"
				class:active={filterState === 'todo'}
				on:click={() => setFilter('todo')}
			>{todoLabel}</button>
			<button
				class="miyu-filter-btn"
				class:active={filterState === 'done'}
				on:click={() => setFilter('done')}
			>{doneLabel}</button>
		</div>

		<!-- Search -->
		<div class="miyu-task-search">
			<input
				type="text"
				value={searchQuery}
				on:input={onSearchInput}
				placeholder={searchPlaceholder}
			/>
		</div>

		<!-- Uncollated tasks -->
		<div class="miyu-task-list">
			{#each uncategorizedTasks as task (task.line)}
				<button
					class="miyu-task-item"
					class:miyu-task-active={isActive(task)}
					class:miyu-task-checked={task.checked}
					on:click={() => activateTask(task)}
				>
					<span class="miyu-task-check">{task.checked ? '●' : '○'}</span>
					<span class="miyu-task-desc">{task.description}</span>
					<span class="miyu-task-pomo">🍅 {task.actual}/{task.expected}</span>
				</button>
			{/each}

			<!-- Heading tree -->
			{#each headings as heading (heading.text)}
				{@const collapsed = isCollapsed(heading)}
				<div class="miyu-task-heading" style={indentStyle(heading.level)}>
					<button
						class="miyu-heading-toggle"
						on:click={() => toggleCollapse(heading)}
					>
						<span class="miyu-heading-arrow">{collapsed ? '▶' : '▼'}</span>
						<span class="miyu-heading-text">{heading.text}</span>
						<span class="miyu-heading-pomo">
							🍅 {heading.actualTotal}/{heading.expectedTotal}
						</span>
						<span class="miyu-heading-count">({heading.taskCount})</span>
					</button>
				</div>
				{#if !collapsed}
					{#each tasksUnderHeading(heading.text) as task (task.line)}
						<button
							class="miyu-task-item"
							class:miyu-task-active={isActive(task)}
							class:miyu-task-checked={task.checked}
							style={indentStyle(heading.level + 1)}
							on:click={() => activateTask(task)}
						>
							<span class="miyu-task-check">{task.checked ? '●' : '○'}</span>
							<span class="miyu-task-desc">{task.description}</span>
							<span class="miyu-task-pomo">🍅 {task.actual}/{task.expected}</span>
						</button>
					{/each}
				{/if}
			{/each}
		</div>
	{/if}
</div>
{/key}

<style>
	.miyu-task-panel {
		width: 100%;
		font-size: 0.85rem;
	}

	.miyu-task-empty {
		padding: 12px;
		color: var(--text-muted);
		text-align: center;
		font-style: italic;
	}

	.miyu-task-file-select { margin-bottom: 8px; }

	.miyu-task-file-select select {
		width: 100%;
		padding: 4px 8px;
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		background: var(--background-secondary);
		color: var(--text-normal);
		font-size: 0.85rem;
	}

	.miyu-task-filters {
		display: flex;
		gap: 2px;
		margin-bottom: 8px;
	}

	.miyu-filter-btn {
		flex: 1;
		padding: 4px 0;
		border: 1px solid var(--background-modifier-border);
		background: var(--background-secondary);
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--text-muted);
		border-radius: 4px;
	}

	.miyu-filter-btn.active {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.miyu-task-search { margin-bottom: 8px; }

	.miyu-task-search input {
		width: 100%;
		padding: 4px 8px;
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		background: var(--background-secondary);
		color: var(--text-normal);
		font-size: 0.85rem;
	}

	.miyu-task-list { width: 100%; }

	.miyu-task-heading {
		margin: 4px 0 2px;
	}

	.miyu-heading-toggle {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		padding: 3px 6px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		text-align: left;
		border-radius: 4px;
	}

	.miyu-heading-toggle:hover {
		background: var(--background-modifier-hover);
	}

	.miyu-heading-arrow {
		flex-shrink: 0;
		font-size: 0.65rem;
	}

	.miyu-heading-text {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.miyu-heading-pomo {
		flex-shrink: 0;
		font-size: 0.7rem;
		color: var(--text-faint);
	}

	.miyu-heading-count {
		flex-shrink: 0;
		font-size: 0.65rem;
		color: var(--text-faint);
	}

	.miyu-task-item {
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 3px 6px;
		border-radius: 4px;
		cursor: pointer;
		border: none;
		background: transparent;
		width: 100%;
		text-align: left;
		font-size: 0.85rem;
		color: var(--text-normal);
		line-height: 1.6;
	}

	.miyu-task-item:hover {
		background: var(--background-modifier-hover);
	}

	.miyu-task-active {
		background: rgba(var(--color-green-rgb), 0.12);
	}

	.miyu-task-checked .miyu-task-desc {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.miyu-task-check {
		flex-shrink: 0;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.miyu-task-desc {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.miyu-task-pomo {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--text-muted);
	}
</style>
