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
        ├── index.ts         # registerPomodoroFeature() + PomodoroManager assembly
        ├── types.ts         # ALL shared data models (single source of truth)
        ├── settings.ts      # PomodoroSettings + defaults + reactive mirror
        ├── timer.ts         # PomodoroTimer state machine (IDLE/RUNNING/PAUSED)
        ├── sound.ts         # Notification sound (base64 data URI + player)
        ├── stats.ts         # SessionStore: PomodoroRecord logging + statistics
        ├── tasks/
        │   ├── parser.ts    # TaskParser: grouped tree parsing (headings + nesting)
        │   ├── tracker.ts   # TaskTracker: active task + pomodoro counter writeback
        │   ├── line-utils.ts# Task-line parsing helpers
        │   └── serializer/  # Task line deserializers (TASKS / DATAVIEW formats)
        ├── view.ts          # TimerView (VIEW_TYPE_TIMER = 'miyu-timer-view')
        └── ui/
            ├── TimerPanel.ts         # Timer circle + today progress + 5 buttons
            ├── TasksPanel.ts         # File dropdown + grouped tree + collapse
            ├── StatsPanel.ts         # Daily bar chart + task breakdown (new)
            ├── QuickSettingsPanel.ts # Quick settings inside the view
            └── StatusBarTimer.ts     # Status bar item with context menu
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

### 2. Pomodoro timer (refactored)

