<script lang="ts">
	import { onMount } from 'svelte';
	import TimerCircle from './TimerCircle.svelte';
	import TaskPanel from './TaskPanel.svelte';
	import StatsPanel from './StatsPanel.svelte';
	import type { PomodoroTimer } from '../timer';
	import type { TimerDisplay, PanelMode } from '../../../types';
	import type MiyuPlugin from '../../../main';
	import { localeStore } from '../../../stores';
	import { t as i18nT } from '../../../i18n';

	export let plugin: MiyuPlugin;
	export let timer: PomodoroTimer;

	let display: TimerDisplay = timer.getDisplay();
	let panelMode: PanelMode = 'none';

	// i18n — explicit subscription triggers Svelte reactivity
	let locale = 'zh-CN';
	onMount(() => {
		return localeStore.subscribe((l) => {
			locale = l;
		});
	});

	function t(key: string, vars?: Record<string, string>): string {
		return i18nT(key, locale, vars);
	}

	// Timer subscription
	const unsub = timer.onTick((d) => {
		display = d;
	});

	$: modeLabel = display.mode === 'WORK'
		? t('pomodoro.work')
		: t('pomodoro.break');
	$: modeEmoji = display.mode === 'WORK' ? '🍅' : '🥤';
	$: runningLabel = display.running
		? t('pomodoro.pause')
		: display.sessionStarted
			? t('pomodoro.resume')
			: t('pomodoro.start');

	function togglePanel(mode: PanelMode) {
		panelMode = panelMode === mode ? 'none' : mode;
		plugin.settings.pomodoro.panelMode = panelMode;
		void plugin.saveSettings();
	}

	// Restore panel mode from settings
	panelMode = plugin.settings.pomodoro.panelMode;
</script>

<div class="miyu-pomodoro">
	<!-- Active task -->
	<div class="miyu-active-task">
		{#if plugin.settings.pomodoro.activeTask}
			<span class="miyu-active-task-icon">📋</span>
			<span class="miyu-active-task-text">{plugin.settings.pomodoro.activeTask.description}</span>
			<span class="miyu-active-task-count">
				🍅 {plugin.settings.pomodoro.activeTask.actual}/{plugin.settings.pomodoro.activeTask.expected}
			</span>
		{:else}
			<span class="miyu-active-task-empty">{t('pomodoro.no-task')}</span>
		{/if}
	</div>

	<!-- Timer circle -->
	<div class="miyu-timer-area">
		<div class="miyu-timer-circle">
			<TimerCircle progress={display.progress} />
			<div class="miyu-timer-display">
				<div class="miyu-timer-mode">
					{#if display.running}
						<span class="miyu-timer-dot"></span>
					{/if}
					<span class="miyu-timer-mode-text">
						{modeEmoji} {modeLabel}
					</span>
				</div>
				<div class="miyu-timer-time">
					{display.remainedHuman}
				</div>
			</div>
		</div>
	</div>

	<!-- Buttons -->
	<div class="miyu-timer-buttons">
		<button
			class="miyu-btn"
			class:active={panelMode === 'tasks'}
			on:click={() => togglePanel('tasks')}
			title={t('pomodoro.tasks')}
		>📋</button>
		<button
			class="miyu-btn miyu-btn-primary"
			on:click={() => timer.toggleTimer()}
		>
			{display.running ? '⏸' : '▶'} {runningLabel}
		</button>
		<button
			class="miyu-btn"
			on:click={() => timer.reset()}
			title={t('pomodoro.reset')}
		>↺</button>
		<button
			class="miyu-btn"
			class:active={panelMode === 'stats'}
			on:click={() => togglePanel('stats')}
			title={t('pomodoro.stats')}
		>📊</button>
	</div>

	<!-- Panels -->
	{#if panelMode === 'tasks'}
		<div class="miyu-panel">
			<TaskPanel {plugin} />
		</div>
	{:else if panelMode === 'stats'}
		<div class="miyu-panel">
			<StatsPanel {plugin} />
		</div>
	{/if}
</div>

<style>
	.miyu-pomodoro {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 8px;
		height: 100%;
		overflow-y: auto;
	}

	.miyu-active-task {
		width: 100%;
		padding: 4px 12px;
		margin-bottom: 8px;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--background-secondary);
		border-radius: 6px;
		min-height: 28px;
		flex-shrink: 0;
	}

	.miyu-active-task-icon { flex-shrink: 0; }

	.miyu-active-task-text {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.miyu-active-task-count {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.miyu-active-task-empty {
		color: var(--text-muted);
		font-style: italic;
	}

	.miyu-timer-area {
		margin-bottom: 12px;
		flex-shrink: 0;
	}

	.miyu-timer-circle {
		position: relative;
		width: 160px;
		height: 160px;
	}

	.miyu-timer-display {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		pointer-events: none;
	}

	.miyu-timer-mode {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.miyu-timer-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-green);
		animation: miyu-blink 1s infinite;
	}

	@keyframes miyu-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	.miyu-timer-mode-text { font-weight: 500; }

	.miyu-timer-time {
		font-size: 1.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.miyu-timer-buttons {
		display: flex;
		gap: 6px;
		align-items: center;
		margin-bottom: 12px;
		flex-shrink: 0;
	}

	.miyu-btn {
		padding: 6px 10px;
		border: 1px solid var(--background-modifier-border);
		border-radius: 6px;
		background: var(--background-secondary);
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--text-normal);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.miyu-btn:hover { background: var(--background-modifier-hover); }

	.miyu-btn.active {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.miyu-btn-primary {
		font-weight: 600;
		padding: 6px 16px;
	}

	.miyu-panel {
		width: 100%;
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}
</style>
