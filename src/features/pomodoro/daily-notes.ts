import { App, TFile, moment } from 'obsidian';

/**
 * Minimal replacement for the `obsidian-daily-notes-interface` package
 * (deprecated, no longer maintained). Talks directly to Obsidian's internal
 * `daily-notes` / `weekly-notes` plugins, so no external dependency is needed.
 *
 * NOTE: the internal plugin instance methods are named `getDailyNote` /
 * `getAllDailyNotes` / `createDailyNote` (and `getWeeklyNote` / ... for the
 * weekly plugin) — using any other names throws at runtime.
 *
 * `weekly-notes` was removed from Obsidian core; on modern versions the
 * related helpers simply report "not loaded".
 */

interface DailyNotesApi {
	getDailyNote: (date: ReturnType<typeof moment>) => TFile | null;
	getAllDailyNotes: () => Record<string, TFile>;
	createDailyNote: (date: ReturnType<typeof moment>) => Promise<TFile>;
}

interface WeeklyNotesApi {
	getWeeklyNote: (date: ReturnType<typeof moment>) => TFile | null;
	getAllWeeklyNotes: () => Record<string, TFile>;
	createWeeklyNote: (date: ReturnType<typeof moment>) => Promise<TFile>;
}

function getNotesPlugin(
	app: App,
	id: 'daily-notes' | 'weekly-notes',
): DailyNotesApi | WeeklyNotesApi | null {
	const internal = app.internalPlugins.getPluginById(id);
	if (!internal?.enabled || !internal.instance) {
		return null;
	}
	return internal.instance as unknown as DailyNotesApi | WeeklyNotesApi;
}

export function appHasDailyNotesPluginLoaded(app: App): boolean {
	return getNotesPlugin(app, 'daily-notes') !== null;
}

export function appHasWeeklyNotesPluginLoaded(app: App): boolean {
	return getNotesPlugin(app, 'weekly-notes') !== null;
}

/** Returns today's daily note, creating it (with template) if missing. */
export async function getDailyNoteFile(
	app: App,
): Promise<TFile | null> {
	const plugin = getNotesPlugin(app, 'daily-notes') as
		| DailyNotesApi
		| null;
	if (!plugin) return null;
	const date = moment();
	const existing = plugin.getDailyNote(date);
	if (existing) return existing;
	return await plugin.createDailyNote(date);
}

/** Returns this week's weekly note, creating it (with template) if missing. */
export async function getWeeklyNoteFile(
	app: App,
): Promise<TFile | null> {
	const plugin = getNotesPlugin(app, 'weekly-notes') as
		| WeeklyNotesApi
		| null;
	if (!plugin) return null;
	const date = moment();
	const existing = plugin.getWeeklyNote(date);
	if (existing) return existing;
	return await plugin.createWeeklyNote(date);
}
