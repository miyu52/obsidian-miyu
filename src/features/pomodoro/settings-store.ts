import { writable, type Writable } from '../../core/store';
import type { MiyuSettings } from '../../settings';

/**
 * Reactive mirror of `plugin.settings` for pomodoro UI components.
 * Updated by the feature on every `saveSettings()` (via the plugin's
 * `onSettingsChanged` hook). Components subscribe here instead of reading
 * `plugin.settings` directly so they react to live changes.
 */
export const pomodoroSettings: Writable<MiyuSettings> = writable(
	{} as MiyuSettings,
);
