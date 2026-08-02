# AGENTS.md — obsidian-miyu

> **Primary project reference.** Read this first before making any changes.
> All context an agent needs to understand, extend, or fix this plugin is here.
>
> **⚠️ UPDATE THIS FILE** when you add features, change architecture, learn lessons,
> or make decisions that future agents should know.

## Project identity

- **Plugin ID:** `obsidian-miyu` (DO NOT change — stable API ID)
- **Plugin name:** `Miyu`
- **Author:** `miyu52`
- **Repo:** `https://github.com/miyu52/obsidian-miyu`
- **Description:** Personal Obsidian toolkit with various utilities.
- **minAppVersion:** `1.7.2`
- **isDesktopOnly:** `false`

## Architecture

```
src/
├── main.ts                  # Plugin lifecycle — keep it MINIMAL
├── settings.ts              # Shared settings: interface, defaults, settings tab
├── utils.ts                 # Shared utilities (random string generator)
├── global.d.ts              # App type augmentation (app.plugins / internalPlugins)
├── core/
│   └── store.ts             # Minimal reactive store (writable/derived) — no framework
├── i18n/
│   ├── index.ts             # t() function, Locale type
│   ├── en.ts                # English locale strings
│   └── zh-CN.ts             # Simplified Chinese locale strings
└── features/
    ├── random-file.ts       # Feature: generate note with random name
    └── pomodoro/            # Feature: pomodoro timer (multi-file, see below)
        ├── index.ts         # registerPomodoroFeature() + PomodoroManager
        ├── settings-store.ts# Reactive mirror of plugin.settings for UI
        ├── Timer.ts         # Timer state machine + reactive store
        ├── Tasks.ts         # Task parsing from the active file
        ├── TaskTracker.ts   # Active task tracking + pomodoro counters
        ├── Logger.ts        # Session logging (daily/weekly/file/templater)
        ├── TimerView.ts     # ItemView (VIEW_TYPE_TIMER = 'miyu-timer-view')
        ├── StatusBarTimer.ts# Status bar item with context menu
        ├── daily-notes.ts   # Minimal shim for obsidian-daily-notes-interface
        ├── task-utils.ts    # Task-line parsing helpers, templater glue
        ├── notification.ts  # Default notification sound (base64 data URI)
        ├── serializer/      # Task line deserializers (TASKS / DATAVIEW formats)
        └── ui/
            ├── TimerPanel.ts# Timer circle + controls (in the view)
            └── TasksPanel.ts# Task list, filters, search, progress
```

This is a **multi-feature personal toolkit plugin**. Every feature is a self-contained
module registered from `main.ts`. Each feature exports a `register*Feature(plugin)`
function that returns an array of registered command IDs.

**Simple features** = one file: `src/features/<name>.ts`.
**Complex features** (multiple classes/UI) = a folder `src/features/<name>/` with an
`index.ts` exporting `register<Name>Feature(plugin): string[]` plus helper modules.
Follow the pomodoro feature as the reference structure.

### How to add a new feature

1. Create `src/features/<name>.ts` (or `<name>/index.ts` for complex features)
2. Export a function: `export function registerXxxFeature(plugin: MiyuPlugin): string[]`
3. Register commands with `plugin.addCommand(...)`, return their IDs.
4. Add i18n keys to `src/i18n/en.ts` and `src/i18n/zh-CN.ts` for all user-facing strings.
5. Import and call in `src/main.ts` → `_registerFeatures()`.
6. If the feature needs settings, add fields to `MiyuSettings` (prefix with feature name),
   update `DEFAULT_SETTINGS`, and add UI in `MiyuSettingTab.display()`.
7. If UI must react to settings changes, subscribe to the feature's own reactive store
   and update it from `plugin.onSettingsChanged` (see pomodoro `settings-store.ts`).

### Design rules

