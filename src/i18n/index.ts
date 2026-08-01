import { en } from './en';
import { zhCN } from './zh-CN';

/** Supported locales. */
export type Locale = 'en' | 'zh-CN';

/** All locale data keyed by locale code. */
const locales: Record<Locale, Record<string, string>> = {
	en,
	'zh-CN': zhCN,
};

/**
 * Translate a key into the given locale.
 * Falls back to English if the key is missing in the target locale.
 * Supports `{var}` placeholder substitution.
 */
export function t(
	key: string,
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
