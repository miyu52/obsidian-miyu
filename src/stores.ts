import { writable } from 'svelte/store';
import type { Locale } from './i18n';

export const localeStore = writable<Locale>('zh-CN');
