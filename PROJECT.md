# PROJECT.md — obsidian-miyu

> Read this first before making changes. All context you need is here.

## Project identity

- **Plugin ID:** `obsidian-miyu` (DO NOT change — stable API ID)
- **Plugin name:** `Miyu`
- **Author:** `miyu52`
- **Repo:** `https://github.com/miyu52/obsidian-miyu`
- **Description:** Personal Obsidian toolkit with various utilities.
- **minAppVersion:** `1.5.8`
- **isDesktopOnly:** `false`

## Architecture

This is a **multi-feature personal toolkit plugin**. Every feature is a self-contained module registered from `main.ts`.

```
src/
├── main.ts                  # Plugin lifecycle — keep it MINIMAL
├── settings.ts              # Shared settings: interface, defaults, settings tab
├── utils.ts                 # Shared utilities (currently: random string generator)
└── features/
    └── random-file.ts       # Feature: generate note with random name
```

### How to add a new feature

1. Create `src/features/<name>.ts` — export a `register` function: `export function registerXxxFeature(plugin: MiyuPlugin)`
2. The register function calls `plugin.addCommand(...)` or other plugin API.
3. Import and call it in `src/main.ts` `onload()`.
4. If the feature needs settings, add fields to `MiyuSettings` in `settings.ts` (prefix with feature name), update `DEFAULT_SETTINGS`, and add UI in `MiyuSettingTab.display()`.
5. Build: `npm run build`

### Design rules

- **`main.ts` must stay small** — only `onload()`, `onunload()`, `saveSettings()`, and feature registration calls.
- **All feature logic lives in `src/features/`** — one file per feature.
- **Shared code goes in `src/utils.ts`** or new files in `src/`.
- **Command IDs must be stable** — don't rename them after release.
- **Use `this.register*` helpers** (registerEvent, registerInterval, etc.) for anything that needs cleanup.
- Follow `AGENTS.md` for coding conventions, linting, and release process.

## Features

### 1. Random file name (v1.0)

- **Command:** `Generate note with random name` (id: `generate-random-note`)
- **Behavior:** Generates a random filename → creates empty `.md` → opens it
- **Settings:**
  - `randomLength` (slider 1–64, default 8)
  - `randomUppercase` (toggle, default true)
  - `randomLowercase` (toggle, default false)
  - `randomNumbers` (toggle, default true)
  - `randomSymbols` (toggle, default false)
- **Edge cases handled:**
  - File name collision → retries up to 3 times with new random strings
  - All charsets disabled → throws error caught by caller, shows notice
- **Source:** `src/features/random-file.ts`, `src/utils.ts`

## Settings reference

All settings keys live in `MiyuSettings` (see `src/settings.ts`). Prefix new feature settings with the feature name to avoid conflicts (e.g., `randomLength`, `templatePath`, etc.).

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
