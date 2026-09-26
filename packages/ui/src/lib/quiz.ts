/**
 * The shared quiz model (plan/incidents INC-19): question kinds, responses and grading.
 * Pure, with no React, so a server action grades a response with exactly the rules the
 * runner shows. Used by Incidents first, and meant for any quiz in the apps.
 *
 * Four kinds:
 * - single     pick one option
 * - truefalse  a statement, true or false
 * - buckets    sort each item into the bucket it belongs to
 * - order      put the items in the right order
 */

export type QuizQuestion =
    | { id: string; kind: "single"; prompt: string; options: { id: string; label: string }[]; answer: string; explanation: string }
    | { id: string; kind: "truefalse"; prompt: string; answer: boolean; explanation: string }
    | { id: string; kind: "buckets"; prompt: string; buckets: { id: string; label: string }[]; items: { id: string; label: string; bucket: string }[]; explanation: string }
    | { id: string; kind: "order"; prompt: string; items: { id: string; label: string }[]; explanation: string }

/** What a reader answered: an option id, a boolean, item to bucket, or item ids in order. */
export type QuizResponse = string | boolean | Record<string, string> | string[]

export type QuizResult = { questionId: string; response: QuizResponse; correct: boolean }

/** Whether a response is complete enough to move on. */
export function isAnswered(q: QuizQuestion, r: QuizResponse | undefined): boolean {
    if (r === undefined) return false
    switch (q.kind) {
        case "single": return typeof r === "string" && q.options.some((o) => o.id === r)
        case "truefalse": return typeof r === "boolean"
        case "buckets": return typeof r === "object" && !Array.isArray(r) && q.items.every((i) => typeof (r as Record<string, string>)[i.id] === "string")
        case "order": return Array.isArray(r) && r.length === q.items.length
    }
}

/** All or nothing: every bucket right, every position right. */
export function grade(q: QuizQuestion, r: QuizResponse | undefined): boolean {
    if (!isAnswered(q, r)) return false
    switch (q.kind) {
        case "single": return r === q.answer
        case "truefalse": return r === q.answer
        case "buckets": return q.items.every((i) => (r as Record<string, string>)[i.id] === i.bucket)
        case "order": return (r as string[]).every((id, i) => q.items[i]?.id === id)
    }
}

/** A stable shuffle, so an order question starts scrambled the same way on server and client. */
export function scrambled<T extends { id: string }>(items: T[], seed: string): T[] {
    let h = 2166136261
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
        h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
        const j = h % (i + 1)
        ;[out[i], out[j]] = [out[j]!, out[i]!]
    }
    // Never start already solved.
    if (out.length > 1 && out.every((x, i) => x.id === items[i]!.id)) out.push(out.shift()!)
    return out
}
