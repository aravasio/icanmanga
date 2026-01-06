import type { Rect, Result } from "../shared/types"
import { overlayStyles } from "./styles"

let panelEl: HTMLDivElement | null = null
let bodyEl: HTMLDivElement | null = null
let hoverHandler: ((rectId: string | null) => void) | null = null
let styleEl: HTMLStyleElement | null = null

function injectStyles() {
  if (styleEl) return
  styleEl = document.createElement("style")
  styleEl.textContent = overlayStyles
  document.head.append(styleEl)
}

export type PanelPhase = "pending" | "translating" | "complete"

export function mountPanel() {
  if (panelEl) return
  injectStyles()
  panelEl = document.createElement("div")
  panelEl.className = "icanmanga-panel"

  const header = document.createElement("div")
  header.className = "icanmanga-panel-header"
  header.innerHTML = `
    <h2 class="icanmanga-panel-title">ICanManga</h2>
    <p class="icanmanga-panel-subtitle">Select bubbles in order, then press Enter.</p>
  `

  bodyEl = document.createElement("div")
  bodyEl.className = "icanmanga-panel-body"

  panelEl.append(header, bodyEl)
  document.documentElement.append(panelEl)
}

export function unmountPanel() {
  panelEl?.remove()
  panelEl = null
  bodyEl = null
}

export function setRows(rects: Rect[], results?: Result[], phase: PanelPhase = "pending") {
  if (!bodyEl) return
  bodyEl.innerHTML = ""
  const resultMap = new Map(results?.map((result) => [result.id, result]) ?? [])

  rects.forEach((rect, index) => {
    const row = document.createElement("div")
    row.className = "icanmanga-row"
    row.dataset.rectId = rect.id

    row.addEventListener("mouseenter", () => hoverHandler?.(rect.id))
    row.addEventListener("mouseleave", () => hoverHandler?.(null))

    const title = document.createElement("div")
    title.className = "icanmanga-row-title"
    title.textContent = `#${index + 1}`

    const status = document.createElement("div")
    status.className = "icanmanga-row-status"

    const result = resultMap.get(rect.id)
    if (!result) {
      status.textContent = phase === "translating" ? "translating..." : "pending"
    } else if (result.error) {
      status.textContent = result.error
    } else {
      status.textContent = "translated"
    }

    row.append(title, status)

    if (result && !result.error) {
      if (result.jp) {
        row.append(createTextBlock("JP", result.jp))
        row.append(createCopyActions(result.jp, "Copy JP"))
      }
      if (result.en) {
        row.append(createTextBlock("EN", result.en))
        row.append(createCopyActions(result.en, "Copy EN"))
      }
      if (result.warnings?.length) {
        const warning = document.createElement("div")
        warning.className = "icanmanga-row-status"
        warning.textContent = result.warnings.join(" ")
        row.append(warning)
      }
    }

    bodyEl?.append(row)
  })
}

export function setRowHoverHandler(callback: (rectId: string | null) => void) {
  hoverHandler = callback
}

export function setHoverRowId(id: string | null) {
  if (!bodyEl) return
  bodyEl.querySelectorAll(".icanmanga-row").forEach((node) => {
    const rowEl = node as HTMLDivElement
    if (rowEl.dataset.rectId === id) {
      rowEl.classList.add("hover")
    } else {
      rowEl.classList.remove("hover")
    }
  })
}

export function showToast(message: string, type: "error" | "info" = "info") {
  const toast = document.createElement("div")
  toast.className = `icanmanga-toast ${type}`
  toast.textContent = message
  document.documentElement.append(toast)
  requestAnimationFrame(() => toast.classList.add("show"))
  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => toast.remove(), 200)
  }, 2500)
}

function createTextBlock(label: string, text: string) {
  const block = document.createElement("div")
  block.className = "icanmanga-text-block"
  block.innerHTML = `<p><strong>${label}:</strong> ${escapeHtml(text)}</p>`
  return block
}

function createCopyActions(text: string, label: string) {
  const wrap = document.createElement("div")
  wrap.className = "icanmanga-actions"

  const button = document.createElement("button")
  button.className = "icanmanga-button"
  button.type = "button"
  button.textContent = label
  button.disabled = text.length === 0
  button.addEventListener("click", () => copyToClipboard(text))

  wrap.append(button)
  return wrap
}

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      showToast("Copied", "info")
      return
    }
  } catch {
    // Fallback below
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.top = "-1000px"
  document.body.append(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
  showToast("Copied", "info")
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}