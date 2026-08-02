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
	'settings.work-len.name': 'Work length',
	'settings.work-len.desc': 'Minutes per work session',
	'settings.break-len.name': 'Break length',
	'settings.break-len.desc':
		'Minutes per break (set to 0 to always work without breaks)',
	'settings.autostart.name': 'Auto-start next session',
	'settings.autostart.desc':
		'Automatically start the next session when the current one ends',
	'settings.status-bar-timer.name': 'Enable status bar timer',
	'settings.status-bar-timer.desc':
		'Show the timer in the status bar (left-click toggles, right-click for menu)',
	'settings.low-fps.name': 'Low animation FPS',
	'settings.low-fps.desc':
		'If you encounter high CPU usage, enable this to lower the animation FPS and save CPU resources',

	// Settings — Notification section
	'settings.section.notification': 'Notification',
	'settings.system-notification.name': 'Use system notification',
	'settings.notification-sound.name': 'Sound notification',
	'settings.custom-sound.name': 'Custom notification audio',
	'settings.custom-sound.desc': 'Path to an audio file in the vault',
	'settings.custom-sound.placeholder': 'path/to/sound.mp3',
	'settings.custom-sound.play': 'Play',

	// Settings — Task section
	'settings.section.task': 'Task',
	'settings.task-tracking.name': 'Enable task tracking',
	'settings.task-tracking.desc':
		'Important: Enabling this feature will automatically add a block ID when activating a task, unless a block ID is already present.',
	'settings.task-progress.name': 'Show task progress background',
	'settings.task-format.name': 'Task format',
	'settings.task-format.tasks': 'Tasks Emoji Format',
	'settings.task-format.dataview': 'Dataview',

	// Settings — Log section
	'settings.section.log': 'Log',
	'settings.log-file.name': 'Log file',
	'settings.log-file.none': 'None',
	'settings.log-file.daily': 'Daily note',
	'settings.log-file.weekly': 'Weekly note',
	'settings.log-file.file': 'File',
	'settings.log-path.name': 'Log file path',
	'settings.log-path.desc': 'The file to log pomodoro sessions to',
	'settings.log-level.name': 'Log level',
	'settings.log-level.all': 'All',
	'settings.log-level.work': 'Work',
	'settings.log-level.break': 'Break',
	'settings.log-format.name': 'Log format',
	'settings.log-format.simple': 'Simple',
	'settings.log-format.verbose': 'Verbose',
	'settings.log-format.custom': 'Custom',
	'settings.log-template.name': 'Log template',
	'settings.log-template.placeholder': '<% templater script goes here %>',
	'settings.templater.prefix': 'Requires ',
	'settings.templater.link': 'Templater',
	'settings.templater.suffix':
		' plugin to be enabled, then click the refresh button',
	'settings.templater.refresh': 'Refresh',
	'settings.restore-defaults': 'Restore Settings',

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
	'panel.settings.sound': 'Notification Sound',
	'panel.settings.log-focused': 'Prefer Saving to Task File',
	'panel.tasks-count': '{count} tasks',
	'panel.search': 'Search...',
	'panel.filter.all': 'All',
	'panel.filter.todo': 'Todo',
	'panel.filter.completed': 'Completed',
	'panel.open-task': 'Open',

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
	'notice.invalid-template': 'Invalid template',

	// Errors
	'error.create-failed': 'Failed to create random note: {error}',
	'error.max-retries':
		'Failed to generate a unique file name after 3 attempts.',
	'error.no-charset': 'At least one character set must be enabled.',
};
