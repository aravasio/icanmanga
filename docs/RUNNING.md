# Running ICanManga Locally

This project is a browser extension built with Vite. To try it out, build the extension and load the unpacked `dist/` folder in your browser.

## Prerequisites

- Node.js and npm

## Build the extension

```bash
npm install
npm run build
```

The build output lands in `dist/`.

## Load the extension (Chrome/Edge/Brave)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable Developer mode.
3. Click "Load unpacked" and select the `dist/` folder.

## Configure OpenAI API key

1. Right-click the extension icon and choose "Options".
2. Add your OpenAI API key and save.

The key is stored in extension local storage.

## Try it out

- Open a manga page in the browser.
- Hotkeys:
  - Toggle translate mode: `Alt+T`
  - Translate current session: `Enter`
  - Undo last selection: `Ctrl+Z` / `Cmd+Z`
  - Exit translate mode: `Escape`

## Iterating on changes

Rebuild on changes with Vite's watch mode:

```bash
npm run build -- --watch
```

After rebuilding, reload the extension in the browser to pick up changes.
