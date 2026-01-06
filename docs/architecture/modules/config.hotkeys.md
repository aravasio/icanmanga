# Module: config/hotkeys.ts

## Purpose
Normalizes and interprets the hotkey strings from `FLAGS`. Provides a single place to define hotkey matching rules and cross-platform behavior.

## Responsibilities
- Parse hotkey strings into normalized key definitions.
- Determine whether a keydown event matches a configured hotkey.
- Handle platform differences (Ctrl vs Cmd) and modifier ordering.

## Public Interface
- `normalizeHotkey(hotkey: string): NormalizedHotkey`
- `matchesHotkey(event: KeyboardEvent, hotkey: NormalizedHotkey): boolean`
- Optional helper: `normalizeHotkeyList(hotkeys: string[]): NormalizedHotkey[]`

## Inputs
- Hotkey strings from `FLAGS.hotkeys`.
- `KeyboardEvent` from content script listeners.

## Outputs
- Boolean match results; normalized hotkey structures used in content script.

## Behavioral Rules
- Must support `Ctrl`/`Cmd` synonyms where configured.
- Must be deterministic and not depend on locale.
- Must not call `preventDefault` or `stopPropagation` directly; that is handled in content script.

## Error Handling
- If a hotkey string is malformed, log a warning and ignore that hotkey.

## Dependencies
- `config/flags.ts` (read-only use of `FLAGS.hotkeys`).

## Notes
- Keep matching logic minimal and predictable to avoid blocking unrelated shortcuts.
