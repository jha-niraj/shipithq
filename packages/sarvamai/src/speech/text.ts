import { sarvamJson, type SarvamResult } from "./client"

// Short-text translation and language detection (plan/voice VO-2). Not for
// whole documents: Doc AI and document translation are separate jobs.

/** mayura:v1 takes 1000 characters and has modes; sarvam-translate:v1 takes 2000, formal only, all 22 languages. */
export type TranslateModel = "mayura:v1" | "sarvam-translate:v1"
export type TranslateMode = "formal" | "modern-colloquial" | "classic-colloquial" | "code-mixed"

const MAX_CHARS: Record<TranslateModel, number> = { "mayura:v1": 1000, "sarvam-translate:v1": 2000 }

export async function translate(input: {
    text: string
    /** BCP-47, or "auto" to detect. */
    source?: string
    target: string
    model?: TranslateModel
    mode?: TranslateMode
}): Promise<SarvamResult<{ text: string; sourceLanguage: string }>> {
    const model = input.model ?? "mayura:v1"
    const text = input.text.trim()
    if (!text) return { success: true, text: "", sourceLanguage: input.source ?? "auto" }
    if (text.length > MAX_CHARS[model]) return { success: false, error: `Translate at most ${MAX_CHARS[model]} characters at a time.` }
    const r = await sarvamJson<{ translated_text?: string; source_language_code?: string }>("/translate", {
        input: text,
        source_language_code: input.source ?? "auto",
        target_language_code: input.target,
        model,
        // sarvam-translate:v1 is formal only.
        ...(model === "mayura:v1" && input.mode ? { mode: input.mode } : {}),
    }, "translate", "Could not translate that.")
    if (!r.success) return r
    return { success: true, text: r.data.translated_text ?? "", sourceLanguage: r.data.source_language_code ?? input.source ?? "auto" }
}

/** The language and script of a piece of text, e.g. { language: "hi-IN", script: "Deva" }. */
export async function identifyLanguage(text: string): Promise<SarvamResult<{ language: string | null; script: string | null }>> {
    const input = text.trim().slice(0, 1000)
    if (!input) return { success: true, language: null, script: null }
    const r = await sarvamJson<{ language_code?: string | null; script_code?: string | null }>("/text-lid", { input }, "text-lid", "Could not tell the language.")
    if (!r.success) return r
    return { success: true, language: r.data.language_code ?? null, script: r.data.script_code ?? null }
}
