<script lang="ts">
	export let progress: number = 0;
	export let size: number = 160;
	export let strokeWidth: number = 8;

	const r = (size - strokeWidth * 2) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const circumference = 2 * Math.PI * r;
	$: offset = circumference * (1 - progress);
</script>

<svg width={size} height={size} xmlns="http://www.w3.org/2000/svg">
	<g transform="rotate(-90 {cx} {cy})">
		<circle
			class="timer-bg"
			r={r}
			cy={cy}
			cx={cx}
			stroke-width={strokeWidth}
			fill="none"
		/>
		<circle
			class="timer-progress"
			r={r}
			cy={cy}
			cx={cx}
			stroke-width={strokeWidth}
			fill="none"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
		/>
	</g>
</svg>

<style>
	.timer-bg {
		stroke: var(--background-modifier-border);
	}
	.timer-progress {
		stroke: var(--interactive-accent);
		transition: stroke-dashoffset 0.1s linear;
	}
</style>
