/** English locale strings for Miyu plugin. */
export const en: Record<string, string> = {
	// Settings — Language
	'settings.language.name': 'Language',
	'settings.language.desc':
		'Interface language. Command names update after plugin reload.',

	// Settings — Random file section
	'settings.section.random-file': 'Random file name',
	'settings.random-length.name': 'Length',
	'settings.random-length.desc':
		'Number of characters in the random string (1–64)',
	'settings.random-uppercase.name': 'Uppercase letters',
	'settings.random-uppercase.desc': 'Include A–Z',
	'settings.random-lowercase.name': 'Lowercase letters',
	'settings.random-lowercase.desc': 'Include a–z',
	'settings.random-numbers.name': 'Numbers',
	'settings.random-numbers.desc': 'Include 0–9',
	'settings.random-symbols.name': 'Symbols',
	'settings.random-symbols.desc':
		'Include ! @ # $ % ^ & ( ) - _ [ ] { } + =',

	// Settings — Pomodoro section
	'settings.section.pomodoro': 'Pomodoro Timer',
	'settings.task-file-paths.name': 'Task files',
	'settings.task-file-paths.desc':
		'Markdown files containing tasks for pomodoro tracking. One path per line.',
	'settings.work-minutes.name': 'Work duration',
	'settings.work-minutes.desc': 'Minutes per work session (1–120)',
	'settings.break-minutes.name': 'Break duration',
	'settings.break-minutes.desc':
		'Minutes per break session (0 = skip breaks)',
	'settings.auto-start.name': 'Auto-start',
	'settings.auto-start.desc':
		'Automatically start the next session when time is up',
	'settings.notification-sound.name': 'Notification sound',
	'settings.notification-sound.desc': 'Play a sound when a session ends',
	'settings.show-status-bar.name': 'Show in status bar',
	'settings.show-status-bar.desc':
		'Display a timer in the Obsidian status bar',
	'settings.low-frame-rate.name': 'Low frame rate',
	'settings.low-frame-rate.desc':
		'Reduce animation FPS to save CPU (useful on mobile)',

	// Command names
	'command.generate-random-note': 'Generate note with random name',
	'command.toggle-timer': 'Toggle pomodoro timer',
	'command.toggle-timer-panel': 'Toggle pomodoro panel',
	'command.reset-timer': 'Reset pomodoro timer',

	// Pomodoro UI
	'pomodoro.work': 'Work',
	'pomodoro.break': 'Break',
	'pomodoro.start': 'Start',
	'pomodoro.pause': 'Pause',
	'pomodoro.resume': 'Resume',
	'pomodoro.reset': 'Reset',
	'pomodoro.no-task': 'Click a task to track',
	'pomodoro.tasks': 'Tasks',
	'pomodoro.stats': 'Stats',
	'pomodoro.todo': 'Todo',
	'pomodoro.done': 'Done',
	'pomodoro.all': 'All',
	'pomodoro.search': 'Search...',
	'pomodoro.actual': 'Actual',
	'pomodoro.expected': 'Expected',
	'pomodoro.uncategorized': 'Uncategorized',
	'pomodoro.work-complete': 'Focus session complete ({minutes} min)',
	'pomodoro.break-complete': 'Break complete ({minutes} min)',
	'pomodoro.month.jan': 'Jan',
	'pomodoro.month.feb': 'Feb',
	'pomodoro.month.mar': 'Mar',
	'pomodoro.month.apr': 'Apr',
	'pomodoro.month.may': 'May',
	'pomodoro.month.jun': 'Jun',
	'pomodoro.month.jul': 'Jul',
	'pomodoro.month.aug': 'Aug',
	'pomodoro.month.sep': 'Sep',
	'pomodoro.month.oct': 'Oct',
	'pomodoro.month.nov': 'Nov',
	'pomodoro.month.dec': 'Dec',
	'pomodoro.stats.empty': 'No pomodoro data yet',

	// Random file notices
	'notice.note-opened': 'Opened new note: {name}',
	'error.create-failed': 'Failed to create random note: {error}',
	'error.max-retries':
		'Failed to generate a unique file name after 3 attempts.',
	'error.no-charset': 'At least one character set must be enabled.',
};
