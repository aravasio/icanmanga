# Manga Translation Extension — MVP Spec (Revised)

## 1. Goal

Build a browser extension (Chrome / Arc / Firefox) that lets the user **manually select text regions (speech bubbles, narration boxes, etc.) in order**, then performs **OCR (Japanese) + translation (English)** and presents results in a **numbered overlay + side panel list**.

The user provides **layout and reading order** by selecting rectangles sequentially.

This avoids automatic bubble detection and maximizes UX while keeping the MVP simple and robust.

---

## 2. Supported Browsers

### 2.1 Targets
- **Chrome** (Manifest V3)
- **Arc** (Chromium-based, same as Chrome)
- **Firefox** (WebExtensions support)

### 2.2 Compatibility Notes (MVP)
- MVP **must work** on Chrome/Arc.
- Firefox is supported, but any browser gaps (especially around screenshot capture timing/permissions) may require small adjustments.
- The **side panel UI is implemented as an injected DOM panel**, not a browser-native “side panel” API, for maximum cross-browser compatibility.

---

## 3. Non-Goals (MVP)

- Automatic bubble detection
- Automatic reading order inference
- Editing or modifying the underlying image
- Multi-site heuristics beyond “works on RawSakura in practice”
- Incremental streaming translation (batch per session only)
- Persisting sessions across page reloads

---

## 4. Core UX

### 4.1 Translate Mode

**Hotkeys (configurable, not hardcoded inline):**
- Toggle Translate Mode: `Alt+T`
- Translate current session: `Enter`
- Undo last rectangle:
  - `Ctrl+Z` (Windows/Linux)
  - `Cmd+Z` (macOS)
- Exit Translate Mode / clear session: `Esc`

Hotkeys must live in a single config module.

---

### 4.2 Behavior in Translate Mode

When Translate Mode is **ON**:

1. The page is covered by a translucent overlay.
2. User click-drags to draw a rectangle.
3. On mouseup:
   - rectangle is stored as **Bubble #N**
   - N increments sequentially
4. Each rectangle renders:
   - border
   - number badge (`#1`, `#2`, …)
5. Maximum rectangles per session: **15**

#### 4.2.1 Context Takeover (No Scrolling / No Page Interaction)
Translate Mode is a full “control takeover”:
- **No page scrolling is allowed** while Translate Mode is ON.
  - Prevent wheel/trackpad scrolling
  - Prevent keyboard scrolling (`Space`, `PageUp/Down`, `Home/End`, arrows)
  - Prevent touch scrolling (if applicable)
- **Underlying page interaction is blocked**:
  - Pointer events do not reach the page
  - Text selection is disabled

Implementation note:
- On entering Translate Mode, store `scrollX/scrollY` and:
  - prevent scroll events, and
  - optionally enforce `window.scrollTo(savedX, savedY)` as a safety net.

#### Undo
- Ctrl/Cmd+Z removes the **last rectangle** only
- Updates overlay + side panel
- No effect if session is empty

---

### 4.3 Translation Trigger

- User presses **Enter**
- All current rectangles are translated **in one batch**
- Results appear together

---

## 5. UI Layout

### 5.1 Overlay Layer (Content Script)

- Full-viewport overlay
- Darkens non-selected areas
- Displays:
  - selection rectangle during drag
  - persistent numbered rectangles after selection
- Overlay is fixed to the viewport (and does not need to track scroll, since scrolling is disabled in Translate Mode)

---

### 5.2 Side Panel (Primary Output UI)

A fixed side panel (right side of viewport) implemented as an **injected DOM panel** containing a list.

For each rectangle `#N`:
- Status:
  - before translation: `#N (pending)`
  - during translation: `#N (translating...)`
  - after translation:
    - JP text (copy button)
    - EN text (copy button)
  - failure / unreadable:
    - show `#N (failed)` or `#N (unreadable)`
    - show warning text (from `warnings[]`) if available
- Hovering a row highlights its rectangle
- Hovering a rectangle highlights its row
- Row background color matches rectangle highlight color

**No English text is rendered on top of the image in MVP.**

---

### 5.3 Popup (Optional, MVP-light)

Clicking a rectangle may optionally open a small popup near it showing:
- JP text + copy
- EN text + copy
- Any warnings

This is secondary; the side panel is authoritative.

---

## 6. Capture & Coordinate System

### 6.1 Coordinate Space

- Rectangles are stored in **viewport CSS pixels**
- Origin `(0,0)` = top-left of rendered webpage viewport
- Rect format:

```ts
type Rect = {
  id: string
  x: number
  y: number
  w: number
  h: number
}
```

---

### 6.2 Screenshot Capture

Use **visible tab screenshot**, not page images.

Abstracted function:

```ts
captureVisibleTab(): Promise<Bitmap>
```

Implementation:
- Chrome / Arc: `chrome.tabs.captureVisibleTab`
- Firefox: `browser.tabs.captureVisibleTab`

