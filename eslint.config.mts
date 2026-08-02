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
		files: ['src/features/pomodoro/ui/**'],
		rules: {
			'@microsoft/sdl/no-inner-html': 'off',
			'no-unsanitized/property': 'off',
		},
	},
	{
		// Test infrastructure uses plain DOM helpers and Node built-ins —
		// the plugin-specific conventions don't apply here.
		files: ['tests/**', 'vitest.config.ts'],
		rules: {
			'obsidianmd/prefer-create-el': 'off',
			'obsidianmd/no-nodejs-modules': 'off',
			// The stub re-exports the real moment library on purpose.
			'@typescript-eslint/no-restricted-imports': 'off',
		},
	},
	{
		// display() is deprecated since 1.13.0 in favor of the declarative
		// settings API, but this plugin intentionally keeps minAppVersion
		// 1.7.2 and does NOT migrate (getSettingDefinitions would bypass
		// display() on 1.13+, forcing a full rewrite). The calls are
		// expected deprecated usage, not accidents.
		files: ['src/settings.ts', 'src/features/pomodoro/settings-ui.ts'],
		rules: {
			'@typescript-eslint/no-deprecated': 'off',
		},
	},
);
