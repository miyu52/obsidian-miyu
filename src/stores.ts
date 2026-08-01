import { writable } from 'svelte/store';
import type { Locale } from './i18n';

/** Reactive locale store — updated when language changes in settings. */
export const localeStore = writable<Locale>('zh-CN');
