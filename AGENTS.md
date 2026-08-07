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
├── main.ts                  # Plugin lifecycle + feature registry — keep it MINIMAL
├── settings.ts              # MiyuSettings types/defaults/normalize + MiyuSettingTab
├── utils.ts                 # Shared utilities (random string, deepMerge/deepClone)
├── global.d.ts              # App type augmentation (app.plugins / internalPlugins)
├── core/
│   └── store.ts             # Minimal reactive store (writable) — no framework
├── ui/
│   ├── FileSuggestModal.ts  # Vault-wide md file picker (shared by settings + panel)
│   └── settings-helpers.ts  # addNumberInput / addToggleSetting helpers
├── i18n/
│   ├── index.ts             # t() function, Locale type, I18nKey, WEEKDAY_KEYS
│   ├── en.ts                # English locale strings (source of truth for I18nKey)
│   └── zh-CN.ts             # Simplified Chinese locale strings
└── features/
    ├── types.ts             # MiyuFeature interface (feature module contract)
    ├── random-file.ts       # Feature: generate note with random name
    └── pomodoro/            # Feature: pomodoro timer (multi-file, see below)
        ├── index.ts         # pomodoroFeature (MiyuFeature) + PomodoroManager assembly
        ├── types.ts         # ALL shared data models (single source of truth)
        ├── settings.ts      # PomodoroSettings + defaults + normalize + reactive mirror
        ├── settings-ui.ts   # Pomodoro settings section (rendered by the settings tab)
        ├── timer.ts         # PomodoroTimer state machine (IDLE/RUNNING/PAUSED)
        ├── sound.ts         # Notification sound (base64 data URI + player)
        ├── stats.ts         # SessionStore: PomodoroRecord logging + statistics
        ├── pomodoro-count.ts# PomodoroCount model + 🍅:: parse/format/increment (pure)
        ├── tasks/
        │   ├── parser.ts    # TaskParser: grouped tree parsing (headings + nesting)
        │   ├── tracker.ts   # TaskTracker: active task + pomodoro counter writeback
        │   ├── line-utils.ts# Task-line parsing helpers
        │   └── serializer/  # Task line deserializers (TASKS / DATAVIEW formats)
        ├── view.ts          # TimerView (VIEW_TYPE_TIMER = 'miyu-timer-view')
        └── ui/
            ├── TimerPanel.ts         # Timer circle + today progress + 5 buttons
            ├── TasksPanel.ts         # Today progress + dropdown + pill filters + tree
            ├── StatsPanel.ts         # Daily bar chart + task breakdown (new)
            ├── QuickSettingsPanel.ts # Quick settings inside the view
            └── StatusBarTimer.ts     # Status bar item with context menu
