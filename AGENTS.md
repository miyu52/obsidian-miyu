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
├── types.ts                 # Shared TypeScript types
├── utils.ts                 # Shared utilities (random string generator)
├── i18n/
│   ├── index.ts             # t() function, Locale type
│   ├── en.ts                # English locale strings
│   └── zh-CN.ts             # Simplified Chinese locale strings
└── features/
    ├── random-file.ts       # Feature: generate note with random name
    └── pomodoro/
        ├── index.ts         # Register function
        ├── timer.ts         # Timer state machine + Web Worker
        ├── task-parser.ts   # Parse headings/tasks from md files
        ├── task-tracker.ts  # Active task + 🍅 counter update
        ├── logger.ts        # PomodoroLog storage
        ├── clock-worker.ts  # Blob-based Web Worker
        ├── view.ts          # ItemView (right panel)
        └── components/      # Svelte UI components
            ├── TimerView.svelte
            ├── TimerCircle.svelte
            ├── TaskPanel.svelte
            ├── StatsPanel.svelte
            └── StatusBar.svelte
```

This is a **multi-feature personal toolkit plugin**. Every feature is a self-contained
module registered from `main.ts`. Each feature file exports a `register*Feature(plugin)`
function that returns an array of registered command IDs.

### How to add a new feature

1. Create `src/features/<name>.ts`
2. Export a function: `export function registerXxxFeature(plugin: MiyuPlugin): string[]`
3. Register commands with `plugin.addCommand(...)`, return their IDs.
4. Add i18n keys to `src/i18n/en.ts` and `src/i18n/zh-CN.ts` for all user-facing strings.
5. Import and call in `src/main.ts` → `_registerFeatures()`.
6. If the feature needs settings, add fields to `MiyuSettings` (prefix with feature name),
   update `DEFAULT_SETTINGS`, and add UI in `MiyuSettingTab.display()`.

### 2. Pomodoro Timer (v1.1)

- **Commands:**
  - `Toggle pomodoro timer` / `切换番茄钟` (id: `toggle-pomodoro-timer`)
  - `Toggle pomodoro panel` / `切换番茄钟面板` (id: `toggle-pomodoro-panel`)
  - `Reset pomodoro timer` / `重置番茄钟` (id: `reset-pomodoro-timer`)
- **Behavior:** WORK/BREAK pomodoro cycles with SVG ring timer, task tracking
  with `[🍅 actual/expected]` counter in markdown, daily bar chart statistics.
- **Timer:** Web Worker + absolute timestamp (`Date.now() - startTime`)
  ensures zero time drift. breakMinutes=0 locks mode to WORK.
- **Task tracking:** Parses configured md files for headings (H1–H3) and
  tasks. Click to activate, `🍅 actual` auto-increments on WORK completion.
- **UI:** Svelte-based ItemView in right sidebar. SVG ring + large countdown
  + 4 buttons (📋Tasks, ▶Start/Pause, ↺Reset, 📊Stats). StatusBar optional.
- **Stats:** Monthly bar chart. Click any bar to see daily detail.
- **Settings:**
  - `taskFilePaths` (textarea, default `[]`)
  - `workMinutes` (slider 1–120, default 25)
  - `breakMinutes` (slider 0–60, default 5)
  - `autoStart` (toggle, default false)
  - `notificationSound` (toggle, default true)
  - `showStatusBar` (toggle, default true)
  - `lowFrameRate` (toggle, default false)
- **Source:** `src/features/pomodoro/`

### Design rules

- **`main.ts` must stay small** — only `onload()`, `onunload()`, `saveSettings()`,
  `reloadFeatures()`, and `_registerFeatures()`.
- **All feature logic lives in `src/features/`** — one directory per complex feature
  or one file per simple feature.
- **Shared types go in `src/types.ts`**.
- **Shared utilities go in `src/utils.ts`** or new files in `src/`.
- **Command IDs must be stable** — don't rename them after release.
- **Use `this.register*` helpers** for anything that needs cleanup.
- **All user-facing strings go through `t(key, locale)`** — never hardcode English.
- **Features return `string[]` of command IDs** — enables `reloadFeatures()` to
  unregister/re-register on language change.
- **UI uses Svelte** — components in `src/features/<name>/components/`.
- **Settings are flat** — all in `MiyuSettings`. Runtime data (logs, active task,
  panel state) also stored in settings for simplicity but not shown in settings UI.

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

## Settings reference

All settings keys live in `MiyuSettings` (see `src/settings.ts`).
Prefix new feature settings with the feature name to avoid conflicts
(e.g., `randomLength`, `templatePath`, etc.).

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `language` | `Locale` | `'zh-CN'` | UI language |
| `randomLength` | `number` | `8` | Random string length |
| `randomUppercase` | `boolean` | `true` | Include uppercase |
| `randomLowercase` | `boolean` | `false` | Include lowercase |
| `randomNumbers` | `boolean` | `true` | Include numbers |
| `randomSymbols` | `boolean` | `false` | Include symbols |
| `taskFilePaths` | `string[]` | `[]` | Task file paths |
| `workMinutes` | `number` | `25` | Work session minutes |
| `breakMinutes` | `number` | `5` | Break session minutes |
| `autoStart` | `boolean` | `false` | Auto-start next session |
| `notificationSound` | `boolean` | `true` | Play sound on complete |
| `showStatusBar` | `boolean` | `true` | Show in status bar |
| `lowFrameRate` | `boolean` | `false` | Low FPS mode |

_Note: `pomodoroLogs`, `activeTask`, `panelMode`, `taskFilter`, `taskSearch`,
`headingCollapse` are also in `MiyuSettings` but are runtime state, not UI settings._

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

### 2026-08-02 — Pomodoro timer integration

- Svelte added as UI framework via `esbuild-svelte` plugin.
- Web Worker uses Blob URL pattern (not file import) to avoid esbuild worker issues.
- Timer computes elapsed via `Date.now() - startTime` (absolute) rather than
  accumulating worker ticks — zero time drift regardless of tab visibility.
- All pomodoro runtime objects (timer, tracker) stored on `MiyuPlugin` instance.
- Settings restructured from flat to nested: `{ language, randomFile: {...}, pomodoro: {...} }`.
  `migrateSettings()` auto-converts old flat data on first load.
- The `removeCommand` API requires Obsidian ≥1.7.2 (`minAppVersion` already bumped).
- Svelte components use `css: 'injected'` compiler option — styles are bundled
  into JS, no separate `styles.css` needed.
- `plugin._t(key, vars?)` added as convenience i18n helper for Svelte components.
