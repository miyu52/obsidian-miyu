<script lang="ts">
	import type { PomodoroLog } from '../../../types';
	import type MiyuPlugin from '../../../main';

	export let plugin: MiyuPlugin;

	let t = plugin._t;
	let logs: PomodoroLog[] = [];

	$: logs = plugin.settings.pomodoro.logs;

	let currentYear: number;
	let currentMonth: number;

	const now = new Date();
	currentYear = now.getFullYear();
	currentMonth = now.getMonth();

	const monthKeys = [
		'pomodoro.month.jan', 'pomodoro.month.feb', 'pomodoro.month.mar',
		'pomodoro.month.apr', 'pomodoro.month.may', 'pomodoro.month.jun',
		'pomodoro.month.jul', 'pomodoro.month.aug', 'pomodoro.month.sep',
		'pomodoro.month.oct', 'pomodoro.month.nov', 'pomodoro.month.dec',
	];

	$: monthLabel = t(monthKeys[currentMonth]);
	$: yearLabel = currentYear.toString();

	$: dailyLogs = groupByDate(logs, currentYear, currentMonth);
	$: maxCount = Math.max(1, ...dailyLogs.map(d => d.count));
	$: chartHeight = 100;

	function groupByDate(allLogs: PomodoroLog[], year: number, month: number) {
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const result: { date: string; count: number; logs: PomodoroLog[] }[] = [];
		const map = new Map<string, PomodoroLog[]>();

		for (const log of allLogs) {
			const d = new Date(log.ts);
			if (d.getFullYear() === year && d.getMonth() === month) {
				const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
				if (!map.has(key)) map.set(key, []);
				map.get(key)!.push(log);
			}
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const dayLogs = map.get(key) ?? [];
			result.push({ date: key, count: dayLogs.length, logs: dayLogs });
		}

		return result;
	}

	function barHeight(count: number): number {
		if (count === 0) return 0;
		return Math.max(6, (count / maxCount) * chartHeight);
	}

	function prevMonth() {
		currentMonth--;
		if (currentMonth < 0) { currentMonth = 11; currentYear--; }
	}

	function nextMonth() {
		currentMonth++;
		if (currentMonth > 11) { currentMonth = 0; currentYear++; }
	}

	function totalTomatoes(): number {
		return dailyLogs.reduce((sum, d) => sum + d.count, 0);
	}

	let selectedDay: string | null = null;
	$: selectedLogs = selectedDay
		? dailyLogs.find(d => d.date === selectedDay)?.logs ?? []
		: [];
</script>

<div class="miyu-stats-panel">
	<div class="miyu-stats-nav">
		<button class="miyu-nav-btn" on:click={prevMonth}>◀</button>
		<span class="miyu-stats-month">{yearLabel} {monthLabel}</span>
		<span class="miyu-stats-total">🍅 × {totalTomatoes()}</span>
		<button class="miyu-nav-btn" on:click={nextMonth}>▶</button>
	</div>

	{#if totalTomatoes() === 0}
		<div class="miyu-stats-empty">{t('pomodoro.stats.empty')}</div>
	{:else}
		<div class="miyu-stats-chart">
			{#each dailyLogs as day}
				<div class="miyu-chart-bar-wrapper">
					<button
						class="miyu-chart-bar"
						class:selected={selectedDay === day.date}
						style="height: {barHeight(day.count)}px"
						on:click={() => selectedDay = selectedDay === day.date ? null : day.date}
						title="{day.date}: {day.count} 🍅"
					>
						{#if day.count > 0 && day.count > maxCount * 0.3}
							<span class="miyu-bar-count">{day.count}</span>
						{/if}
					</button>
				</div>
			{/each}
		</div>

		{#if selectedDay && selectedLogs.length > 0}
			<div class="miyu-stats-detail">
				<div class="miyu-stats-detail-header">{selectedDay}</div>
				{#each selectedLogs as log}
					<div class="miyu-stats-detail-item">
						<span class="miyu-stats-detail-task">
							{log.task || '—'}
						</span>
						<span class="miyu-stats-detail-minutes">
							{log.minutes} min
						</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.miyu-stats-panel { width: 100%; }

	.miyu-stats-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		padding: 0 4px;
	}

	.miyu-nav-btn {
		padding: 2px 8px;
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		background: var(--background-secondary);
		cursor: pointer;
		color: var(--text-normal);
		font-size: 0.8rem;
	}

	.miyu-stats-month { font-weight: 600; font-size: 0.9rem; }
	.miyu-stats-total { color: var(--text-muted); font-size: 0.8rem; }

	.miyu-stats-empty {
		padding: 12px;
		color: var(--text-muted);
		text-align: center;
		font-style: italic;
	}

	.miyu-stats-chart {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 110px;
		padding: 0 2px 20px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.miyu-chart-bar-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
	}

	.miyu-chart-bar {
		width: 100%;
		max-width: 14px;
		min-height: 0;
		border-radius: 2px 2px 0 0;
		border: none;
		background: var(--interactive-accent);
		opacity: 0.7;
		cursor: pointer;
		position: relative;
		padding: 0;
	}

	.miyu-chart-bar:hover { opacity: 1; }
	.miyu-chart-bar.selected {
		opacity: 1;
		outline: 2px solid var(--text-accent);
	}

	.miyu-bar-count {
		position: absolute;
		top: -14px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.miyu-stats-detail {
		margin-top: 12px;
		border-top: 1px solid var(--background-modifier-border);
		padding-top: 8px;
	}

	.miyu-stats-detail-header {
		font-weight: 600;
		font-size: 0.85rem;
		margin-bottom: 4px;
	}

	.miyu-stats-detail-item {
		display: flex;
		justify-content: space-between;
		padding: 2px 4px;
		font-size: 0.8rem;
	}

	.miyu-stats-detail-task {
		color: var(--text-normal);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.miyu-stats-detail-minutes {
		color: var(--text-muted);
		flex-shrink: 0;
		margin-left: 8px;
	}
</style>
