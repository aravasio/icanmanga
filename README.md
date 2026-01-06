# ICanManga - Manga Translation Extension

MVP browser extension for manual manga bubble selection, OCR (Japanese), and English translation with numbered overlays and a side panel.

## Docs
- `spec.md` - MVP spec
- `docs/architecture/ARCHITECTURE.md` - detailed architecture and module specs
- `docs/RUNNING.md` - how to build and run the extension locally

## Status
Working MVP with content script, background service worker, and options UI.

## Quick Start
```bash
npm install
npm run build
```

Load `dist/` as an unpacked extension in `chrome://extensions`, then add your API key
in Options or via `public/secrets.txt`.

## Next Steps
- Improve retry UX and edit mode tooling.
- Expand provider options and model selection.
