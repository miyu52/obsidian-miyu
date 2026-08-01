# Miyu

Personal Obsidian toolkit with various utilities. Built for my own workflow.

## Features

### Random file name

Generate a new note with a random filename. Useful for scratchpads, quick captures, and avoiding naming paralysis.

- **Command:** `Generate note with random name` (`generate-random-note`)
- Creates an empty `.md` file with a random name and opens it
- Configurable character sets: uppercase, lowercase, numbers, symbols
- Adjustable length (1–64 characters)
- Auto-retries on name collision (up to 3 attempts)

### i18n

Interface language can be switched in settings. Currently supports:

| Language | Code |
|----------|------|
| English | `en` |
| 简体中文 | `zh-CN` |

Command names, notices, and all settings UI update immediately on language switch.

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Language | dropdown | English | UI language |
| Length | slider 1–64 | 8 | Random string character count |
| Uppercase | toggle | on | Include A–Z |
| Lowercase | toggle | off | Include a–z |
| Numbers | toggle | on | Include 0–9 |
| Symbols | toggle | off | Include `!@#$%^&()-_[]{}+=` |

## Installation

### From source

```bash
git clone https://github.com/miyu52/obsidian-miyu.git
cd obsidian-miyu
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, `styles.css` to your vault's `.obsidian/plugins/obsidian-miyu/`.

### Via Obsidian community plugins

_Not yet listed._

## Development

```bash
npm install      # dependencies
npm run dev      # watch mode
npm run build    # production build (type-check + minify)
npm run lint     # eslint
```

Requires Node.js ≥18 and Obsidian ≥1.7.2.

## License

0-BSD
