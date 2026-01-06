# Module: shared/types.ts

## Purpose
Defines shared types used across content scripts and background service worker. Keeps data structures consistent.

## Responsibilities
- Provide type definitions for Rect, Session, Result, ProviderInput/Output, and messages.

## Core Types
```ts
type Rect = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

type Result = {
  id: string
  jp: string
  en: string
  confidence?: number
  warnings?: string[]
  error?: string
}

type Attempt = Result & {
  failCount?: number
}

type Session = {
  url: string
  viewport: { width: number, height: number, dpr: number }
  rects: Rect[]
  results?: Result[]
}
```

## Message Types
- `TRANSLATE_SESSION` request
- `TRANSLATE_SESSION_RESULT` response
- `TRANSLATE_RECT` request
- `TRANSLATE_RECT_RESULT` response
- Settings messages for API key storage

## Behavioral Rules
- Types are data-only; no methods or logic.

## Dependencies
- None.
