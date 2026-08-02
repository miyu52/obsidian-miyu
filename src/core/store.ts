/**
 * Minimal reactive store (writable), modeled on svelte/store.
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
