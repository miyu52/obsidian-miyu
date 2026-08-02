/**
 * Minimal reactive store (writable / derived), modeled on svelte/store.
 * Enough for features that need observable state without pulling in
 * a framework dependency. Do NOT add dependencies here.
 */

export type Subscriber<T> = (value: T) => void;

export type Unsubscriber = () => void;

export interface Readable<T> {
	subscribe(run: Subscriber<T>): Unsubscriber;
}

export interface Writable<T> extends Readable<T> {
	set(value: T): void;
	update(fn: (value: T) => T): void;
}

/** Create a store whose value can be replaced or updated. */
export function writable<T>(value: T): Writable<T> {
	const subscribers = new Set<Subscriber<T>>();
	return {
		subscribe(run) {
			subscribers.add(run);
			run(value);
			return () => {
				subscribers.delete(run);
			};
		},
		set(v: T) {
			value = v;
			for (const run of subscribers) run(value);
		},
		update(fn: (value: T) => T) {
			value = fn(value);
			for (const run of subscribers) run(value);
		},
	};
}

/** Derive a new store from a source store. Re-computes on source emission. */
export function derived<S, T>(
	store: Readable<S>,
	fn: (value: S) => T,
): Readable<T> {
	let value!: T;
	let unsubSource: Unsubscriber | null = null;
	const subscribers = new Set<Subscriber<T>>();
	return {
		subscribe(run) {
			const first = subscribers.size === 0;
			subscribers.add(run);
			if (first) {
				unsubSource = store.subscribe((s) => {
					value = fn(s);
					for (const r of subscribers) r(value);
				});
			} else {
				run(value);
			}
			return () => {
				subscribers.delete(run);
				if (subscribers.size === 0 && unsubSource) {
					unsubSource();
					unsubSource = null;
				}
			};
		},
	};
}
