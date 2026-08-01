import type { MiyuSettings } from './settings';
import { t, type Locale } from './i18n';

export interface RandomStringOptions {
	length: number;
	useUppercase: boolean;
	useLowercase: boolean;
	useNumbers: boolean;
	useSymbols: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&()-_[]{}+=';

/** Extract random string options from plugin settings. */
export function getRandomOptions(settings: MiyuSettings): RandomStringOptions {
	const rf = settings.randomFile;
	return {
		length: rf.length,
		useUppercase: rf.uppercase,
		useLowercase: rf.lowercase,
		useNumbers: rf.numbers,
		useSymbols: rf.symbols,
	};
}

/** Generate a random string from the selected character sets. */
export function generateRandomString(
	opts: RandomStringOptions,
	locale: Locale,
): string {
	const charset = buildCharset(opts);
	if (charset.length === 0) {
		throw new Error(t('error.no-charset', locale));
	}

	let result = '';
	for (let i = 0; i < opts.length; i++) {
		result += charset.charAt(
			Math.floor(Math.random() * charset.length),
		);
	}
	return result;
}

function buildCharset(opts: RandomStringOptions): string {
	let chars = '';
	if (opts.useUppercase) chars += UPPERCASE;
	if (opts.useLowercase) chars += LOWERCASE;
	if (opts.useNumbers) chars += NUMBERS;
	if (opts.useSymbols) chars += SYMBOLS;
	return chars;
}
