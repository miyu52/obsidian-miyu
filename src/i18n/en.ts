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
	'settings.section.pomodoro': 'Pomodoro timer',
	'settings.work-minutes.name': 'Work length',
	'settings.work-minutes.desc': 'Minutes per work session',
	'settings.break-minutes.name': 'Break length',
	'settings.break-minutes.desc':
		'Minutes per break (set to 0 to always work without breaks)',
	'settings.auto-start-next.name': 'Auto-start next session',
	'settings.auto-start-next.desc':
		'Automatically start the next session when the current one ends',
	'settings.status-bar-timer.name': 'Enable status bar timer',
	'settings.status-bar-timer.desc':
		'Show the timer in the status bar (left-click toggles, right-click for menu)',
	'settings.low-fps.name': 'Low animation FPS',
	'settings.low-fps.desc':
		'If you encounter high CPU usage, enable this to lower the animation FPS and save CPU resources',

	// Settings — Notification section
	'settings.system-notification.name': 'Use system notification',
	'settings.notification-sound.name': 'Sound notification',
	'settings.custom-sound.name': 'Custom notification audio',
	'settings.custom-sound.desc': 'Path to an audio file in the vault',
	'settings.custom-sound.placeholder': 'path/to/sound.mp3',
	'settings.custom-sound.play': 'Play',

	// Settings — Task section
	'settings.task-tracking.name': 'Enable task tracking',
	'settings.task-tracking.desc':
		'Important: Enabling this feature will automatically add a block ID when activating a task, unless a block ID is already present.',
	'settings.task-progress.name': 'Show task pomodoro counts',
	'settings.task-progress.desc':
		'Shows the pomodoro count (e.g. 2/3) and a progress gradient on task rows. Hides both when off',
	'settings.task-format.name': 'Task format',
	'settings.task-format.tasks': 'Tasks Emoji Format',
	'settings.task-format.dataview': 'Dataview',

	// Settings — Goal section
	'settings.daily-goal.name': 'Daily pomodoro goal',
	'settings.daily-goal.desc':
		'Number of completed work sessions per day (0 = disabled)',
	'settings.week-start.name': 'Start week on',
	'settings.week-start.desc':
		'Choose what day of the week to start. Select Locale default to use the default specified by moment.js',
	'settings.week-start.locale': 'Locale default ({day})',
	// Settings — Files section
	'settings.files.name': 'Task files',
	'settings.files.desc':
		'Markdown files whose tasks are tracked by the pomodoro panel. The active file is chosen from the panel dropdown.',
	'settings.files.add': 'Add file…',
	'settings.files.remove': 'Remove',
	'settings.files.empty': 'No files added yet',

	// Settings — Misc
	// Command names
	'command.generate-random-note': 'Generate note with random name',
	'command.toggle-timer': 'Toggle timer',
	'command.toggle-timer-panel': 'Toggle timer panel',
	'command.reset-timer': 'Reset timer',
	'command.toggle-mode': 'Toggle timer mode',

	// Ribbon
	'ribbon.toggle-timer-panel': 'Toggle timer panel',

	// Timer view
	'view.timer.title': 'Timer',

	// Timer modes
	'mode.work': 'Work',
	'mode.break': 'Break',

	// Timer panel
	'panel.tasks': 'Tasks',
	'panel.start': 'Start',
	'panel.pause': 'Pause',
	'panel.reset': 'Reset',
	'panel.settings': 'Settings',
	'panel.stats': 'Statistics',
	'panel.settings.sound': 'Notification Sound',
	'panel.select-file': 'Select file…',
	'panel.select-file-empty': 'No files added',
	'panel.open-source': 'Open source file',
	'panel.no-file': 'No file selected',
	'panel.file-missing': 'File not found',
	'panel.no-tasks': 'No tasks',
	'panel.tasks-count': '{count} tasks',
	'panel.search': 'Search...',
	'panel.filter.all': 'All',
	'panel.filter.todo': 'Todo',
	'panel.filter.completed': 'Completed',
	'panel.filter.prev': 'Previous filter',
	'panel.filter.next': 'Next filter',
	'panel.open-task': 'Open',

	// Statistics panel
	'stats.today': 'Today',
	'stats.week': 'This week',
	'stats.month': 'This month',
	'stats.total': 'Total',
	'stats.prev-week': 'Previous week',
	'stats.next-week': 'Next week',
	'stats.year-today': 'Up to now',
	'stats.prev-year': 'Previous year',
	'stats.next-year': 'Next year',
	'stats.less': 'Less',
	'stats.more': 'More',
	'stats.weekday.0': 'Sun',
	'stats.weekday.1': 'Mon',
	'stats.weekday.2': 'Tue',
	'stats.weekday.3': 'Wed',
	'stats.weekday.4': 'Thu',
	'stats.weekday.5': 'Fri',
	'stats.weekday.6': 'Sat',
	'stats.day-total': '{count} pomodoros',
	'stats.empty': 'No records',
	'stats.no-task': '(No task)',

	// Status bar menu
	'statusbar.start': 'Start',
	'statusbar.pause': 'Pause',
	'statusbar.resume': 'Resume',
	'statusbar.reset': 'Reset',
	'statusbar.switch-mode': 'Switch to {mode}',
	'statusbar.autostart': 'Auto-start',
	'statusbar.sound': 'Sound',

	// Notices
	'notice.note-opened': 'Opened new note: {name}',
	'notice.timer-reset': 'Timer reset',
	'notice.timer-mode': 'Timer mode: {mode}',
	'notice.pomodoro.title': 'Pomodoro Timer',
	'notice.pomodoro.work':
		'🍅 You have been working for {duration} minutes.',
	'notice.pomodoro.break':
		'🥤 You have been breaking for {duration} minutes.',

	// Errors
	'error.create-failed': 'Failed to create random note: {error}',
	'error.max-retries':
		'Failed to generate a unique file name after 3 attempts.',
	'error.no-charset': 'At least one character set must be enabled.',
};
