import { FLAGS } from "../config/flags"
import type { Attempt, Rect, Result } from "../shared/types"
import { overlayStyles } from "./styles"

let panelEl: HTMLDivElement | null = null
let bodyEl: HTMLDivElement | null = null
let hoverHandler: ((rectId: string | null) => void) | null = null
let retryHandler: ((rectId: string) => void) | null = null
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
  document.documentElement.style.setProperty(
    "--icanmanga-panel-width",
    `${FLAGS.panel.widthPx}px`
  )
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

export function setRows(
  rects: Rect[],
  results?: Result[],
  phase: PanelPhase = "pending",
  attemptsByRect?: Record<string, Attempt[]>,
  translatingIds?: Set<string>
) {
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

    const attempts = attemptsByRect?.[rect.id] ?? []
    const latestAttempt = attempts.length ? attempts[attempts.length - 1] : resultMap.get(rect.id)
    const isTranslating = translatingIds?.has(rect.id) ?? false

    if (isTranslating) {
      status.textContent = "translating..."
    } else if (!latestAttempt) {
      status.textContent = phase === "translating" ? "translating..." : "pending"
    } else if (latestAttempt.error) {
      const failCount = latestAttempt.failCount ?? 1
      status.textContent = `failed (${failCount}/3)`
    } else {
      status.textContent = "translated"
    }

    row.append(title, status)

    if (attempts.length) {
      attempts.forEach((attempt, attemptIndex) => {
        row.append(createAttemptBlock(rect.id, attempt, attemptIndex, attempts.length, isTranslating))
      })
    } else {
      const result = resultMap.get(rect.id)
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
    }

    bodyEl?.append(row)
  })
}

export function setRowHoverHandler(callback: (rectId: string | null) => void) {
  hoverHandler = callback
}

export function setRetryHandler(callback: (rectId: string) => void) {
  retryHandler = callback
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

function createAttemptBlock(
  rectId: string,
  attempt: Attempt,
  attemptIndex: number,
  totalAttempts: number,
  isTranslating: boolean
) {
  const wrap = document.createElement("div")
  wrap.className = "icanmanga-attempt"

  const header = document.createElement("div")
  header.className = "icanmanga-attempt-header"
  const label = document.createElement("span")
  label.className = "icanmanga-attempt-label"
  label.textContent = `Attempt ${attemptIndex + 1}${attemptIndex + 1 === totalAttempts ? " (latest)" : ""}`
  header.append(label)

  if (attempt.error) {
    const failCount = attempt.failCount ?? 1
    const status = document.createElement("span")
    status.className = "icanmanga-attempt-status error"
    status.textContent = `failed (${failCount}/3)`
    header.append(status)
  }

  wrap.append(header)

  if (attempt.error) {
    const actions = document.createElement("div")
    actions.className = "icanmanga-actions"

    const retryButton = document.createElement("button")
    retryButton.className = "icanmanga-button"
    retryButton.type = "button"
    retryButton.textContent = "Retry"
    retryButton.disabled = isTranslating || (attempt.failCount ?? 1) >= 3
    retryButton.addEventListener("click", () => retryHandler?.(rectId))

    actions.append(retryButton)
    wrap.append(actions)
    return wrap
  }

  if (attempt.jp) {
    wrap.append(createTextBlock("JP", attempt.jp))
    wrap.append(createCopyActions(attempt.jp, "Copy JP"))
  }
  if (attempt.en) {
    wrap.append(createTextBlock("EN", attempt.en))
    wrap.append(createCopyActions(attempt.en, "Copy EN"))
  }
  if (attempt.warnings?.length) {
    const warning = document.createElement("div")
    warning.className = "icanmanga-row-status"
    warning.textContent = attempt.warnings.join(" ")
    wrap.append(warning)
  }

  return wrap
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