Notes:
- Captures webpage content only (no browser chrome)
- Must account for:
  - `window.devicePixelRatio`
  - zoom

---

### 6.3 Rect Cropping

Steps:
1. Capture screenshot
2. Convert rects from CSS pixels → screenshot pixels via DPR scaling
3. Clamp to bitmap bounds
4. Crop each rectangle into its own image
5. **Downscale each crop to a max dimension** to bound latency and request size (see Config/Flags)

Each crop becomes one AI input.

---

## 7. AI Provider (OCR + Translation)

### 7.1 Provider Abstraction

Single provider for MVP.

**Input**
```ts
{
  images: Array<{
    id: string
    bytesBase64: string
    mime: "image/png" | "image/jpeg"
  }>
}
```

**Output**
```ts
{
  results: Array<{
    id: string
    jp: string
    en: string
    confidence?: number
    warnings?: string[]
    error?: string
  }>
}
```

- `id` preserves mapping and order
- Order is defined **only by user selection order**
- `error` is for hard failures per item; `warnings` are soft issues (low confidence, partial text, etc.)

---

### 7.2 OpenAI Vision Implementation

- One request per session
- Multiple images sent in one request
- Model must:
  - OCR Japanese text **as-is**
  - Translate to natural English
  - Treat each image independently
  - Return **strict JSON only** (no markdown)

Failure handling:
- Empty or unreadable text → return empty strings + warning, not a whole-session failure
- If the request fails entirely (network/auth/provider):
  - mark each row as failed and show a single toast

---

### 7.3 API Key Handling (MVP)

- User provides an API key via **extension options/settings UI**.
- Key is stored in extension storage:
  - Chrome/Arc: `chrome.storage.local`
  - Firefox: `browser.storage.local`
- Key is never injected into the page or content scripts.
- Background/service worker performs provider calls.

---

## 8. State & Session Model

### 8.1 Session State (Content Script)

```ts
type Session = {
  url: string
  viewport: {
    width: number
    height: number
    dpr: number
  }
  rects: Rect[]
  results?: Result[]
}
```

- Session exists only while Translate Mode is ON
- Cleared on Esc
- Session is not persisted across reloads

---

## 9. Caching (MVP)

### 9.1 Cache Key

```ts
{
  url: string
  viewport: { w, h, dpr }
  rectsNormalized: Array<{ x, y, w, h }>
  provider: string
  model: string
}
```

- Rects normalized to viewport size
- Rounded (e.g. 4 decimals)

### 9.2 Cache Value

```ts
{
  results: Array<{ id, jp, en, warnings?, error? }>
  timestamp: number
}
```

Storage:
- `chrome.storage.local` / `browser.storage.local`

Eviction:
- Max ~200 entries (configurable)
- Remove oldest on overflow

---

## 10. Error Handling (MVP)

Global:
- Screenshot failure → toast: “Capture failed”
- Provider/network/auth failure → toast: “Translation failed”
- Enter with zero rectangles → no-op
- Exceed max rectangles → toast: “Max 15 selections”

Per-rect:
- Unreadable OCR → row shows warning (“Unreadable”)
- Partial OCR → row shows warning (“Partial text”)
- Per-rect crop failure → row shows `failed`

---

## 11. Config / Flags

All tunables must live in a single config module (no magic numbers).

Suggested file:
- `src/config/flags.ts`

Example shape:

```ts
export const FLAGS = {
  maxRectsPerSession: 15,
  crop: {
    maxDimensionPx: 1024,        // downscale crops so max(w,h) <= this
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

---

## 12. Project Structure (Suggested)

```
src/
├─ config/
│  ├─ hotkeys.ts          // hotkey normalization + parsing
│  └─ flags.ts            // all tunables (max rects, crop size, cache, etc.)
├─ content/
│  ├─ content.ts          // mode toggle, event wiring, scroll lock
│  ├─ overlay.ts          // selection + rectangle rendering
│  └─ panel.ts            // injected DOM side panel UI
├─ background/
│  └─ serviceWorker.ts    // screenshot, crop, provider, cache
├─ providers/
│  └─ openaiVision.ts
├─ shared/
│  └─ types.ts
└─ options/
   └─ options.ts          // API key input UI (MVP)
```

---

## 13. Manifest Requirements

- Manifest V3
- Permissions:
  - `activeTab`
  - `scripting`
  - `storage`

No host permissions required for MVP.

---

## 14. Success Criteria

On a RawSakura chapter page, user can:

- Enter Translate Mode
- Page becomes non-interactive (no scrolling)
- Select multiple bubbles in order
- Undo selections with Ctrl/Cmd+Z
- Translate all selections with Enter
- See numbered overlays + ordered JP/EN results
- Copy JP or EN text from side panel
- Exit cleanly with Esc

---

## 15. Future Extensions (Explicitly Out of Scope)

- Auto bubble detection
- On-image English text rendering
- Streaming / incremental translation
- Multi-site normalization
- Local OCR models
