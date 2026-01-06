# Module: options/options.ts

## Purpose
Implements the options/settings UI for storing the provider API key.

## Responsibilities
- Render a simple UI to input and save the API key.
- Validate that the key is non-empty before save.
- Read/write key to extension local storage.

## Public Interface
- Options page entry point that:
  - loads existing settings
  - handles save events

## Behavioral Rules
- Key is stored under a single, documented storage key.
- UI should indicate success and failure states.
- The key is never injected into content scripts.

## Error Handling
- Storage failures show a clear error message.
- Empty input prevents save and shows inline validation.

## Dependencies
- Extension storage API.
- Optional shared settings type from `shared/types.ts`.

## Notes
- Keep the options UI minimal for MVP.
