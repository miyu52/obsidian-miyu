import type { Plugin } from 'obsidian';

/**
 * Obsidian App internals that are stable at runtime but not typed in
 * the public API definitions.
 */
declare module 'obsidian' {
	interface App {
		plugins: {
			plugins: {
				[pluginId: string]: Plugin & {
					[pluginImplementations: string]: unknown;
				};
			};
		};
		internalPlugins: {
			getPluginById(
				id: string,
			):
				| {
						enabled: boolean;
						instance?: unknown;
				  }
				| undefined;
		};
	}
}
