import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'external',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// Pomodoro UI components embed static SVG icon constants via
		// innerHTML (never user input) — safe by construction.
		files: [
			'src/features/pomodoro/ui/**',
			'src/features/pomodoro/StatusBarTimer.ts',
		],
		rules: {
			'@microsoft/sdl/no-inner-html': 'off',
			'no-unsanitized/property': 'off',
		},
	},
);
