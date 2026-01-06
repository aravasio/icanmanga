import { FLAGS } from "../config/flags"
import type { ProviderInput, ProviderOutput, Result } from "../shared/types"

const SYSTEM_PROMPT = `You are an OCR + translation engine. For each image, read Japanese text and translate to natural English. Return strict JSON only, no markdown. Each result must include the image id. If unreadable, return empty jp/en with a warning.`

export async function translateImages(
  input: ProviderInput,
  apiKey: string
): Promise<ProviderOutput> {
  const content: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [
    {
      type: "text",
      text: `Return JSON: { "results": [ { "id": string, "jp": string, "en": string, "warnings"?: string[] } ] }` ,
    },
  ]

  for (const image of input.images) {
    content.push({ type: "text", text: `Image id: ${image.id}` })
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mime};base64,${image.bytesBase64}` },
    })
  }

  const response = await fetch(FLAGS.provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: FLAGS.provider.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI error: ${response.status} ${text}`)
  }

  const data = await response.json()
  const messageContent = data.choices?.[0]?.message?.content
  if (!messageContent) {
    throw new Error("OpenAI response missing content")
  }

  let parsed: ProviderOutput
  try {
    parsed = JSON.parse(messageContent)
  } catch (error) {
    throw new Error("OpenAI response was not valid JSON")
  }

  if (!Array.isArray(parsed.results)) {
    throw new Error("OpenAI response missing results")
  }

  const results = parsed.results.map((result: Result) => ({
    id: String(result.id),
    jp: result.jp ?? "",
    en: result.en ?? "",
    warnings: result.warnings,
  }))

  return { results }
}