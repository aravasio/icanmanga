export const FLAGS = {
  maxRectsPerSession: 15,
  minRectSizePx: 8,
  crop: {
    maxDimensionPx: 1024,
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
  panel: {
    widthPx: 320,
  },
  provider: {
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
}
