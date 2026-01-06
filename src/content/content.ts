import { FLAGS } from "../config/flags"
import {
  matchesHotkey,
  normalizeHotkey,
  normalizeHotkeyList,
} from "../config/hotkeys"
import type {
  Attempt,
  Rect,
  Result,
  Session,
  TranslateRectResponse,
  TranslateSessionResponse,
} from "../shared/types"
import {
  mountOverlay,
  onRectAdded,
  onRectHover,
  setHoverRectId,
  setRects,
  unmountOverlay,
} from "./overlay"
import {
  mountPanel,
  setHoverRowId,
  setRetryHandler,
  setRowHoverHandler,
  setRows,
  showToast,
  unmountPanel,
} from "./panel"

type SessionState = Session & {
  attempts: Record<string, Attempt[]>
  translatingIds: Set<string>
}

let session: SessionState | null = null
let isTranslateMode = false
let scrollLock: { x: number; y: number } | null = null
let originalStyles:
  | {
      htmlOverflow: string
      bodyOverflow: string
      bodyTouch: string
      htmlUserSelect: string
      bodyUserSelect: string
    }
  | null = null

const ext = (globalThis as any).browser ?? chrome

const toggleHotkey = normalizeHotkey(FLAGS.hotkeys.toggleTranslateMode)
const translateHotkey = normalizeHotkey(FLAGS.hotkeys.translateSession)
const undoHotkeys = normalizeHotkeyList(FLAGS.hotkeys.undo)
const exitHotkey = normalizeHotkey(FLAGS.hotkeys.exit)

const scrollKeys = new Set([
  " ",
  "pageup",
  "pagedown",
  "home",
  "end",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
])

function init() {
  window.addEventListener("keydown", onKeyDown, true)
}

function onKeyDown(event: KeyboardEvent) {
  if (toggleHotkey && matchesHotkey(event, toggleHotkey)) {
    event.preventDefault()
    isTranslateMode ? exitTranslateMode() : enterTranslateMode()
    return
  }

  if (!isTranslateMode) return

  const key = event.key.toLowerCase()
  if (scrollKeys.has(key)) {
    event.preventDefault()
    return
  }

  if (translateHotkey && matchesHotkey(event, translateHotkey)) {
    event.preventDefault()
    translateSession()
    return
  }

  if (exitHotkey && matchesHotkey(event, exitHotkey)) {
    event.preventDefault()
    exitTranslateMode()
    return
  }

  for (const hotkey of undoHotkeys) {
    if (matchesHotkey(event, hotkey)) {
      event.preventDefault()
      undoLastRect()
      return
    }
  }
}

function enterTranslateMode() {
  if (isTranslateMode) return
  isTranslateMode = true
  startSession()
  mountOverlay()
  mountPanel()

  onRectAdded((rect) => {
    if (!session) return
    if (session.rects.length >= FLAGS.maxRectsPerSession) {
      showToast(`Max ${FLAGS.maxRectsPerSession} selections`, "error")
      return
    }
    session.rects.push(rect)
    session.results = undefined
    session.attempts = {}
    session.translatingIds.clear()
    setRects(session.rects)
    setRows(session.rects, session.results, "pending", session.attempts, session.translatingIds)
  })

  onRectHover((rectId) => {
    setHoverRowId(rectId)
  })

  setRowHoverHandler((rectId) => {
    setHoverRectId(rectId)
  })

  setRetryHandler((rectId) => {
    retryRect(rectId)
  })

  if (session) {
    setRows(session.rects, session.results, "pending", session.attempts, session.translatingIds)
  } else {
    setRows([])
  }
  setRects(session?.rects ?? [])
  lockScroll()
}

function exitTranslateMode() {
  if (!isTranslateMode) return
  isTranslateMode = false
  clearSession()
  unmountOverlay()
  unmountPanel()
  unlockScroll()
}

function startSession() {
  session = {
    url: window.location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
    rects: [],
    attempts: {},
    translatingIds: new Set(),
  }
}

function clearSession() {
  session = null
}

async function translateSession() {
  if (!session || session.rects.length === 0) return

  session.attempts = {}
  session.translatingIds = new Set(session.rects.map((rect) => rect.id))
  setRows(session.rects, undefined, "translating", session.attempts, session.translatingIds)

  const response = await sendMessage({
    type: "TRANSLATE_SESSION",
    payload: {
      rects: session.rects,
      viewport: session.viewport,
      url: session.url,
    },
  })

  if (!response || response.type !== "TRANSLATE_SESSION_RESULT") {
    session.translatingIds.clear()
    handleGlobalFailure("Translation failed")
    return
  }

  if (response.error) {
    session.translatingIds.clear()
    handleGlobalFailure(response.error)
    return
  }

  session.results = response.payload.results
  session.translatingIds.clear()
  session.attempts = {}
  response.payload.results.forEach((result) => recordAttempt(result.id, result))
  setRows(session.rects, session.results, "complete", session.attempts, session.translatingIds)
  setRects(session.rects, session.results)
}

function handleGlobalFailure(message: string) {
  if (!session) return
  session.attempts = {}
  session.results = []
  session.rects.forEach((rect) => {
    recordAttempt(rect.id, { id: rect.id, jp: "", en: "", error: "failed" })
  })
  setRows(session.rects, session.results, "complete", session.attempts, session.translatingIds)
  showToast(message, "error")
}

