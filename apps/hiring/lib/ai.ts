import "server-only"
import type { ModelId } from "@repo/ai"

/*
 * One inline JSON completion for the hiring app (CLAUDE.md "Long-running work":
 * a single model call that finishes well under 30 seconds runs inline, with a
 * 25-second timeout). The model comes from `modelFor(...)` at the call site.
 */

const TIMEOUT_MS = 25_000

export class AiUnavailableError extends Error {}

export async function chatJSON(opts: { model: ModelId; system: string; user: string; maxTokens?: number; temperature?: number }): Promise<unknown> {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new AiUnavailableError("AI is not configured (OPENAI_API_KEY is not set).")
    let res: Response
    try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: opts.model,
                messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.user }],
                temperature: opts.temperature ?? 0.3,
                max_tokens: opts.maxTokens ?? 2000,
                response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
    } catch (error: unknown) {
        const timedOut = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")
        throw new AiUnavailableError(timedOut ? "The AI took too long. Try again." : "The AI couldn't be reached. Try again.")
    }
    if (!res.ok) throw new AiUnavailableError(res.status === 429 ? "The AI is busy right now. Try again in a moment." : `The AI returned an error (${res.status}).`)
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new AiUnavailableError("The AI returned nothing. Try again.")
    try {
        return JSON.parse(content)
    } catch {
        throw new AiUnavailableError("The AI's answer couldn't be read. Try again.")
    }
}