- **`main.ts` must stay small** — only `onload()`, `onunload()`, `saveSettings()`,
  `reloadFeatures()`, and `_registerFeatures()`. It also exposes two generic hooks:
  - `plugin.pomodoro` — feature manager instance (each complex feature may attach state).
  - `plugin.onSettingsChanged` — called after every `saveSettings()`; features use it to
    refresh reactive mirrors. Only ONE hook exists — a feature must chain to the previous
    one if it needs it too.
- **All feature logic lives in `src/features/`** — one file (or one folder) per feature.
- **Shared code goes in `src/`** (e.g. `src/core/store.ts`, `src/utils.ts`).
- **Command IDs must be stable** — don't rename them after release.
- **Use `this.register*` helpers** for anything that needs cleanup.
- **All user-facing strings go through `t(key, locale)`** — never hardcode English.
- **Features return `string[]` of command IDs** — enables `reloadFeatures()` to
  unregister/re-register on language change.
- **No runtime dependencies.** UI is vanilla TS/DOM (no Svelte, no React). Reactive
  state uses `src/core/store.ts`. Do NOT add framework deps without a strong reason.
- **Singleton-vs-command split:** `register*Feature()` may be called again on language
  change (`reloadFeatures()`). Guard singleton parts (views, ribbons, status bars,
  event registration) behind an instance check; only re-register commands.

## i18n

- **Supported locales:** `en` (English), `zh-CN` (Simplified Chinese)
- **Setting key:** `language` in `MiyuSettings` (type `Locale`, default `'zh-CN'`)
- **Translation function:** `t(key, locale, vars?)` from `src/i18n/index.ts`
  - Falls back to English if key is missing in target locale
  - Supports `{var}` placeholder substitution
- **Language switching:** settings tab re-renders immediately;
  command names update via `reloadFeatures()` which removes and re-registers all commands
- **Adding strings:** add keys to both `en.ts` and `zh-CN.ts`
  - Key naming: `settings.<name>.name|desc`, `command.<id>`, `notice.<msg>`, `error.<msg>`

## Features

### 1. Random file name (v1.0)

- **Command:** `Generate note with random name` / `生成随机名称笔记` (id: `generate-random-note`)
- **Behavior:** Generates a random filename → creates empty `.md` → opens it
- **Settings:**
  - `randomLength` (slider 1–64, default 8)
  - `randomUppercase` (toggle, default true)
  - `randomLowercase` (toggle, default false)
  - `randomNumbers` (toggle, default true)
  - `randomSymbols` (toggle, default false)
- **Edge cases handled:**
  - File name collision → retries up to 3 times with new random strings
  - All charsets disabled → shows localized error notice
- **Source:** `src/features/random-file.ts`, `src/utils.ts`

### 2. Pomodoro timer (v1.2.3, migrated from obsidian-pomodoro-timer)

