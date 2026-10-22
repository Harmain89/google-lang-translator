# LingoDesk

A fast, minimalist desktop translation app built with **Electron** + **React 18 (Vite + TypeScript)** + **Tailwind CSS**. Dark/light themes, history & favorites, always-on-top utility mode, text-to-speech, and a dual-mode Google translation engine — all in a frameless, Raycast-inspired window.

![Tech](https://img.shields.io/badge/Electron-45-blue) ![Tech](https://img.shields.io/badge/React-18-61dafb) ![Tech](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Features

- **Dual-mode translation engine**
  - **Free GTX (default, zero-config)** — public Google Translate endpoint, works instantly with no API key
  - **Cloud API mode** — official Google Cloud Translation API v2 with your own key (set it in Settings)
- **Auto language detection** with a "Detected" badge
- **Real-time translation** — debounced 400ms as you type, or explicit `Ctrl+Enter` / button
- **Swap languages** — swaps language pair *and* both text panels in one click
- **History & Favorites drawer** — click any entry to restore it
- **Copy with feedback**, **paste from clipboard**, and **text-to-speech** (Web Speech API) on both panels
- **Always-on-top pin** — float the window over PDFs, browsers, or your editor
- **System tray** — close to tray, global shortcut <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> summons/focuses the window from anywhere
- **Dark & light themes** with instant toggle (follows system preference until changed)
- **40+ languages** including English, Urdu, Arabic, Chinese, Hindi, Japanese, Russian, Turkish, German, Spanish, French…

## Getting started

```bash
npm install
npm run dev        # Vite dev server + hot-reloading desktop window
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev environment (Vite HMR + Electron) |
| `npm run start` | Build renderer + main, then run the production app locally |
| `npm run typecheck` | TypeScript strict check across renderer & electron |
| `npm run pack` | Build + package (unpacked dir in `release/`) |
| `npm run dist` | Build + package Windows NSIS installer & portable `.exe` |

> **Note:** if `node_modules/electron` is missing its binary (postinstall skipped), run `node node_modules/electron/install.js` once.

## Architecture

```
electron/            Main process (window, tray, IPC, JSON store, dual-mode engine)
  main.ts            Frameless window, tray, global shortcut, lifecycle, IPC handlers
  translate.ts       GTX endpoint (short GET / long POST) + Cloud API v2
  store.ts           Atomic JSON store in app.getPath('userData')
  preload.ts         contextBridge API surface (contextIsolation enabled)
src/                 React renderer
  hooks/useTranslation.ts   Debounced engine calls with sequence guarding
  components/        Header, language selector, source/target panels, drawer, settings
```

Security posture: `contextIsolation: true`, `nodeIntegration: false`, all Node capabilities exposed strictly through `preload.ts` IPC channels with sender validation, `setWindowOpenHandler` denied, CSP meta in `index.html`.

Settings, history, favorites, theme and window bounds persist to `%APPDATA%/lingodesk/lingodesk-store.json`.
