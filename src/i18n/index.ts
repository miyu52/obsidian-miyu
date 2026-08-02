import { en, type I18nKey } from './en';
import { zhCN } from './zh-CN';

export type { I18nKey } from './en';

/** Supported locales. */
export type Locale = 'en' | 'zh-CN';

/** All locale data keyed by locale code. */
const locales: Record<Locale, Record<I18nKey, string>> = {
	en,
	'zh-CN': zhCN,
};

/**
 * Translate a key into the given locale.
 * Falls back to English if the key is missing in the target locale.
 * Supports `{var}` placeholder substitution.
 */
export function t(
	key: I18nKey,
	locale: Locale,
	vars?: Record<string, string>,
): string {
	let text = locales[locale]?.[key] ?? locales.en[key] ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			text = text.replace(`{${k}}`, v);
		}
	}
	return text;
}

/** 星期标签 key（面板需要按 index 动态取 key，用这个数组保证类型安全）。 */
export const WEEKDAY_KEYS: I18nKey[] = [
	'stats.weekday.0',
	'stats.weekday.1',
	'stats.weekday.2',
	'stats.weekday.3',
	'stats.weekday.4',
	'stats.weekday.5',
	'stats.weekday.6',
];
