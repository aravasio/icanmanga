# Module: config/flags.ts

## Purpose
Defines all tunable values for the extension. This is the single source of truth for limits, crop behavior, cache sizes, and hotkey definitions.

## Responsibilities
- Provide max rectangles per session.
- Define crop output mime and max dimensions.
- Define cache limits and normalization precision.
- Define hotkey bindings used by `hotkeys.ts`.

## Public Interface
- Export a `FLAGS` object with nested config sections.

Example shape:
```ts
export const FLAGS = {
  maxRectsPerSession: 15,
  crop: {
    maxDimensionPx: 1024,
    outputMime: "image/png" as const,
  },
  cache: {
    maxEntries: 200,
    rectRoundingDecimals: 4,
  },
  hotkeys: {
    toggleTranslateMode: "Alt+T",
    translateSession: "Enter",
    undo: ["Ctrl+Z", "Cmd+Z"],
    exit: "Escape",
  },
}
```

## Behavioral Rules
- No other file defines literal numbers for these settings.
- The `hotkeys` section is consumed by `config/hotkeys.ts` for normalization.

## Error Handling
- This module has no runtime behavior; errors are compile-time only.

## Dependencies
- None.

## Notes
- Keep values ASCII and simple to enable copy into configs later.
