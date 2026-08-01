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
├── i18n/
│   ├── index.ts             # t() function, Locale type
│   ├── en.ts                # English locale strings
│   └── zh-CN.ts             # Simplified Chinese locale strings
└── features/
    └── random-file.ts       # Feature: generate note with random name
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

### Design rules

- **`main.ts` must stay small** — only `onload()`, `onunload()`, `saveSettings()`,
  `reloadFeatures()`, and `_registerFeatures()`.
- **All feature logic lives in `src/features/`** — one file per feature.
- **Shared code goes in `src/utils.ts`** or new files in `src/`.
- **Command IDs must be stable** — don't rename them after release.
- **Use `this.register*` helpers** for anything that needs cleanup.
- **All user-facing strings go through `t(key, locale)`** — never hardcode English.
- **Features return `string[]` of command IDs** — enables `reloadFeatures()` to
  unregister/re-register on language change.

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
