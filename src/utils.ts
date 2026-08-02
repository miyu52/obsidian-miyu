import type { RandomFileSettings } from './settings';
import { t, type Locale } from './i18n';

export interface RandomStringOptions {
	length: number;
	useUppercase: boolean;
	useLowercase: boolean;
	useNumbers: boolean;
	useSymbols: boolean;
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 递归克隆（数组/普通对象/标量）。 */
export function deepClone(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => deepClone(item));
	}
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = deepClone(v);
		}
		return out;
	}
	return value;
}

/**
 * 深度合并设置：以 defaults 为底，loaded 覆盖。
 * 数组/对象总是克隆——绝不让结果与 DEFAULT_* 共享引用
 * （否则运行时的 push 会污染模块级默认值）。
 * loaded 中 defaults 没有的键（旧版本遗留）被丢弃。
 */
export function deepMerge<T>(defaults: T, loaded: unknown): T {
	if (!isPlainObject(loaded)) {
		return deepClone(defaults) as T;
	}
	const out: Record<string, unknown> = {};
	for (const [k, dv] of Object.entries(defaults as Record<string, unknown>)) {
		const lv = loaded[k];
		if (isPlainObject(dv)) {
			out[k] = deepMerge(dv, lv);
		} else if (Array.isArray(dv)) {
			out[k] = deepClone(lv ?? dv);
		} else {
			out[k] = lv ?? dv;
		}
	}
	return out as T;
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