tests/                         # vitest unit tests + stubs/obsidian.ts alias target
```

This is a **multi-feature personal toolkit plugin**. Every feature is a self-contained
module exporting a **`MiyuFeature` object** (`src/features/types.ts`). `main.ts` keeps a
static `FEATURES` registry and drives the lifecycle:

- `init?(plugin)` — once per plugin load: singletons (views, status bars, events, settings subscriptions)
- `registerCommands(plugin): string[]` — every load AND language switch (re-registered after `removeCommand`)
- `destroy?(plugin)` — on plugin unload
- `renderSettings?(plugin, containerEl, tab)` — renders the feature's settings section

**Simple features** = one file: `src/features/<name>.ts`.
**Complex features** (multiple classes/UI) = a folder `src/features/<name>/` with an
`index.ts` exporting the `MiyuFeature` plus helper modules.
Follow the pomodoro feature as the reference structure.

### How to add a new feature

1. Create `src/features/<name>.ts` (or `<name>/index.ts` for complex features)
2. Export `export const nameFeature: MiyuFeature = { id, init?, registerCommands, destroy?, renderSettings? }`
3. Register commands with `plugin.addCommand(...)`, return their IDs.
4. Add i18n keys to `src/i18n/en.ts` and `src/i18n/zh-CN.ts` for all user-facing strings
   (zh-CN is type-checked against en's keys).
5. Add the feature to the `FEATURES` array in `src/main.ts`.
6. If the feature needs settings, declare them in the feature folder
   (interface + defaults + a `normalizeXxxSettings()` using `deepMerge` from `utils.ts`),
   then wire them into `MiyuSettings` in `src/settings.ts`.
7. If UI must react to settings changes, subscribe to the feature's own reactive store
   and refresh it via `plugin.onSettingsChanged(cb)` (returns an unsubscribe function).

### Design rules

- **`main.ts` must stay small** — only `onload()`, `onunload()`, `saveSettings()`,
  `reloadFeatures()`, `_registerFeatures()`, and the `FEATURES` registry. It exposes:
  - `plugin.pomodoro` — feature manager instance (each complex feature may attach state).
  - `plugin.onSettingsChanged(cb)` — **multi-slot** subscription called after every
    `saveSettings()`; returns an unsubscribe function. No chaining needed.
  - `plugin.t(key, vars?)` — translation bound to the current language (the ONLY
    way to translate in feature code; `t(key, locale)` remains for pure helpers).
- **All feature logic lives in `src/features/`** — one file (or one folder) per feature.
- **Shared code goes in `src/`** (e.g. `src/core/store.ts`, `src/utils.ts`, `src/ui/`).
- **Command IDs must be stable** — don't rename them after release.
- **Use `this.register*` helpers** for anything that needs cleanup.
- **All user-facing strings go through i18n** — never hardcode English. Keys are
  compile-time typed (`I18nKey = keyof typeof en`), so typos fail the build.
- **Features return `string[]` of command IDs** — enables `reloadFeatures()` to
  unregister/re-register on language change.
- **No runtime dependencies.** UI is vanilla TS/DOM (no Svelte, no React). Reactive
  state uses `src/core/store.ts`. Do NOT add framework deps without a strong reason.
- **Singleton-vs-command split:** only `registerCommands()` is called again on language
  change (`reloadFeatures()`). Singletons (views, ribbons, status bars, event
  registration, settings subscriptions) live in `init()` — called exactly once per load.
- **Settings are deep-merged, never shared by reference:** every feature's settings
  slice has its own `normalizeXxxSettings()` built on `deepMerge()` from `utils.ts`.
  Arrays/objects are always cloned so runtime mutation can never pollute the module-level
  `DEFAULT_*` objects. Never `Object.assign` nested settings.
- **Tests:** pure logic must be testable without Obsidian — keep `obsidian` imports
  out of pure modules (or behind the test stub `tests/stubs/obsidian.ts`). Run
  `npm test` (vitest) before/after changes; new pure logic needs tests.

## i18n

- **Supported locales:** `en` (English), `zh-CN` (Simplified Chinese)
- **Setting key:** `language` in `MiyuSettings` (type `Locale`, default `'zh-CN'`)
- **Translation function:** `t(key, locale, vars?)` from `src/i18n/index.ts`
  - Falls back to English if key is missing in target locale
  - Supports `{var}` placeholder substitution
  - **Keys are typed:** `I18nKey = keyof typeof en` — wrong keys fail the build;
    `zh-CN` is typed `Record<I18nKey, string>` so it must cover every key
- **Bound translator:** `plugin.t(key, vars?)` reads `settings.language` at call
  time — use it everywhere in feature code instead of passing `locale` around.
  The dynamic weekday labels use the `WEEKDAY_KEYS: I18nKey[]` array.
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
- **Ribbon:** timer icon toggles the panel; **status bar:** optional timer with
  context menu; hovering shows a tooltip with the current mode and the active
  task name (rebuilt only when the content changes — mode, task, or language).
- **Features:** work/break cycles with autostart, task tracking (TASKS / DATAVIEW formats,
  block IDs, pomodoro counters), heading-grouped task tree (nested, collapsible,
  persisted), session logging (data.json or a `%% miyu:records` file — see
  `pomodoro.recordsFile`), daily bar-chart statistics with
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
| `pomodoro.expandedSections` | `string[]` | `[]` | Expanded heading ids (default: collapsed; keyed by heading block id) |
| `pomodoro.taskFilter` | `TaskFilter` | `'todo'` | Tasks panel filter (`'todo'`/`'completed'`/`'all'`) |
| `pomodoro.activeTask` | `ActiveTaskRef \| null` | `null` | Active task locator `{path, blockLink}` |
| `pomodoro.recordsFile` | `string` | `''` | Records storage file ('' = data.json, else `%% miyu:records` block in that md file) |
| `pomodoro.records` | `PomodoroRecord[]` | `[]` | Session log (data.json, only used when `recordsFile` is empty) |

## Build & dev

```bash
npm install        # first time
npm run dev        # watch mode
npm run build      # production (tsc check + esbuild minify)
npm run lint       # eslint
npm test           # vitest unit tests
```

Output: `main.js` (not committed — in `.gitignore`, uploaded to GitHub releases).

Testing notes:
- `tests/` runs under vitest; the `obsidian` import is aliased to
  `tests/stubs/obsidian.ts` (the npm package has no resolvable entry point).
- Pure logic is extracted (e.g. `pomodoro-count.ts`, `formatRemained`,
  `deepMerge`) specifically so it can be tested without Obsidian.
- `tsconfig.test.json` is referenced from `tsconfig.json` only so eslint's
  project service type-checks `tests/` — plain `tsc` never builds it.

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

### 2026-08-03 — Architecture refactor (data models + registry + i18n + tests)

- **Feature registry:** `register*Feature()` functions replaced by `MiyuFeature`
  objects (`src/features/types.ts`) driven from a static `FEATURES` array in
  `main.ts`. Lifecycle split is now enforced by the interface: `init()` (once per
  load — singletons/views/events), `registerCommands()` (every load + language
  switch), `destroy()`, `renderSettings()`. The old `if (!plugin.pomodoro)` guard
  is gone. `plugin.onSettingsChanged` became a multi-slot subscription returning
  an unsubscribe function (no more chaining hacks).
- **Settings normalization is deep:** `deepMerge`/`deepClone` in `src/utils.ts`.
  This fixed a real bug — `normalizeSettings` used to spread arrays shallowly, so
  a fresh install shared the `records`/`files` array reference with
  `DEFAULT_POMODORO_SETTINGS`, and `SessionStore.record()` mutated the module-level
  defaults. Never merge settings with `Object.assign`/spread; always
  `normalizeXxxSettings()` → `deepMerge`.
- **`SessionStore` owns its records copy:** it deep-copies records from settings on
  construction, queries its own array, and writes back by REPLACING the settings
  array (never pushes into the settings reference). Constructor takes a narrow
  `SessionStoreDeps` interface (satisfied structurally by MiyuPlugin) so stats
  logic is unit-testable without a plugin instance.
- **Records storage is switchable** (`pomodoro.recordsFile`): empty → data.json
  (legacy behavior); a md file path → session records are written to a
  `%% miyu:records` block in that file (Kanban-plugin style: `%%` comment
  wrapping a ```` ```json ```` fenced array, one record per line). The block
  format lives in the pure module `src/features/pomodoro/records-file.ts`
  (parse/format/repair — fully unit-tested; parsing strips the ```` ```json ````
  fence and stays compatible with the unfenced legacy format). Corrupted blocks
  are NEVER rebuilt blindly: the broken content is renamed in place to
  `%% miyu:error-records` (single, overwritten on repeated corruption) so the
  user can recover it by hand; new records restart from a fresh block appended
  at the end of the file. Records load at startup TWICE on purpose: once
  immediately and again on `workspace.onLayoutReady()` — early in `onload` the
  vault may not be queryable yet and `getAbstractFileByPath` returns null,
  which would be misread as "file missing" (same startup gotcha the TaskParser
  retries around).
  Writes are a serialized read-modify-write queue (`flushPending`/`flush`):
  every write re-reads the file first so manual user edits are merged, never
  overwritten; a failed write keeps the records in `pending` memory and retries
  on the next write. The memory records sync to the file after each successful
  write, so manual file edits show up in the stats panel. `parseRecordsContent`
  takes the LAST records block and drops malformed entries. Note: the file path
  has NO `saveSettings` chain, so UI refresh is driven by the `onRecordsChanged`
  dep callback (fires on record and after successful write-back) — the data.json
  path refreshes via `onSettingsChanged` as usual.
- **Pomodoro counter model:** `🍅:: X[/Y]` parsing/writing was duplicated in
  serializer + parser + tracker. It now lives in the pure module
  `src/features/pomodoro/pomodoro-count.ts` (`PomodoroCount {actual, expected}`,
  `parsePomodoroCount`, `incrementPomodoroText`, `formatPomodoroCount`);
  `TaskDetails.pomodoros` is typed `PomodoroCount | null` instead of a raw string.
  Detection intentionally still only recognizes `[🍅:: X]`/`(🍅:: X)` (bare counts
  are not parsed — same as before the refactor).
- **`TimerState` no longer mirrors settings** (`workMinutes`/`breakMinutes`/
  `autoStartNext` removed; `display()` reads `plugin.settings.pomodoro` live;
  `setup()` → `refresh()` which only re-emits). Settings are the single source of
  truth; running sessions keep their plannedMinutes snapshot.
- **i18n keys are typed:** `I18nKey = keyof typeof en`; `t(key)` and
  `plugin.t(key, vars?)` (bound to current language) fail the build on typos.
  `zh-CN` is `Record<I18nKey, string>`, so missing keys are compile errors.
  Dynamic weekday keys use the `WEEKDAY_KEYS` array. Prefer `plugin.t()` in
  feature code; keep `t(key, locale)` only in pure helpers (e.g. `modeLabel`).
- **Settings UI split per feature:** settings.ts is now just the orchestrator
  (language section + `feature.renderSettings` loop). Pomodoro settings live in
  `src/features/pomodoro/settings-ui.ts`, random-file settings inside
  `random-file.ts`. Shared UI moved to `src/ui/` (`FileSuggestModal`,
  `settings-helpers.ts` with `addNumberInput`/`addToggleSetting`).
- **Vitest test suite** (`npm test`): 48 tests covering settings normalization,
  SessionStore stats, pomodoro counter, timer state machine, i18n, store, utils.
  `tests/stubs/obsidian.ts` provides `moment` (real) + no-op classes; the alias
  lives in `vitest.config.ts`. `tsconfig.test.json` is referenced from
  `tsconfig.json` ONLY so eslint's project service type-checks tests (plain
  `tsc` validates the reference config but never builds it).
- **Gotcha (fixed in passing):** `incrTaskActual` used `.trim()` on the whole
  task line, which destroyed the indentation of nested (indented) tasks. It now
  strips trailing whitespace only.
- **Write-back must re-locate the line by block id:** `TaskTracker` write-back
  (`toggleComplete`, `ensureBlockId`, `incrTaskActual`) and `openTask` used the
  parse-time `task.line` snapshot to index into the file — after the file is
  edited, the line shifts and the write lands on the WRONG line (data damage).
  All four now go through `locateTaskLine()` (tracker.ts), which re-reads the
  file and matches the line-end block id (`findLineByBlockLink` in
  line-utils.ts, pure + tested); tasks without a block id fall back to the
  parse-time line but only after verifying the line is still a task line.
- **Known quirk kept on purpose:** a bare `🍅:: 3` (no brackets) is neither parsed
  by the serializer nor incremented by the tracker — bracketed/parenthesized
  forms only. Changing this touches serializer symbols + regex and is a behavior
  change; left for a dedicated feature request.
- **Declarative settings API deliberately NOT adopted** (decision): Obsidian 1.13+
  offers `getSettingDefinitions()` (settings search + declarative rendering), but
  implementing it makes 1.13+ bypass `display()` entirely. Keeping minAppVersion
  1.7.2 means keeping `display()`; the deprecation warnings are suppressed for
  `settings.ts` + `pomodoro/settings-ui.ts` in eslint.config.mts with a comment
  explaining why. Revisit only if minAppVersion is raised to 1.13.0.
- **obsidian types pin:** `obsidian` devDependency is `^1.13.1` (types only);
  `display()` deprecation comes from that type bump, not from new code.

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
- **Reactive state** uses the minimal `src/core/store.ts` (`writable`),
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
- **Language switch updates live:** all visible text re-renders immediately
  (commands re-register via `reloadFeatures()`, settings tab re-renders,
  panels/status bar read `plugin.t()` at render time). The only leftover is
  the four TimerPanel button `aria-label`s (invisible a11y hints), which keep
  their construction-time language until the view is reopened — harmless.
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
  `topTasks` (rendered first). Sections are **collapsed by default**; the
  expanded set persists in `pomodoro.expandedSections` keyed by
  `${path}:${headingBlockId}` — the parser auto-appends ` ^xxxx` block ids to
  headings that lack one (one-time write-back, same pattern as task block ids),
  so state survives line shifts above the heading. Switching the active file
  clears the list (per-file state only) — detected via `lastLoadedPath`, which
  MUST be initialized to the current `activeFile` in the constructor, not `''`
  (an empty initial value makes the first load misread as a file switch and
  wipes the persisted expanded state on every restart). Stale ids are pruned
  after each successful parse (`pruneExpandedSections` + `collectGroupIds`).
  Manual md edits are fully supported because parsing is
  stateless full-rebuild; missing blockLink auto-clears the active task.
- **Tasks panel UI (`ui/TasksPanel.ts`):** redesigned with the SAME visual
  language as the stats panel (`miyu-tasks-*` / `miyu-task-*` classes: outer
  box, rounded cards, pill filters). Layout: today-progress card on top
  (`本日 5/8` + theme progress bar, turns green when goal reached — was moved
  here from the timer circle), file button + task count + open-source button,
  filter cycling control `◀ 待办 ▶` centered (same nav style as the stats
  week/heatmap headers; ◀/▶ cycles 待办/已完成/全部, default `todo`, the
  center label is a plain non-interactive span), then the search box (rounded
  `--background-secondary` field with a magnifier icon), active
  task row (readonly name + remove), then the grouped tree. The file button
  opens an Obsidian `Menu` anchored at the button's bottom-left
  (`showAtPosition` with the button rect, NO width — a wide full-width menu
  gets clamped to the window edge by Obsidian and looks misplaced) — first
  item "选择文件…" opens `FileSuggestModal` from settings.ts to pick any vault
  md and add it to `pomodoro.files`; the open-source button (right of the file
  button) opens the active file in a new tab. Task rows show a green progress
  gradient background (when `showTaskProgress` and expected count > 0) + a
  pomodoro pill; the gradient is driven by an inline `--miyu-progress` CSS
  custom property, NOT `el.style.background` — inline `background` shorthand
  resets `background-color` and permanently kills the `:hover` rule's
  background; the group header's task count
  badge is a grey pill with a bare number, and the task pomodoro pill is
  distinguished by a trailing `🍅` emoji (e.g. `2/3 🍅`; the pill is only
  rendered when there is a count — an empty pill shows as a stray grey dot).
  Rows have NO completion checkbox — checked state is shown by line-through +
  muted text only; right-click a row (or the active-task row) for a menu with
  打开 / 完成 (toggle: `tracker.toggleComplete` writes `- [ ]` ↔ `- [x]` back
  to the file at the task's line, then the re-parse refreshes the tree).
  Old `pomodoro-tasks-*` classes were fully removed. (2026-08-02 later pass: inner
  card borders replaced with `--background-secondary` fills, per-row gradient
  progress removed (later restored, see above), pomodoro counter now a text
  pill like `2/3` instead of 🍅/◌/🥫 emoji. (2026-08-02 third pass: tree mimics
  Obsidian's file explorer —
  groups are real nested `miyu-task-group`/`miyu-task-group-title`/
  `miyu-task-children` nodes, rows are `miyu-task-row`, so the tree renders
  with OUR OWN classes only — no Obsidian `nav-*` classes (see the naming
  convention below); group indent comes from `.miyu-task-children` padding;
  collapse state shown via folder icon (`ICON_FOLDER` / `ICON_FOLDER_OPEN`, no
  rotation); `is-active` on a row highlights the tracked task; summary value no
  longer enlarged — the progress bar is the highlight. (2026-08-02 fourth pass:
  group chevron replaced by folder open/closed icons, task rows got a
  `file-text` icon on the left and a square checkbox on the far right of the
  row. Fifth pass: collapsed groups show a closed folder (`ICON_FOLDER`, 18x16
  — same 16px height as task icons) and expanded groups show `ICON_FOLDER_OPEN`;
  folder and task text both use 0.85rem; the active-task row is a plain
  `miyu-task-row is-active` row with accent-tint highlight, no more bordered
  card with an input.)
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
  revert. Pomodoro settings are grouped under sub-headings
  (`settings.section.timer|notification|task|goal|files`, rendered with
  `Setting.setHeading()`) and there is NO "restore defaults" button.
- **moment global locale is mutable:** Obsidian's `window.moment` locale can be
  changed externally, so `moment.weekdaysShort()` etc. can flip language at
  runtime. Weekday labels must come from the plugin i18n (`stats.weekday.N`)
  and day names never from moment.
- **Week start must subtract, not add:** `SessionStore.weekStartOf()` walks
  BACK from `now` to the configured start day (`(now.day() - weekStartDow + 7) % 7`
  then subtract) — the old `startOf('week')` + `add(shift)` produced the NEXT
  week whenever the configured start day was earlier than the locale's start
  day (e.g. locale Monday + configured Sunday → the weekly chart showed the
  future week). `moment().day()` is locale-independent; regression-tested.
- **Task tracking behaviors:** `timeup()` must call `tracker.updateActual()` for
  completed WORK sessions (writes `🍅::` counts back to the file) — it was
  accidentally dropped once in a refactor. `reset()` only resets the timer and
  must NOT clear the active task; the active-task name input is readonly.
- **Active task + filter are persisted:** `pomodoro.activeTask` stores only the
  locator `{path, blockLink}` (never name/counts — those are derived from file
  parse and refreshed by `TaskParser.syncActiveTask`, which matches by
  `blockLink` only, so renames survive). Restore happens on every parse when
  memory is empty; a persisted task not found in the CURRENT file's tree is
  kept (not cleared) unless it belongs to that file, so it can be restored
  when the right file becomes active. `pomodoro.taskFilter` mirrors the panel's
  ◀/▶ cycle; the panel reads it at construction and syncs from the settings
  mirror on changes (single source of truth = settings).
- **Stale-file fallbacks (parser):** `load()` runs `syncActiveTask()` in ALL
  branches — including empty/missing-file trees — so deleting the active file
  (or clearing `activeFile`) clears the in-memory active task and its persisted
  ref instead of leaving a stale row. BUT the restore branch only clears the
  PERSISTED ref when the tree has `exists: true` — a missing file during
  startup (vault not ready) must NOT wipe `activeTask`, or the persisted
  active task is gone before the retry parse succeeds. `vault.on('create')` is
  also listened to, so recreating a file at the same path as `activeFile`
  re-parses it.
- **Startup vault-readiness gotcha:** `vault.getAbstractFileByPath()` may return
  null during plugin `onload` (early startup), which made the task panel show
  "file not found" until a manual reselect. `TaskParser` now re-loads on
  `workspace.onLayoutReady()` AND retries a few times (500ms apart) when the
  active file is missing — don't remove that retry, it's the startup fix.
- **Settings merge must be deep:** `Object.assign` is shallow — nested feature
  objects in an old `data.json` miss keys added later (e.g. `weekStart`),
  leaving them `undefined` and silently falling back to locale defaults.
  Always use `normalizeSettings()` (settings.ts) when loading data.
- **CSS class naming convention (MUST follow):** every plugin-owned class and
  CSS variable gets a `miyu-` prefix (e.g. `.miyu-tasks`, `--miyu-pomodoro-*`).
  There are NO exceptions — never reuse bare Obsidian internal classes
  (`nav-folder`, `nav-file-title`, `collapse-icon`, ...) in feature UI. We
  tried borrowing them for the task tree: themes style them unpredictably
  (folder titles came out bold, look varied by theme) and `--nav-item-*` vars
  are scoped to `.nav-files-container` anyway. Everything a file tree needs
  (hover, active highlight, ellipsis, indent) is a few lines of our own CSS —
  write it ourselves.
- **Task panel icons (lucide):** group headers use `ICON_FOLDER` (closed
  folder, collapsed) / `ICON_FOLDER_OPEN` (open folder, expanded — no rotation
  needed), task rows use `ICON_TASK` (list-todo) on the left and the completion
  checkbox (`ICON_UNCHECKED` square / `ICON_CHECKED` check-square) on the far
  RIGHT after the pomodoro pill. All row icons are 16px tall (`ICON_FOLDER` is
  18x16 due to its 27:24 viewBox; the group icon box is fixed 18x16 so the
  title doesn't shift when the folder icon swaps). The file button uses
  `ICON_FILE` (plain document — distinct from the task icon). The active-task
  row is a
  `miyu-task-row is-active` row with accent-tint highlight
  (`rgba(var(--color-accent-rgb), 0.15)`) and a plain `miyu-task-active-name`
  span — NOT an input. Icons are static SVG strings assigned via `innerHTML`
  (lint exception), never user input.
