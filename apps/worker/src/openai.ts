// Minimal fetch-based OpenAI chat client (Workers-native - no Node SDK).
import type { ModelId } from "@repo/ai"
import { RetryableError } from "./jobs/retryable"

const OPENAI_API = "https://api.openai.com/v1"

export async function chatJSON(opts: {
	apiKey: string
	/** A registered model, from `modelFor(task)` (plan/ai-models): never a literal. */
	model: ModelId
	system: string
	user: string
	maxTokens?: number
	temperature?: number
	/** Aborts the call; a timeout is retryable (nothing was decided). Set it below the alarm's CPU ceiling. */
	timeoutMs?: number
}): Promise<string> {
	let res: Response
	try {
		res = await fetch(`${OPENAI_API}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${opts.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: opts.model,
			messages: [
				{ role: "system", content: opts.system },
				{ role: "user", content: opts.user },
			],
			temperature: opts.temperature ?? 0.7,
			max_tokens: opts.maxTokens ?? 8000,
			response_format: { type: "json_object" },
		}),
			...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
		})
	} catch (error: unknown) {
		if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) throw new RetryableError("OpenAI took too long")
		throw error
	}
	if (!res.ok) {
		const err = await res.text()
		// Rate limits and 5xx are transient: nothing was decided, so another alarm
		// can safely try again. A 400 will fail identically every time.
		// Except an exhausted account: that 429 won't clear by waiting, so fail now rather than twice more.
		if (res.status === 429 && /insufficient_quota|credit_balance_exhausted/.test(err)) {
			console.error("[openai] the account is out of credits:", err.slice(0, 200))
			throw new Error("OpenAI quota exhausted")
		}
		if (res.status === 429 || res.status >= 500) {
			throw new RetryableError(`OpenAI is unavailable (${res.status})`)
		}
		throw new Error(`OpenAI API error ${res.status}: ${err}`)
	}
	const data = (await res.json()) as {
		choices?: Array<{ message?: { content?: string } }>
	}
	const content = data.choices?.[0]?.message?.content
	if (!content) throw new Error("OpenAI returned no content")
	return content
}

/**
 * A plain-text completion.
 *
 * Separate from `chatJSON` rather than a flag on it, because the two differ in
 * more than one place: this one must NOT send `response_format: json_object`, and
 * its callers want prose, not a parse. A cover letter asked for as a JSON object
 * comes back as a JSON object containing a string, which is a pointless round trip
 * and one more thing that can fail to parse.
 */
export async function chatText(opts: {
	apiKey: string
	/** A registered model, from `modelFor(task)` (plan/ai-models): never a literal. */
	model: ModelId
	system: string
	user: string
	maxTokens?: number
	temperature?: number
}): Promise<string> {
	const res = await fetch(`${OPENAI_API}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${opts.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: opts.model,
			messages: [
				{ role: "system", content: opts.system },
				{ role: "user", content: opts.user },
			],
			temperature: opts.temperature ?? 0.7,
			max_tokens: opts.maxTokens ?? 4000,
		}),
	})
	if (!res.ok) {
		const err = await res.text()
		// 429 and 5xx are worth another alarm; a 400 is a bad request that will fail
		// identically on every retry.
		// Except an exhausted account: that 429 won't clear by waiting, so fail now rather than twice more.
		if (res.status === 429 && /insufficient_quota|credit_balance_exhausted/.test(err)) {
			console.error("[openai] the account is out of credits:", err.slice(0, 200))
			throw new Error("OpenAI quota exhausted")
		}
		if (res.status === 429 || res.status >= 500) {
			throw new RetryableError(`OpenAI is unavailable (${res.status})`)
		}
		throw new Error(`OpenAI API error ${res.status}: ${err}`)
	}
	const data = (await res.json()) as {
		choices?: Array<{ message?: { content?: string } }>
	}
	return data.choices?.[0]?.message?.content ?? ""
}