function undoLastRect() {
  if (!session || session.rects.length === 0) return
  const removed = session.rects.pop()
  session.results = undefined
  if (removed) {
    delete session.attempts[removed.id]
    session.translatingIds.delete(removed.id)
  }
  setRects(session.rects)
  setRows(session.rects, session.results, "pending", session.attempts, session.translatingIds)
}

function lockScroll() {
  if (scrollLock) return
  scrollLock = { x: window.scrollX, y: window.scrollY }
  originalStyles = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyTouch: document.body.style.touchAction,
    htmlUserSelect: document.documentElement.style.userSelect,
    bodyUserSelect: document.body.style.userSelect,
  }
  document.documentElement.style.overflow = "hidden"
  document.body.style.overflow = "hidden"
  document.body.style.touchAction = "none"
  document.documentElement.style.userSelect = "none"
  document.body.style.userSelect = "none"

  window.addEventListener("wheel", preventScroll, { passive: false })
  window.addEventListener("touchmove", preventScroll, { passive: false })
  window.addEventListener("scroll", forceScrollLock, { passive: false })
}

function unlockScroll() {
  if (!scrollLock) return
  window.removeEventListener("wheel", preventScroll)
  window.removeEventListener("touchmove", preventScroll)
  window.removeEventListener("scroll", forceScrollLock)

  if (originalStyles) {
    document.documentElement.style.overflow = originalStyles.htmlOverflow
    document.body.style.overflow = originalStyles.bodyOverflow
    document.body.style.touchAction = originalStyles.bodyTouch
    document.documentElement.style.userSelect = originalStyles.htmlUserSelect
    document.body.style.userSelect = originalStyles.bodyUserSelect
  }

  scrollLock = null
  originalStyles = null
}

function preventScroll(event: Event) {
  event.preventDefault()
  forceScrollLock()
}

function forceScrollLock() {
  if (!scrollLock) return
  window.scrollTo(scrollLock.x, scrollLock.y)
}

function sendMessage(message: any): Promise<TranslateSessionResponse | TranslateRectResponse | null> {
  return new Promise((resolve) => {
    try {
      ext.runtime.sendMessage(message, (response: TranslateSessionResponse | TranslateRectResponse) => {
        if (ext.runtime.lastError) {
          resolve(null)
        } else {
          resolve(response as TranslateSessionResponse | TranslateRectResponse)
        }
      })
    } catch {
      showToast("Extension reloaded. Reload the page and try again.", "error")
      resolve(null)
    }
  })
}

async function retryRect(rectId: string) {
  if (!session) return
  const attempts = session.attempts[rectId]
  const lastAttempt = attempts?.[attempts.length - 1]
  if (!lastAttempt || !lastAttempt.error) return

  const failCount = lastAttempt.failCount ?? 1
  if (failCount >= 3) {
    showToast("Retry limit reached for this bubble.", "error")
    return
  }

  if (session.translatingIds.has(rectId)) return
  const rect = session.rects.find((item) => item.id === rectId)
  if (!rect) return

  session.translatingIds.add(rectId)
  setRows(session.rects, session.results, "complete", session.attempts, session.translatingIds)

  const response = await sendMessage({
    type: "TRANSLATE_RECT",
    payload: {
      rect,
      viewport: session.viewport,
      url: session.url,
    },
  })

  session.translatingIds.delete(rectId)

  if (!response || response.type !== "TRANSLATE_RECT_RESULT") {
    handleRectFailure(rectId, "Translation failed")
    return
  }

  if (response.error) {
    handleRectFailure(rectId, response.error)
    return
  }

  recordAttempt(rectId, response.payload.result)
  setRows(session.rects, session.results, "complete", session.attempts, session.translatingIds)
  setRects(session.rects, session.results)
}

function handleRectFailure(rectId: string, message: string) {
  if (!session) return
  recordAttempt(rectId, { id: rectId, jp: "", en: "", error: "failed" })
  setRows(session.rects, session.results, "complete", session.attempts, session.translatingIds)
  setRects(session.rects, session.results)
  showToast(message, "error")
}

function recordAttempt(rectId: string, result: Result) {
  if (!session) return
  const attempts = session.attempts[rectId] ?? []
  const nextResult = { ...result }

  if (nextResult.error) {
    const lastAttempt = attempts[attempts.length - 1]
    if (lastAttempt?.error) {
      lastAttempt.failCount = Math.min(3, (lastAttempt.failCount ?? 1) + 1)
    } else {
      attempts.push({ ...nextResult, failCount: 1 })
    }
  } else {
    attempts.push(nextResult)
  }

  session.attempts[rectId] = attempts
  upsertResult(nextResult)
}

function upsertResult(result: Result) {
  if (!session) return
  if (!session.results) {
    session.results = []
  }
  const index = session.results.findIndex((item) => item.id === result.id)
  if (index >= 0) {
    session.results[index] = result
  } else {
    session.results.push(result)
  }
}

init()

export { enterTranslateMode, exitTranslateMode, startSession, clearSession, translateSession, undoLastRect }