- **Commands:** ids `toggle-timer`, `toggle-timer-panel`, `reset-timer`, `toggle-mode`
- **View:** `miyu-timer-view` in the right sidebar (unique ID so it coexists
  with the old plugin's `timer-view`; reopen the panel once after migrating)
- **Ribbon:** timer icon toggles the panel; **status bar:** optional timer with context menu
- **Features:** work/break cycles with autostart, task tracking (TASKS / DATAVIEW formats,
  block IDs, pomodoro counters), session logging (daily/weekly note, file, templater),
  notifications (system + sound + custom audio), low-FPS mode
- **Settings:** all in the unified `MiyuSettingTab` (Timer / Notification / Task / Log sections).
  There is NO settings view inside the panel anymore.
- **Settings keys are intentionally UNPREFIXED** (`workLen`, `breakLen`, ...) so they match
  the old `obsidian-pomodoro-timer` data file. A one-time migration reads
  `.obsidian/plugins/obsidian-pomodoro-timer/data.json` on first load — but only while
  every pomodoro setting is still at its default, so it never overwrites user changes.
- **Source:** `src/features/pomodoro/` (see architecture above)

## Settings reference

All settings keys live in `MiyuSettings` (see `src/settings.ts`).
Prefix new feature settings with the feature name to avoid conflicts
(e.g., `randomLength`, `templatePath`, etc.) — EXCEPT the pomodoro feature,
which deliberately keeps its original unprefixed key names for data migration.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `language` | `Locale` | `'zh-CN'` | UI language |
| `randomLength` | `number` | `8` | Random string length |
| `randomUppercase` | `boolean` | `true` | Include uppercase |
| `randomLowercase` | `boolean` | `false` | Include lowercase |
| `randomNumbers` | `boolean` | `true` | Include numbers |
| `randomSymbols` | `boolean` | `false` | Include symbols |
| `workLen` | `number` | `25` | Work session minutes |
| `breakLen` | `number` | `5` | Break minutes (0 = no breaks) |
| `autostart` | `boolean` | `false` | Auto-start next session |
| `useStatusBarTimer` | `boolean` | `false` | Show timer in status bar |
| `lowFps` | `boolean` | `false` | Lower clock/UI update rate |
| `useSystemNotification` | `boolean` | `false` | OS-level notification |
| `notificationSound` | `boolean` | `true` | Play sound on session end |
| `customSound` | `string` | `''` | Vault path to custom sound |
| `enableTaskTracking` | `boolean` | `false` | Track pomodoros per task |
| `showTaskProgress` | `boolean` | `true` | Progress bar behind tasks |
| `taskFormat` | `TaskFormat` | `'TASKS'` | `'TASKS'` / `'DATAVIEW'` |
| `logFile` | `LogFileType` | `'NONE'` | `'NONE'`/`'DAILY'`/`'WEEKLY'`/`'FILE'` |
| `logFocused` | `boolean` | `false` | Prefer logging to task's file |
| `logPath` | `string` | `''` | Target file for `logFile='FILE'` |
| `logLevel` | `LogLevel` | `'ALL'` | `'ALL'`/`'WORK'`/`'BREAK'` |
| `logTemplate` | `string` | `''` | Templater script for CUSTOM format |
| `logFormat` | `LogFormat` | `'VERBOSE'` | `'SIMPLE'`/`'VERBOSE'`/`'CUSTOM'` |

## Build & dev

```bash
npm install        # first time
npm run dev        # watch mode
npm run build      # production (tsc check + esbuild minify)
npm run lint       # eslint
```

Output: `main.js` (not committed — in `.gitignore`, uploaded to GitHub releases).

## Release

1. Bump `version` in `manifest.json`
2. Update `versions.json` (`"<new-version>": "<minAppVersion>"`)
3. `npm run build`
4. Create GitHub release (tag = version number, NO `v` prefix)
5. Attach `main.js`, `manifest.json`, `styles.css` to release

---

## Agent Notes

> **Living section.** Update this whenever you:
> - Make a design decision with tradeoffs
> - Encounter a gotcha or Obsidian API quirk
> - Add a pattern that future features should follow
> - Find a better way to do something

### 2026-08-01 — i18n architecture

- All user-facing strings moved to `src/i18n/{en,zh-CN}.ts`.
- `settings.ts` uses a local helper `s(plugin, key, vars?)` wrapping `t()`.
- `main.ts` exposes `settingTab` property and `reloadFeatures()` method for
  language switching without plugin reload.
- `reloadFeatures()` uses `app.commands.removeCommand(id)` to unregister,
  then re-registers all features.
- `random-file.ts` now reads locale from `plugin.settings.language` at call time,
  so notices always use the current language.

### 2026-08-02 — Pomodoro timer migration (obsidian-pomodoro-timer → Miyu)

- **Migrated wholesale** from `external/obsidian-pomodoro-timer` (v1.2.3) into
  `src/features/pomodoro/` with all features intact. The original source remains
  in `external/` as reference (git submodule-style copy) — do NOT edit it.
- **No Svelte, no web worker, no runtime deps.** The 5 Svelte components were
  rewritten as vanilla TS DOM classes (`ui/`, `StatusBarTimer.ts`), the web-worker
  clock was replaced with `setInterval` + wall-clock timestamps (`Timer.ts` — drift
  is impossible since elapsed is computed from `Date.now()`, not tick counts), and
  the `obsidian-daily-notes-interface` dependency was replaced by a small internal
  shim (`daily-notes.ts`) talking to Obsidian's internal `daily-notes` plugin.
  `esbuild.config.mjs` needed ZERO changes.
- **Reactive state** uses the minimal `src/core/store.ts` (`writable`/`derived`),
  modeled on svelte/store semantics: subscribers are called synchronously on
  subscribe and on every `set`/`update`.
- **Settings reactivity:** `main.ts` gained a single generic hook
  `plugin.onSettingsChanged` invoked after every `saveSettings()`. The pomodoro
  feature assigns it in `index.ts` to refresh the `pomodoroSettings` reactive
  mirror (`settings-store.ts`) and call `timer.setupTimer()`. UI components
  subscribe to the mirror (status bar visibility, task progress).
- **User-facing stability** (seamless migration):
  - Command IDs unchanged: `toggle-timer`, `toggle-timer-panel`, `reset-timer`, `toggle-mode`
  - View type is `miyu-timer-view` — deliberately NOT the old plugin's
    `timer-view`: Obsidian forbids two plugins from sharing a view type, so a
    shared ID would crash the old plugin's load while both are enabled.
    Saved workspaces using the old type need the panel reopened once after
    the old plugin is removed.
  - Settings keys unchanged (unprefixed) so the old data file can be migrated
  - One-time migration from `.obsidian/plugins/obsidian-pomodoro-timer/data.json`
    — skipped as soon as any pomodoro setting is non-default
  - Hotkeys bound to the OLD plugin's command ids (`obsidian-pomodoro-timer:*`)
    are NOT migrated — Obsidian keys them by plugin id; users must re-bind.
- **`electron.remote.Notification` is dead** (removed in modern Electron) — replaced
  with HTML5 `window.Notification` (try/catch → Notice fallback). Do NOT reintroduce
  `require('electron').remote`.
- **Settings UI:** full settings live in the unified `MiyuSettingTab`
  (Timer / Notification / Task / Log headings). The panel keeps its original
  quick-settings button (4th control, gear icon): Work/Break lengths,
  Auto-start, Notification Sound, Prefer Saving to Task File
  (`ui/TimerSettingsPanel.ts`) — it writes to `plugin.settings` directly and
  refreshes from the `pomodoroSettings` mirror.
- **Known limitation:** on language switch, the already-open timer panel keeps its
  construction-time labels until the view is reopened (commands and status bar do
  update live). Acceptable for now.
- **ESLint:** `external/` is ignored (vendored third-party code). The
  `@microsoft/sdl/no-inner-html` rules are turned off for pomodoro UI files where
  `innerHTML` is only ever assigned static SVG icon constants (never user input).
- **CSS namespace:** all plugin-owned CSS classes/variables use a `miyu-`
  prefix (`--miyu-pomodoro-*`, `.miyu-timer`, `.miyu-pomodoro-tasks-item-desc`,
  view class `.miyu-timer-view`). The old plugin's global rules only leaked via
  `.pomodoro-tasks-item-desc` / `.st-timer` / `--pomodoro-timer-*` — all
  renamed so both plugins can stay enabled side by side. Keep this convention:
  any new class a feature adds must NOT reuse bare names the old
  obsidian-pomodoro-timer plugin might also declare.
- **Session-end notification must never be swallowed:** `Timer.timeup()`
  runs `processLog()` which is fully wrapped — logging/task-tracking errors
  only log to console, then `notify()` ALWAYS runs (in-app Notice + sound).
  `tick()`/`timeup()` also guard their store updates so a throwing UI
  subscriber can't stall the timer. When touching this path, keep that
  guarantee.
- **Obsidian internal daily-notes plugin API:** instance methods are
  `getDailyNote` / `getAllDailyNotes` / `createDailyNote` (weekly: `getWeeklyNote`
  / ...). Getting these names wrong throws at session end and silently kills
  the notification — see `daily-notes.ts`.
