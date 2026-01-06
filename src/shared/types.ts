export type Rect = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export type Result = {
  id: string
  jp: string
  en: string
  confidence?: number
  warnings?: string[]
  error?: string
}

export type Attempt = Result & {
  failCount?: number
}

export type Session = {
  url: string
  viewport: { width: number; height: number; dpr: number }
  rects: Rect[]
  results?: Result[]
}

export type ProviderImage = {
  id: string
  bytesBase64: string
  mime: "image/png" | "image/jpeg"
}

export type ProviderInput = {
  images: ProviderImage[]
}

export type ProviderOutput = {
  results: Result[]
}

export type TranslateSessionRequest = {
  type: "TRANSLATE_SESSION"
  payload: {
    rects: Rect[]
    viewport: { width: number; height: number; dpr: number }
    url: string
  }
}

export type TranslateSessionResponse = {
  type: "TRANSLATE_SESSION_RESULT"
  payload: {
    results: Result[]
    cacheHit: boolean
  }
  error?: string
}

export type TranslateRectRequest = {
  type: "TRANSLATE_RECT"
  payload: {
    rect: Rect
    viewport: { width: number; height: number; dpr: number }
    url: string
  }
}

export type TranslateRectResponse = {
  type: "TRANSLATE_RECT_RESULT"
  payload: {
    result: Result
  }
  error?: string
}

export type Settings = {
  apiKey: string
}

export type GetSettingsRequest = {
  type: "GET_SETTINGS"
}

export type SetSettingsRequest = {
  type: "SET_SETTINGS"
  payload: Settings
}

export type SettingsResponse = {
  type: "SETTINGS_RESULT"
  payload: Settings
  error?: string
}

export type BackgroundRequest =
  | TranslateSessionRequest
  | TranslateRectRequest
  | GetSettingsRequest
  | SetSettingsRequest

export type BackgroundResponse =
  | TranslateSessionResponse
  | TranslateRectResponse
  | SettingsResponse
