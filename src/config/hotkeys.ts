type NormalizedHotkey = {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

const modifierTokens = new Map<string, keyof NormalizedHotkey>([
  ["alt", "altKey"],
  ["option", "altKey"],
  ["ctrl", "ctrlKey"],
  ["control", "ctrlKey"],
  ["cmd", "metaKey"],
  ["command", "metaKey"],
  ["meta", "metaKey"],
  ["shift", "shiftKey"],
])

function normalizeKeyToken(token: string): string {
  const lower = token.trim().toLowerCase()
  if (lower === "esc") return "escape"
  return lower
}

export function normalizeHotkey(hotkey: string): NormalizedHotkey | null {
  const parts = hotkey.split("+").map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const normalized: NormalizedHotkey = {
    key: "",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  }

  for (const part of parts) {
    const token = normalizeKeyToken(part)
    const modifier = modifierTokens.get(token)
    if (modifier) {
      normalized[modifier] = true
      continue
    }

    if (normalized.key) {
      console.warn("Hotkey has multiple non-modifier keys:", hotkey)
      return null
    }

    normalized.key = token
  }

  if (!normalized.key) {
    console.warn("Hotkey missing key:", hotkey)
    return null
  }

  return normalized
}

export function normalizeHotkeyList(hotkeys: string[]): NormalizedHotkey[] {
  return hotkeys
    .map((hotkey) => normalizeHotkey(hotkey))
    .filter((hotkey): hotkey is NormalizedHotkey => Boolean(hotkey))
}

export function matchesHotkey(event: KeyboardEvent, hotkey: NormalizedHotkey): boolean {
  const key = event.key.toLowerCase()
  return (
    key === hotkey.key &&
    event.altKey === hotkey.altKey &&
    event.ctrlKey === hotkey.ctrlKey &&
    event.metaKey === hotkey.metaKey &&
    event.shiftKey === hotkey.shiftKey
  )
}

export type { NormalizedHotkey }