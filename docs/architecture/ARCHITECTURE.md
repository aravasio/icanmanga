# Architecture Specification

This directory contains the detailed architecture for the Manga Translation Extension MVP. Each module file describes responsibilities, public interfaces, behaviors, inputs/outputs, state, and error handling. Use these documents as implementation context.

## Scope
- Browser extension (Chrome/Arc/Firefox) with manual rectangle selection, OCR + translation, and side panel results.
- This architecture assumes the MVP scope and constraints in `spec.md`.

## Document Map
- `docs/architecture/ARCHITECTURE.md`: system overview and cross-cutting behaviors
- `docs/architecture/modules/config.flags.md`
- `docs/architecture/modules/config.hotkeys.md`
- `docs/architecture/modules/content.content.md`
- `docs/architecture/modules/content.overlay.md`
- `docs/architecture/modules/content.panel.md`
- `docs/architecture/modules/background.serviceWorker.md`
- `docs/architecture/modules/providers.openaiVision.md`
- `docs/architecture/modules/shared.types.md`
- `docs/architecture/modules/options.options.md`
- `docs/architecture/modules/manifest.md`

## System Overview
The extension runs a content script for user interaction and UI overlays, and a background service worker for screenshot capture, cropping, provider calls, and caching. A single session is created per Translate Mode activation and cleared on exit.

### Actors
- User: selects rectangles in reading order and triggers translation.
- Content Script: captures rectangles and renders overlay + panel.
- Background Service Worker: performs capture/cropping/provider/cache.
- Provider: OCR and translation via a single OpenAI Vision request per session.

### Primary Data Flow
1. User toggles Translate Mode.
2. Content script enters capture mode and records rectangles in order.
3. User hits Enter to translate.
4. Content script requests translation from background.
5. Background captures visible tab, crops rectangles, scales, calls provider, caches results.
6. Results returned to content script.
7. Content script updates panel and overlay state.

### Cross-Cutting Invariants
- Rectangles are stored in viewport CSS pixels.
- Selection order defines translation order and display order.
- All tunables live in `flags`.
- Hotkeys live in `hotkeys` and are configurable via `flags` only.
- Content scripts never hold the API key.
- Translate Mode blocks page scrolling and pointer events.

### Message Contracts
All messages between content and background are JSON serializable. See `docs/architecture/modules/background.serviceWorker.md` for precise message shapes. Message boundaries are considered error-prone; all message handlers should validate required fields and return structured failures instead of throwing.

### Error Handling Strategy
- User-facing errors should use a consistent toast mechanism within the content script.
- Failures are scoped to the smallest unit (per rect) when possible.
- Global failures (capture/provider) should mark all pending rects failed and show a single toast.

### Security and Privacy
- API key stored in extension local storage only.
- Cropped images are sent only to the provider; no persistence beyond cache.
- Content script never touches API key or provider directly.
