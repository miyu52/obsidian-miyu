<script lang="ts">
	import type { TimerDisplay, TimerMode } from '../../../types';

	export let display: TimerDisplay;
	export let onToggle: () => void;
	export let onReset: () => void;
</script>

{#if display.sessionStarted}
	<span class="miyu-statusbar" on:click={onToggle} on:contextmenu|preventDefault={onReset}>
		<span class="miyu-statusbar-icon">
			{display.mode === 'WORK' ? '🍅' : '🥤'}
		</span>
		<span class="miyu-statusbar-time">
			{display.remainedHuman}
		</span>
	</span>
{/if}

<style>
	.miyu-statusbar {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		cursor: pointer;
		padding: 0 6px;
	}

	.miyu-statusbar:hover {
		background: var(--background-modifier-hover);
		border-radius: 4px;
	}

	.miyu-statusbar-icon {
		font-size: 0.85rem;
	}

	.miyu-statusbar-time {
		font-variant-numeric: tabular-nums;
		font-size: 0.85rem;
	}
</style>
