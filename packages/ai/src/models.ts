/**
 * Model registry and pricing.
 *
 * Every model id the product sends to a provider is listed here, with its rate,
 * so a cost is computed the same way everywhere and a model name is never a
 * string literal at a call site. Mirrors `@repo/ai/models` in gurukulhq.
 *
 * Rates are USD per 1,000,000 tokens from the providers' public pricing. They
 * go stale: re-check when adding a model or when a provider reprices.
 */

export type Provider = "openai"

export interface ModelInfo {
    id: string
    provider: Provider
    /** USD per 1M input tokens. */
    inputPerMillion: number
    /** USD per 1M output tokens. 0 for embedding and transcription models. */
    outputPerMillion: number
    /** Transcription is priced per minute of audio (`perMinute`), not per token. */
    kind: "chat" | "embedding" | "transcription"
    perMinute?: number
}

export const MODELS = {
    "gpt-4o-mini": { id: "gpt-4o-mini", provider: "openai", inputPerMillion: 0.15, outputPerMillion: 0.6, kind: "chat" },
    "gpt-4o": { id: "gpt-4o", provider: "openai", inputPerMillion: 2.5, outputPerMillion: 10, kind: "chat" },
    /** Only the project quiz uses it (plan/ai-models AM-1): kept as it was; moving it is a decision with a re-check. */
    "gpt-4-turbo-preview": { id: "gpt-4-turbo-preview", provider: "openai", inputPerMillion: 10, outputPerMillion: 30, kind: "chat" },
    "whisper-1": { id: "whisper-1", provider: "openai", inputPerMillion: 0, outputPerMillion: 0, kind: "transcription", perMinute: 0.006 },
    "text-embedding-3-small": { id: "text-embedding-3-small", provider: "openai", inputPerMillion: 0.02, outputPerMillion: 0, kind: "embedding" },
} as const satisfies Record<string, ModelInfo>

export type ModelId = keyof typeof MODELS

/** The default chat model. Change it here, not at call sites. */
export const DEFAULT_CHAT_MODEL: ModelId = "gpt-4o-mini"

export function getModel(modelId: string): ModelInfo | undefined {
    return (MODELS as Record<string, ModelInfo>)[modelId]
}

/**
 * USD cost of a call. An unknown model costs 0 rather than throwing, since a
 * pricing gap must never break a request, and `isKnown: false` says so.
 */
export function costUsd(modelId: string, inputTokens: number, outputTokens: number): { usd: number; isKnown: boolean } {
    const model = getModel(modelId)
    if (!model) return { usd: 0, isKnown: false }
    return {
        usd: (Math.max(0, inputTokens) / 1_000_000) * model.inputPerMillion + (Math.max(0, outputTokens) / 1_000_000) * model.outputPerMillion,
        isKnown: true,
    }
}
