import { FLAGS } from "../config/flags"
import {
  matchesHotkey,
  normalizeHotkey,
  normalizeHotkeyList,
} from "../config/hotkeys"
import type { Rect, Result, Session, TranslateSessionResponse } from "../shared/types"
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
  setRowHoverHandler,
  setRows,
  showToast,
  unmountPanel,
} from "./panel"

let session: Session | null = null
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
    setRects(session.rects)
    setRows(session.rects)
  })

  onRectHover((rectId) => {
    setHoverRowId(rectId)
  })

  setRowHoverHandler((rectId) => {
    setHoverRectId(rectId)
  })

  setRows(session?.rects ?? [])
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
  }
}

function clearSession() {
  session = null
}

async function translateSession() {
  if (!session || session.rects.length === 0) return

  setRows(session.rects, undefined, "translating")

  const response = await sendMessage({
    type: "TRANSLATE_SESSION",
    payload: {
      rects: session.rects,
      viewport: session.viewport,
      url: session.url,
    },
  })

  if (!response || response.type !== "TRANSLATE_SESSION_RESULT") {
    handleGlobalFailure("Translation failed")
    return
  }

  if (response.error) {
    handleGlobalFailure(response.error)
    return
  }

  session.results = response.payload.results
  setRows(session.rects, session.results, "complete")
  setRects(session.rects, session.results)
}

function handleGlobalFailure(message: string) {
  if (!session) return
  const failed: Result[] = session.rects.map((rect) => ({
    id: rect.id,
    jp: "",
    en: "",
    error: "failed",
  }))
  session.results = failed
  setRows(session.rects, session.results, "complete")
  showToast(message, "error")
}

function undoLastRect() {
  if (!session || session.rects.length === 0) return
  session.rects.pop()
  session.results = undefined
  setRects(session.rects)
  setRows(session.rects)
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

function sendMessage(message: any): Promise<TranslateSessionResponse | null> {
  return new Promise((resolve) => {
    try {
      ext.runtime.sendMessage(message, (response: TranslateSessionResponse) => {
        if (ext.runtime.lastError) {
          resolve(null)
        } else {
          resolve(response as TranslateSessionResponse)
        }
      })
    } catch {
      showToast("Extension reloaded. Reload the page and try again.", "error")
      resolve(null)
    }
  })
}

init()

export { enterTranslateMode, exitTranslateMode, startSession, clearSession, translateSession, undoLastRect }
