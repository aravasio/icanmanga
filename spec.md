# Manga Translation Extension — MVP Spec

## 1. Goal

Build a browser extension (Chrome / Arc / Firefox) that lets the user **manually select text regions (speech bubbles, narration boxes, etc.) in order**, then performs **OCR (Japanese) + translation (English)** and presents results in a **numbered overlay + side panel list**.

The user provides **layout and reading order** by selecting rectangles sequentially.

This avoids automatic bubble detection and maximizes UX while keeping the MVP simple and robust.

---

## 2. Supported Browsers

- Chrome (Manifest V3)
- Arc (Chromium-based, same as Chrome)
- Firefox (WebExtensions, small API adapter)

Design must avoid Chrome-only assumptions.

---

## 3. Non-Goals (MVP)

- Automatic bubble detection
- Automatic reading order inference
- Editing or modifying the underlying image
- Multi-site heuristics beyond “works on RawSakura in practice”
- Incremental streaming translation (batch per session only)

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

**Undo**
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
- Overlay tracks viewport scrolling (no independent scroll)

---

### 5.2 Side Panel (Primary Output UI)

A fixed side panel (right side of viewport) containing a list:

For each rectangle `#N`:
- Status:
  - before translation: `#N (pending)`
  - after translation:
    - JP text (copy button)
    - EN text (copy button)
- Hovering a row highlights its rectangle
- Hovering a rectangle highlights its row
- Row background color matches rectangle highlight color

No English text is rendered on top of the image in MVP.

---

### 5.3 Popup (Optional, MVP-light)

Clicking a rectangle may optionally open a small popup near it showing:
- JP text + copy
- EN text + copy

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
  }>
}
```

- `id` preserves mapping and order
- Order is defined **only by user selection order**

---

### 7.2 OpenAI Vision Implementation

- One request per session
- Multiple images sent in one request
- Model must:
  - OCR Japanese text **as-is**
  - Translate to natural English
  - Treat each image independently
  - Return strict JSON only

Failure handling:
- Empty or unreadable text → return empty strings + warning

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

---

## 9. Caching (MVP)

### 9.1 Cache Key

```ts
{
  url: string
  viewport: { w, h, dpr }
  rectsNormalized: Array<{ x, y, w, h }>
}
```

- Rects normalized to viewport size
- Rounded (e.g. 4 decimals)

### 9.2 Cache Value

```ts
{
  results: Array<{ id, jp, en }>
  timestamp: number
}
```

Storage:
- `chrome.storage.local` / `browser.storage.local`

Eviction:
- Max ~200 entries
- Remove oldest on overflow

---

## 10. Error Handling (MVP)

- Screenshot failure → toast: “Capture failed”
- AI failure → toast: “Translation failed”
- Enter with zero rectangles → no-op
- Exceed max rectangles → toast: “Max 15 selections”

---

## 11. Project Structure (Suggested)

```
src/
├─ config/
│  └─ hotkeys.ts
├─ content/
│  ├─ content.ts        // mode toggle, event wiring
│  ├─ overlay.ts        // selection + rectangle rendering
│  └─ panel.ts          // side panel UI
├─ background/
│  └─ serviceWorker.ts  // screenshot, crop, provider, cache
├─ providers/
│  └─ openaiVision.ts
├─ shared/
│  └─ types.ts
```

---

## 12. Manifest Requirements

- Manifest V3
- Permissions:
  - `activeTab`
  - `scripting`
  - `storage`

No host permissions required for MVP.

---

## 13. Success Criteria

On a RawSakura chapter page, user can:

- Enter Translate Mode
- Select multiple bubbles in order
- Undo selections with Ctrl/Cmd+Z
- Translate all selections with Enter
- See numbered overlays + ordered JP/EN results
- Copy JP or EN text from side panel
- Exit cleanly with Esc

---

## 14. Future Extensions (Explicitly Out of Scope)

- Auto bubble detection
- On-image English text rendering
- Streaming / incremental translation
- Multi-site normalization
- Local OCR models
