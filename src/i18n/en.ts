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

	// Command names
	'command.generate-random-note': 'Generate note with random name',

	// Notices
	'notice.note-opened': 'Opened new note: {name}',
	'error.create-failed': 'Failed to create random note: {error}',
	'error.max-retries':
		'Failed to generate a unique file name after 3 attempts.',
	'error.no-charset': 'At least one character set must be enabled.',
};