- **Commands:** ids `toggle-timer`, `toggle-timer-panel`, `reset-timer`, `toggle-mode`
- **View:** `miyu-timer-view` in the right sidebar (unique ID so it coexists
  with the old plugin's `timer-view`; reopen the panel once after migrating)
- **Ribbon:** timer icon toggles the panel; **status bar:** optional timer with context menu
- **Features:** work/break cycles with autostart, task tracking (TASKS / DATAVIEW formats,
  block IDs, pomodoro counters), heading-grouped task tree (nested, collapsible,
  persisted), session logging to `data.json`, daily bar-chart statistics with
  task breakdown, daily goal, notifications (system + sound + custom audio),
  low-FPS mode
- **Settings:** all in the unified `MiyuSettingTab`
  (Timer / Notification / Task / Daily goal / Files sections) +
  in-panel quick settings (gear button).
- **Data model:** all shared types live in `src/features/pomodoro/types.ts`.
  Settings are nested: `MiyuSettings.randomFile` / `MiyuSettings.pomodoro`
  (see Settings reference below).
- **Source:** `src/features/pomodoro/` (see architecture above)

## Settings reference

All settings live in `MiyuSettings` (see `src/settings.ts`). Feature settings
are **namespaced under their feature** (`randomFile`, `pomodoro`) — new
features must follow the same pattern.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `language` | `Locale` | `'zh-CN'` | UI language |
| `randomFile.length` | `number` | `8` | Random string length |
| `randomFile.uppercase` | `boolean` | `true` | Include uppercase |
| `randomFile.lowercase` | `boolean` | `false` | Include lowercase |
| `randomFile.numbers` | `boolean` | `true` | Include numbers |
| `randomFile.symbols` | `boolean` | `false` | Include symbols |
| `pomodoro.workMinutes` | `number` | `25` | Work session minutes |
| `pomodoro.breakMinutes` | `number` | `5` | Break minutes (0 = no breaks) |
| `pomodoro.autoStartNext` | `boolean` | `false` | Auto-start next session |
| `pomodoro.showStatusBarTimer` | `boolean` | `false` | Show timer in status bar |
| `pomodoro.lowFps` | `boolean` | `false` | Lower clock/UI update rate |
| `pomodoro.systemNotification` | `boolean` | `false` | OS-level notification |
| `pomodoro.notificationSound` | `boolean` | `true` | Play sound on session end |
| `pomodoro.soundFile` | `string` | `''` | Vault path to custom sound |
| `pomodoro.taskTracking` | `boolean` | `false` | Track pomodoros per task |
| `pomodoro.showTaskProgress` | `boolean` | `true` | Progress bar behind tasks |
| `pomodoro.taskFormat` | `TaskFormat` | `'TASKS'` | `'TASKS'` / `'DATAVIEW'` |
| `pomodoro.dailyGoal` | `number` | `0` | Daily goal (0 = disabled) |
| `pomodoro.weekStart` | `number \| null` | `0` | Week start day (0=Sun..6=Sat, null=locale) |
| `pomodoro.files` | `string[]` | `[]` | md files tracked by the panel |
| `pomodoro.activeFile` | `string` | `''` | Active file (panel dropdown) |
| `pomodoro.collapsedSections` | `string[]` | `[]` | Collapsed heading ids |
| `pomodoro.records` | `PomodoroRecord[]` | `[]` | Session log (data.json) |

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
  `external/obsidian-calendar-plugin` is also kept as a reference for UI
  patterns (e.g. the official-style number input in settings).
- **No Svelte, no web worker, no runtime deps.** UI is vanilla TS/DOM, the clock
  is `setInterval` + wall-clock timestamps (drift is impossible since elapsed is
  computed from `Date.now()`, not tick counts). `esbuild.config.mjs` needs ZERO
  changes.
- **Reactive state** uses the minimal `src/core/store.ts` (`writable`/`derived`),
  modeled on svelte/store semantics: subscribers are called synchronously on
  subscribe and on every `set`/`update`. The pomodoro timer uses a plain
  subscriber set instead (see `timer.ts`).
- **Settings reactivity:** `main.ts` has a single generic hook
  `plugin.onSettingsChanged` invoked after every `saveSettings()`. The pomodoro
  feature assigns it in `index.ts` to refresh the `pomodoroSettings` reactive
  mirror (`settings.ts`) and call `timer.setup()`. UI components subscribe to
  the mirror.
- **User-facing stability** (seamless migration):
  - Command IDs unchanged: `toggle-timer`, `toggle-timer-panel`, `reset-timer`, `toggle-mode`
  - View type is `miyu-timer-view` — deliberately NOT the old plugin's
    `timer-view`: Obsidian forbids two plugins from sharing a view type, so a
    shared ID would crash the old plugin's load while both are enabled.
    Saved workspaces using the old type need the panel reopened once after
    the old plugin is removed.
  - Hotkeys bound to the OLD plugin's command ids (`obsidian-pomodoro-timer:*`)
    are NOT migrated — Obsidian keys them by plugin id; users must re-bind.
- **`electron.remote.Notification` is dead** (removed in modern Electron) — replaced
  with HTML5 `window.Notification` (try/catch → Notice fallback). Do NOT reintroduce
  `require('electron').remote`.
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
- **Session-end notification must never be swallowed:** `PomodoroTimer.timeup()`
  records the session + notifies inside a fully wrapped block — logging/task
  errors only log to console, then the Notice + sound ALWAYS run. Store updates
  are also guarded so a throwing UI subscriber can't stall the timer. When
  touching this path, keep that guarantee.
- **Settings model is nested** (`randomFile.*`, `pomodoro.*`) — no data
  migration exists; old flat keys from v1.0 are simply ignored.

### 2026-08-02 — Pomodoro v2 refactor (data model + features)

- **Data model redesign:** `TimerState` (running/inSession/elapsed/count/
  duration/startTime/sessionStart mess) → explicit `TimerPhase`
  ('IDLE'|'RUNNING'|'PAUSED') + `PomodoroSession` (first-class session object) +
  derived `TimerDisplay`. All shared types live in `types.ts` — modules import
  types from there, no cross-module type imports.
- **Naming with units in names:** `accumulatedMs`, `runningSince`,
  `workMinutes`, `expectedPomodoros`, `actualPomodoros`, `completedAt` — a field
  name must be self-explanatory without comments.
- **Old file-log feature removed** (daily/weekly note, templater, 6 log
  settings). Sessions are logged as `PomodoroRecord` into
  `settings.pomodoro.records` (data.json) — only **completed** WORK sessions
  (aborted/break never recorded), `task` is a name snapshot at completion time,
  records pruned past 10000 entries. `SessionStore` (stats.ts) computes
  today-count / countByDay / tasksByDay on the fly.
- **Active file is explicit + persisted:** `pomodoro.files` (multi-file list via
  settings SuggestModal) + `pomodoro.activeFile` (panel dropdown). The old
  "follow active note + pin" behavior is gone (`TaskTrackerState` is just
  `{ task? }`). TaskTracker identifies tasks by `blockLink` only.
- **Grouped task tree:** `TaskParser` (tasks/parser.ts) rebuilds the whole tree
  on every file change — headings from `metadataCache.headings`, tasks attach to
  the nearest preceding heading, nested by level; ungrouped tasks go to
  `topTasks` (rendered first). Collapse state persists in
  `pomodoro.collapsedSections` keyed by `${path}:${headingLine}`; stale ids are
  harmlessly ignored. Manual md edits are fully supported because parsing is
  stateless full-rebuild; missing blockLink auto-clears the active task.
- **Stats panel (5th button):** top row = 本日/本周/本月/总计 four number cards;
  middle = single-week 7-day bar distribution with prev/next week navigation
  (week start follows `pomodoro.weekStart`, default Sunday, "locale default"
  option mirrors the calendar plugin's Start week on setting); bottom =
  GitHub-style 52-week activity heatmap with a year selector ("至今" = ends at
  the current week, a specific year = ends at that year's last week); clicking
  any day shows that day's task breakdown. Notification click opens the stats
  panel (via `PomodoroManager.openStatsPanel`, injected by TimerPanel).
- **Panel layout:** 5 controls — tasks | play/pause | reset | quick settings |
  stats; three extra panels (tasks/settings/stats) toggle exclusively.
- **`Timer.ts`→`timer.ts` case-collision gotcha (Windows):** the old migration
  files used PascalCase names; deleting `Timer.ts` on a case-insensitive
  filesystem also deletes `timer.ts`. When deleting old files, use exact names
  and verify with `ls` afterwards.
- **Settings UI conventions:** number inputs use the official style — `addText`
  + `inputEl.type='number'` via the `addNumberInput` helper, uniform width via
  `.miyu-setting-input` (`var(--input-width, 140px)`), input-save + out-of-range
  revert. Pomodoro settings are ONE flat section (no sub-headings) and there is
  NO "restore defaults" button.
- **moment global locale is mutable:** Obsidian's `window.moment` locale can be
  changed externally, so `moment.weekdaysShort()` etc. can flip language at
  runtime. Weekday labels must come from the plugin i18n (`stats.weekday.N`)
  and day names never from moment.
- **Task tracking behaviors:** `timeup()` must call `tracker.updateActual()` for
  completed WORK sessions (writes `🍅::` counts back to the file) — it was
  accidentally dropped once in a refactor. `reset()` only resets the timer and
  must NOT clear the active task; the active-task name input is readonly.
- **Startup vault-readiness gotcha:** `vault.getAbstractFileByPath()` may return
  null during plugin `onload` (early startup), which made the task panel show
  "file not found" until a manual reselect. `TaskParser` now re-loads on
  `workspace.onLayoutReady()` AND retries a few times (500ms apart) when the
  active file is missing — don't remove that retry, it's the startup fix.
- **Settings merge must be deep:** `Object.assign` is shallow — nested feature
  objects in an old `data.json` miss keys added later (e.g. `weekStart`),
  leaving them `undefined` and silently falling back to locale defaults.
  Always use `normalizeSettings()` (settings.ts) when loading data.
