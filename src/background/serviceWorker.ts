import { FLAGS } from "../config/flags"
import type {
  BackgroundRequest,
  BackgroundResponse,
  ProviderImage,
  Rect,
  Result,
  Settings,
  TranslateSessionRequest,
} from "../shared/types"
import { translateImages } from "../providers/openaiVision"

const SETTINGS_KEY = "icm_settings"
const CACHE_KEY = "icm_cache"

const ext = (globalThis as any).browser ?? chrome

ext.runtime.onMessage.addListener(
  (message: BackgroundRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: BackgroundResponse) => void) => {
    if (message.type === "TRANSLATE_SESSION") {
      handleTranslate(message, sender)
        .then((response) => sendResponse(response))
        .catch((error) => {
          sendResponse({
            type: "TRANSLATE_SESSION_RESULT",
            payload: { results: [], cacheHit: false },
            error: error.message || "Translation failed",
          })
        })
      return true
    }

    if (message.type === "GET_SETTINGS") {
      getSettings()
        .then((settings) =>
          sendResponse({ type: "SETTINGS_RESULT", payload: settings })
        )
        .catch((error) =>
          sendResponse({
            type: "SETTINGS_RESULT",
            payload: { apiKey: "" },
            error: error.message || "Failed to load settings",
          })
        )
      return true
    }

    if (message.type === "SET_SETTINGS") {
      setSettings(message.payload)
        .then(() =>
          sendResponse({ type: "SETTINGS_RESULT", payload: message.payload })
        )
        .catch((error) =>
          sendResponse({
            type: "SETTINGS_RESULT",
            payload: message.payload,
            error: error.message || "Failed to save settings",
          })
        )
      return true
    }

    return false
  }
)

async function handleTranslate(
  message: TranslateSessionRequest,
  sender: chrome.runtime.MessageSender
): Promise<BackgroundResponse> {
  const settings = await getSettings()
  const apiKey = settings.apiKey || FLAGS.provider.apiKey
  if (!apiKey) {
    return {
      type: "TRANSLATE_SESSION_RESULT",
      payload: { results: [], cacheHit: false },
      error: "Missing API key",
    }
  }

  const cacheKey = createCacheKey(message.payload.url, message.payload.viewport, message.payload.rects)
  const cached = await readCache(cacheKey)
  if (cached) {
    return {
      type: "TRANSLATE_SESSION_RESULT",
      payload: { results: cached.results, cacheHit: true },
    }
  }

  const bitmap = await captureVisibleTab(sender.tab?.windowId)
  const cropResults = await cropRects(bitmap, message.payload.rects, message.payload.viewport.dpr)
  bitmap.close()

  const providerImages = cropResults
    .filter((item) => !item.error && item.image)
    .map((item) => item.image as ProviderImage)

  let providerResults: Result[] = []
  if (providerImages.length) {
    const providerOutput = await translateImages({ images: providerImages }, apiKey)
    providerResults = providerOutput.results
  }

  const results = message.payload.rects.map((rect) => {
    const crop = cropResults.find((item) => item.id === rect.id)
    if (crop?.error) {
      return { id: rect.id, jp: "", en: "", error: "failed" }
    }
    const result = providerResults.find((item) => item.id === rect.id)
    if (!result) {
      return { id: rect.id, jp: "", en: "", error: "failed" }
    }
    return {
      id: rect.id,
      jp: result.jp ?? "",
      en: result.en ?? "",
      warnings: result.warnings,
      error: result.error,
    }
  })

  await writeCache(cacheKey, results)

  return {
    type: "TRANSLATE_SESSION_RESULT",
    payload: { results, cacheHit: false },
  }
}

async function captureVisibleTab(windowId?: number): Promise<ImageBitmap> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    ext.tabs.captureVisibleTab(
      windowId,
      { format: "png" },
      (url: string) => {
        const err = ext.runtime.lastError
        if (err || !url) {
          reject(new Error("Capture failed"))
          return
        }
        resolve(url)
      }
    )
  })

  const blob = await (await fetch(dataUrl)).blob()
  return await createImageBitmap(blob)
}

