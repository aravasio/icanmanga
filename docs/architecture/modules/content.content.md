# Module: content/content.ts

## Purpose
Coordinates Translate Mode in the webpage context. Owns session state, listens for hotkeys and pointer events, and orchestrates overlay and panel updates.

## Responsibilities
- Toggle Translate Mode on/off.
- Create and clear the session state.
- Lock scrolling and block page interactions while active.
- Manage hotkey listeners for translate, undo, and exit.
- Dispatch translation requests to background.
- Handle results and update UI modules.

## Public Interface
- Content script entry point that initializes listeners.
- Functions:
  - `enterTranslateMode()`
  - `exitTranslateMode()`
  - `startSession()`
  - `clearSession()`
  - `translateSession()`
  - `undoLastRect()`

## State
- `session`: { url, viewport, rects, results? }
- `isTranslateMode`: boolean
- `scrollLock`: saved scroll position and flags

## Event Handling
- Hotkeys: use `config/hotkeys.ts` with `FLAGS.hotkeys`.
- Mouse: capture drag start/move/end events from overlay.
- Keyboard: prevent default for hotkeys only while Translate Mode is active.

## Behavioral Rules
- Translate Mode disables scroll and pointer events on the page.
- All rectangles are stored in viewport CSS pixel coordinates.
- Rects are created only on drag end and if size exceeds a minimum threshold (if implemented, define the threshold in flags).
- Max rectangles per session enforced using `FLAGS.maxRectsPerSession`.
- Enter with zero rects is a no-op.

## Translation Request Flow
1. Set all rows to `translating...` in the panel.
2. Send a message to background containing the session rects and viewport metrics.
3. Await response; if success, update `session.results` and panel.
4. If failure, mark each rect as failed and show toast.

## Error Handling
- Any background error results in a single toast and all pending rects marked failed.
- Crop failures are reflected per-rect if reported by background.

## Dependencies
- `config/flags.ts`
- `config/hotkeys.ts`
- `content/overlay.ts`
- `content/panel.ts`
- `shared/types.ts`

## Notes
- The content script never calls provider APIs and never accesses API keys.
- All UI rendering is delegated to overlay/panel modules.
