# Module: content/overlay.ts

## Purpose
Renders the full-screen overlay and manages rectangle selection interactions. Provides visual feedback for current selection and existing rectangles.

## Responsibilities
- Create and mount the overlay DOM layer.
- Capture pointer drag to define rectangles.
- Render selection preview and finalized rectangles with numbered badges.
- Provide highlight state when a panel row is hovered.

## Public Interface
- `mountOverlay()` / `unmountOverlay()`
- `setRects(rects: Rect[], results?: Result[])`
- `setHoverRectId(id: string | null)`
- `onRectAdded(callback: (rect: Rect) => void)` or equivalent event hook

## Inputs
- Rect list from session state.
- Hover state from panel.

## Outputs
- DOM overlay layer; callbacks when a new rect is finalized.

## Behavioral Rules
- Overlay is fixed to the viewport and not scroll-aware.
- Overlay blocks pointer events to the page and captures drag.
- Rectangles are numbered in selection order; numbers must match panel order.
- Rects are visually distinct and readable on top of content.

## Rectangle Creation
- On drag start: record start point.
- On drag move: render preview rectangle.
- On drag end:
  - Compute normalized rect (x, y, w, h) in CSS pixels.
  - Ignore if below minimum size (if configured).
  - Emit rect to content controller.

## Error Handling
- If overlay cannot mount, fail Translate Mode and show toast from content script.

## Dependencies
- `shared/types.ts`
- `config/flags.ts` (if using min-size or color config)

## Notes
- The overlay should not use shadow DOM to keep hit testing simple.