async function cropRects(bitmap: ImageBitmap, rects: Rect[], dpr: number) {
  const results: Array<{ id: string; image?: ProviderImage; error?: string }> = []
  for (const rect of rects) {
    try {
      const scaled = scaleRect(rect, dpr, bitmap.width, bitmap.height)
      if (!scaled) {
        results.push({ id: rect.id, error: "failed" })
        continue
      }

      const { canvas, width, height } = drawCrop(bitmap, scaled)
      const { targetWidth, targetHeight } = downscale(width, height)

      const finalCanvas = new OffscreenCanvas(targetWidth, targetHeight)
      const ctx = finalCanvas.getContext("2d")
      if (!ctx) {
        results.push({ id: rect.id, error: "failed" })
        continue
      }

      ctx.drawImage(canvas, 0, 0, width, height, 0, 0, targetWidth, targetHeight)
      const blob = await finalCanvas.convertToBlob({ type: FLAGS.crop.outputMime })
      const bytesBase64 = await blobToBase64(blob)

      results.push({
        id: rect.id,
        image: {
          id: rect.id,
          bytesBase64,
          mime: FLAGS.crop.outputMime,
        },
      })
    } catch {
      results.push({ id: rect.id, error: "failed" })
    }
  }

  return results
}

function scaleRect(rect: Rect, dpr: number, maxW: number, maxH: number) {
  const x = Math.round(rect.x * dpr)
  const y = Math.round(rect.y * dpr)
  const w = Math.round(rect.w * dpr)
  const h = Math.round(rect.h * dpr)

  const clampedX = Math.min(Math.max(0, x), maxW)
  const clampedY = Math.min(Math.max(0, y), maxH)
  const clampedW = Math.min(w, maxW - clampedX)
  const clampedH = Math.min(h, maxH - clampedY)

  if (clampedW <= 0 || clampedH <= 0) return null
  return { x: clampedX, y: clampedY, w: clampedW, h: clampedH }
}

function drawCrop(bitmap: ImageBitmap, rect: { x: number; y: number; w: number; h: number }) {
  const canvas = new OffscreenCanvas(rect.w, rect.h)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h)
  return { canvas, width: rect.w, height: rect.h }
}

function downscale(width: number, height: number) {
  const maxDim = Math.max(width, height)
  if (maxDim <= FLAGS.crop.maxDimensionPx) {
    return { targetWidth: width, targetHeight: height }
  }
  const scale = FLAGS.crop.maxDimensionPx / maxDim
  return {
    targetWidth: Math.max(1, Math.round(width * scale)),
    targetHeight: Math.max(1, Math.round(height * scale)),
  }
}

async function blobToBase64(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(arrayBuffer)
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

async function getSettings(): Promise<Settings> {
  const data = await storageGet(SETTINGS_KEY)
  return data?.[SETTINGS_KEY] ?? { apiKey: "" }
}

async function setSettings(settings: Settings) {
  await storageSet({ [SETTINGS_KEY]: settings })
}

type CacheEntry = {
  key: string
  results: Result[]
  timestamp: number
}

async function readCache(key: string): Promise<CacheEntry | null> {
  const data = await storageGet(CACHE_KEY)
  const entries: CacheEntry[] = data?.[CACHE_KEY] ?? []
  return entries.find((entry) => entry.key === key) ?? null
}

async function writeCache(key: string, results: Result[]) {
  const data = await storageGet(CACHE_KEY)
  const entries: CacheEntry[] = data?.[CACHE_KEY] ?? []
  const timestamp = Date.now()
  const next = [{ key, results, timestamp }, ...entries.filter((e) => e.key !== key)]
  if (next.length > FLAGS.cache.maxEntries) {
    next.length = FLAGS.cache.maxEntries
  }
  await storageSet({ [CACHE_KEY]: next })
}

function createCacheKey(url: string, viewport: { width: number; height: number; dpr: number }, rects: Rect[]) {
  const normalized = rects.map((rect) => ({
    x: round(rect.x / viewport.width),
    y: round(rect.y / viewport.height),
    w: round(rect.w / viewport.width),
    h: round(rect.h / viewport.height),
  }))
  return JSON.stringify({
    url,
    viewport: { w: viewport.width, h: viewport.height, dpr: viewport.dpr },
    rects: normalized,
    provider: "openai",
    model: FLAGS.provider.model,
  })
}

function round(value: number) {
  const factor = Math.pow(10, FLAGS.cache.rectRoundingDecimals)
  return Math.round(value * factor) / factor
}

function storageGet(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ext.storage.local.get(key, (data: any) => {
      const err = ext.runtime.lastError
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

function storageSet(data: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    ext.storage.local.set(data, () => {
      const err = ext.runtime.lastError
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
