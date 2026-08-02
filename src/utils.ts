import type { RandomFileSettings } from './settings';
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

/** Extract random string options from the random-file settings. */
export function getRandomOptions(
	settings: RandomFileSettings,
): RandomStringOptions {
	return {
		length: settings.length,
		useUppercase: settings.uppercase,
		useLowercase: settings.lowercase,
		useNumbers: settings.numbers,
		useSymbols: settings.symbols,
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
