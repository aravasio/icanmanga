import { FLAGS } from "../config/flags"
import type { Rect, Result } from "../shared/types"
import { overlayStyles } from "./styles"

let overlayEl: HTMLDivElement | null = null
let rectLayer: HTMLDivElement | null = null
let previewEl: HTMLDivElement | null = null
let rectAddedHandler: ((rect: Rect) => void) | null = null
let hoverHandler: ((rectId: string | null) => void) | null = null
let currentHoverId: string | null = null
let styleEl: HTMLStyleElement | null = null

let dragStart: { x: number; y: number } | null = null

function injectStyles() {
  if (styleEl) return
  styleEl = document.createElement("style")
  styleEl.textContent = overlayStyles
  document.head.append(styleEl)
}

function ensureOverlay() {
  if (overlayEl) return
  injectStyles()

  overlayEl = document.createElement("div")
  overlayEl.className = "icanmanga-overlay"

  rectLayer = document.createElement("div")
  rectLayer.style.position = "absolute"
  rectLayer.style.inset = "0"

  overlayEl.append(rectLayer)
  document.documentElement.append(overlayEl)

  overlayEl.addEventListener("pointerdown", onPointerDown)
  overlayEl.addEventListener("pointermove", onPointerMove)
  overlayEl.addEventListener("pointerup", onPointerUp)
  overlayEl.addEventListener("pointerleave", onPointerUp)
}

function removeOverlay() {
  if (!overlayEl) return
  overlayEl.removeEventListener("pointerdown", onPointerDown)
  overlayEl.removeEventListener("pointermove", onPointerMove)
  overlayEl.removeEventListener("pointerup", onPointerUp)
  overlayEl.removeEventListener("pointerleave", onPointerUp)
  overlayEl.remove()
  overlayEl = null
  rectLayer = null
  previewEl = null
  dragStart = null
  currentHoverId = null
}

function createRectElement(rect: Rect, index: number, results?: Result[]) {
  if (!rectLayer) return
  const rectEl = document.createElement("div")
  rectEl.className = "icanmanga-rect"
  rectEl.dataset.rectId = rect.id
  rectEl.style.left = `${rect.x}px`
  rectEl.style.top = `${rect.y}px`
  rectEl.style.width = `${rect.w}px`
  rectEl.style.height = `${rect.h}px`

  const badge = document.createElement("div")
  badge.className = "icanmanga-rect-badge"
  badge.textContent = `#${index + 1}`
  rectEl.append(badge)

  rectEl.addEventListener("mouseenter", () => {
    hoverHandler?.(rect.id)
  })
  rectEl.addEventListener("mouseleave", () => {
    hoverHandler?.(null)
  })

  if (currentHoverId === rect.id) {
    rectEl.classList.add("hover")
  }

  rectLayer.append(rectEl)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !overlayEl) return
  dragStart = { x: event.clientX, y: event.clientY }
  overlayEl.setPointerCapture(event.pointerId)

  if (!previewEl) {
    previewEl = document.createElement("div")
    previewEl.className = "icanmanga-preview"
    overlayEl.append(previewEl)
  }

  updatePreview(event.clientX, event.clientY)
}

function onPointerMove(event: PointerEvent) {
  if (!dragStart || !previewEl) return
  updatePreview(event.clientX, event.clientY)
}

function onPointerUp(event: PointerEvent) {
  if (!dragStart || !previewEl) return
  const rect = finalizeRect(event.clientX, event.clientY)
  previewEl.remove()
  previewEl = null
  dragStart = null

  if (rect) {
    rectAddedHandler?.(rect)
  }
}

function updatePreview(x: number, y: number) {
  if (!previewEl || !dragStart) return
  const left = Math.min(dragStart.x, x)
  const top = Math.min(dragStart.y, y)
  const width = Math.abs(dragStart.x - x)
  const height = Math.abs(dragStart.y - y)
  previewEl.style.left = `${left}px`
  previewEl.style.top = `${top}px`
  previewEl.style.width = `${width}px`
  previewEl.style.height = `${height}px`
}

function finalizeRect(x: number, y: number): Rect | null {
  if (!dragStart) return null
  const left = Math.min(dragStart.x, x)
  const top = Math.min(dragStart.y, y)
  const width = Math.abs(dragStart.x - x)
  const height = Math.abs(dragStart.y - y)

  if (width < FLAGS.minRectSizePx || height < FLAGS.minRectSizePx) return null

  return {
    id: crypto.randomUUID(),
    x: Math.round(left),
    y: Math.round(top),
    w: Math.round(width),
    h: Math.round(height),
  }
}

export function mountOverlay() {
  ensureOverlay()
}

export function unmountOverlay() {
  removeOverlay()
}

export function setRects(rects: Rect[], results?: Result[]) {
  if (!rectLayer) return
  rectLayer.innerHTML = ""
  rects.forEach((rect, index) => createRectElement(rect, index, results))
}

export function setHoverRectId(id: string | null) {
  currentHoverId = id
  if (!rectLayer) return
  rectLayer.querySelectorAll(".icanmanga-rect").forEach((node) => {
    const rectEl = node as HTMLDivElement
    if (rectEl.dataset.rectId === id) {
      rectEl.classList.add("hover")
    } else {
      rectEl.classList.remove("hover")
    }
  })
}

export function onRectAdded(callback: (rect: Rect) => void) {
  rectAddedHandler = callback
}

export function onRectHover(callback: (rectId: string | null) => void) {
  hoverHandler = callback
}