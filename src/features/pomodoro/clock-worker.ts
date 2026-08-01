/**
 * Web Worker for the pomodoro timer.
 * Uses requestAnimationFrame for smooth updates.
 * The main thread computes elapsed time using absolute timestamps,
 * so the worker's role is simply to trigger refresh callbacks.
 */

const workerCode = `
let running = false;
let interval = 0;
let prev: number | undefined;
let lowFps = false;

function tick(t: number): void {
	if (!running) return;
	if (prev === undefined) {
		prev = t;
		requestAnimationFrame(tick);
		return;
	}
	interval += t - prev;
	if (lowFps) {
		if (interval >= 1000) {
			self.postMessage(interval);
			interval = 0;
		}
	} else {
		self.postMessage(t - prev);
	}
	prev = t;
	requestAnimationFrame(tick);
}

self.onmessage = ({ data }: MessageEvent) => {
	if (data.start) {
		lowFps = data.lowFps;
		if (!running) {
			running = true;
			interval = 0;
			prev = undefined;
			requestAnimationFrame(tick);
		}
	} else {
		running = false;
		prev = undefined;
	}
};
`;

export function createClockWorker(): Worker {
	const blob = new Blob([workerCode], { type: 'application/javascript' });
	return new Worker(URL.createObjectURL(blob));
}
