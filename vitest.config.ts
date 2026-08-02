import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			// The `obsidian` npm package cannot be resolved by Node (its
			// package.json has no `main`/`exports`). Tests use a stub that
			// provides the subset of the API that the code under test needs.
			obsidian: fileURLToPath(
				new URL('./tests/stubs/obsidian.ts', import.meta.url),
			),
		},
	},
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
