# Module: background/serviceWorker.ts

## Purpose
Runs in extension background context. Performs capture, cropping, provider calls, and cache management. Acts as the secure boundary for API keys.

## Responsibilities
- Receive translation requests from content scripts.
- Capture the visible tab screenshot.
- Crop each rectangle, downscale to `FLAGS.crop.maxDimensionPx`.
- Encode crops to base64 and send to provider.
- Cache results and return them to content script.
- Expose options storage for API key.
- Fall back to `public/secrets.txt` for local development.

## Public Interface
- Message handlers for:
  - `TRANSLATE_SESSION`
  - `GET_SETTINGS`
  - `SET_SETTINGS`

## Message Contracts
### Request: TRANSLATE_SESSION
```ts
{
  type: "TRANSLATE_SESSION",
  payload: {
    rects: Rect[],
    viewport: { width: number, height: number, dpr: number },
    url: string,
  }
}
```

### Response: TRANSLATE_SESSION
```ts
{
  type: "TRANSLATE_SESSION_RESULT",
  payload: {
    results: Result[],
    cacheHit: boolean,
  },
  error?: string
}
```

## Capture and Crop Pipeline
1. Capture visible tab to a bitmap.
2. Convert rects from CSS pixels to bitmap pixels using DPR.
3. Clamp rects to bitmap bounds.
4. Crop each rect and downscale to max dimension.
5. Encode to base64 with `FLAGS.crop.outputMime`.
6. Send all images in one provider request.

## Cache
- Compute a cache key from url, normalized rects, provider and model.
- Store results with timestamp.
- Evict oldest entries beyond `FLAGS.cache.maxEntries`.

## Error Handling
- Capture failure: return error and mark all rows failed in content script.
- Provider failure: return error and mark all rows failed.
- Per-rect crop failure: return `error` for that rect and continue others.

## Dependencies
- `config/flags.ts`
- `providers/openaiVision.ts`
- `shared/types.ts`

## Notes
- API key is read from extension storage (or `public/secrets.txt` fallback) and never sent to content scripts.
- Service worker should tolerate being restarted; no long-lived state required.
