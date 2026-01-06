# Module: providers/openaiVision.ts

## Purpose
Implements a single provider that performs OCR and translation via OpenAI vision models.

## Responsibilities
- Build the provider request from cropped images.
- Call the OpenAI API with the API key from storage.
- Enforce JSON-only response output.
- Validate and normalize provider response into `Result[]`.

## Public Interface
- `translateImages(input: ProviderInput): Promise<ProviderOutput>`

## Input/Output Shapes
```ts
type ProviderInput = {
  images: Array<{ id: string, bytesBase64: string, mime: "image/png" | "image/jpeg" }>
}

type ProviderOutput = {
  results: Array<{ id: string, jp: string, en: string, confidence?: number, warnings?: string[], error?: string }>
}
```

## Behavioral Rules
- One API call per session with multiple images.
- Each image is treated independently; ordering is preserved by `id`.
- Responses must be strict JSON with no markdown.
- If OCR text is empty or unreadable, return empty strings and a warning rather than failing the entire request.

## Error Handling
- Network/auth errors throw a provider-level error to be handled by the background service worker.
- Malformed JSON or missing fields should be treated as provider errors.

## Dependencies
- Extension storage for API key.
- Optional HTTP client wrapper.

## Notes
- Prompt should explicitly request JSON-only output and per-image results.
