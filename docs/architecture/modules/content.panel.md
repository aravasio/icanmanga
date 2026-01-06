# Module: content/panel.ts

## Purpose
Implements the injected side panel UI that lists selections and translation results. This is the authoritative user-facing output.

## Responsibilities
- Render a fixed right-side panel with rows for each rectangle.
- Display status (pending/translating/failed/unreadable) and results.
- Provide copy-to-clipboard actions for JP and EN text.
- Emit hover events to highlight rectangles and receive hover state.

## Public Interface
- `mountPanel()` / `unmountPanel()`
- `setRows(rects: Rect[], results?: Result[])`
- `setRowHoverHandler(callback: (rectId: string | null) => void)`
- `showToast(message: string, type?: "error" | "info")`

## Inputs
- Rect list and optional results.
- Hover state from overlay.

## Outputs
- DOM panel UI and callbacks for hover events.

## Behavioral Rules
- Row order is selection order; IDs map to rectangles.
- Each row contains:
  - Status line
  - JP text + copy button (if available)
  - EN text + copy button (if available)
  - Warnings if provided
- If result has `error`, show failed state for that row.
- Hovering a row highlights its rectangle.

## Copy Behavior
- Use the Clipboard API when available; fallback to a hidden textarea if needed.
- Copy buttons are disabled when text is empty.

## Error Handling
- Panel should render even with partial or missing data.
- Toasts are used for user-visible errors from content logic.

## Dependencies
- `shared/types.ts`
- Optional: a `content/styles.ts` or CSS string for panel styling.

## Notes
- Panel is injected DOM for cross-browser support; no browser-native side panel APIs.
