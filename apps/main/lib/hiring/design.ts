import "server-only"
import { modelFor } from "@repo/ai"

/*
 * Scoring a system design round (plan/hiring-rounds HR-16): one inline model
 * call with a 25-second timeout (CLAUDE.md "Long-running work"), against the
 * prompt's own rubric. The diagram is turned into text first: its labelled
 * boxes and the arrows between them. A failure throws; the caller marks the
 * attempt NOT_SCORED and refunds it, never a 0.
 */

const TIMEOUT_MS = 25_000

export interface RubricCriterion { criterion: string; weight: number; lookFor: string }

export interface DesignRubricResult {
    criteria: { criterion: string; weight: number; score: number; evidence: string }[]
    summary: string
}

type El = { id?: string; type?: string; text?: string; containerId?: string | null; isDeleted?: boolean; boundElements?: { id: string; type: string }[] | null; startBinding?: { elementId?: string } | null; endBinding?: { elementId?: string } | null }

/** The diagram as text: each labelled box once, then "A -> B" for each arrow between labelled boxes. */
export function describeDiagram(elements: unknown): string {
    const els = (Array.isArray(elements) ? elements : []) as El[]
    const live = els.filter((e) => e && !e.isDeleted)
    const byId = new Map(live.filter((e) => e.id).map((e) => [e.id!, e]))
    // A shape's label is the text element bound to it; free text is a note.
    const labelOf = (id: string | undefined): string | null => {
        if (!id) return null
        const shape = byId.get(id)
        if (!shape) return null
        if (shape.type === "text") return shape.text?.trim() || null
        const bound = (shape.boundElements ?? []).find((b) => b.type === "text")
        const t = bound ? byId.get(bound.id)?.text : null
        return t?.trim() || null
    }
    const boxes = live.filter((e) => e.type && ["rectangle", "ellipse", "diamond"].includes(e.type)).map((e) => labelOf(e.id)).filter((x): x is string => Boolean(x))
    const notes = live.filter((e) => e.type === "text" && !e.containerId).map((e) => e.text?.trim()).filter((x): x is string => Boolean(x))
    const arrows = live.filter((e) => e.type === "arrow" || e.type === "line").map((e) => {
        const a = labelOf(e.startBinding?.elementId ?? undefined)
        const b = labelOf(e.endBinding?.elementId ?? undefined)
        return a && b ? `${a} -> ${b}` : null
    }).filter((x): x is string => Boolean(x))
    if (!boxes.length && !notes.length) return "(no diagram)"
    return [
        boxes.length ? `Components: ${[...new Set(boxes)].join("; ")}` : "",
        arrows.length ? `Connections: ${[...new Set(arrows)].join("; ")}` : "",
        notes.length ? `Notes on the canvas: ${notes.join(" | ").slice(0, 1500)}` : "",
    ].filter(Boolean).join("\n")
}

const SYSTEM = `You assess a candidate's system design answer for a hiring platform. You are given the brief, a rubric of criteria with weights and "what a strong answer shows", the candidate's written answer, and their diagram described as text.

For EACH criterion, give a score from 0 to 10 and one sentence of evidence quoting or pointing to what the candidate wrote or drew. Judge only what is in the answer and the diagram; never assume something they didn't say. An empty or off-topic answer scores 0 on every criterion.
0-2: missing or wrong. 3-4: mentioned without substance. 5-6: reasonable but shallow. 7-8: solid, with the right trade-offs. 9-10: excellent, specific and justified.

Then "summary": two sentences addressed to the candidate as "you": the strongest part, and the one thing that would most improve the answer.

Reply with one JSON object: { "criteria": [{ "criterion": string, "score": number, "evidence": string }], "summary": string }, with the criteria in the order given.`

export async function scoreDesign(input: { brief: string; rubric: RubricCriterion[]; answer: string; diagram: unknown }): Promise<{ score: number; result: DesignRubricResult }> {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error("AI scoring is not configured")
    const answer = input.answer.trim().slice(0, 12_000)
    const diagram = describeDiagram(input.diagram)
    const rubric = input.rubric.map((c, i) => `${i + 1}. ${c.criterion} (weight ${c.weight}): ${c.lookFor}`).join("\n")
    // An empty answer and diagram is a 0 by rule; no model call needed.
    if (!answer && diagram === "(no diagram)") {
        return { score: 0, result: { criteria: input.rubric.map((c) => ({ criterion: c.criterion, weight: c.weight, score: 0, evidence: "" })), summary: "Nothing was written or drawn." } }
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
            model: modelFor("hiringDesignScore"),
            temperature: 0.1,
            max_tokens: 1200,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content: `BRIEF:\n${input.brief}\n\nRUBRIC:\n${rubric}\n\nWRITTEN ANSWER:\n${answer || "(empty)"}\n\nDIAGRAM:\n${diagram}` },
            ],
        }),
    })
    if (!res.ok) throw new Error(`AI scoring is unavailable (${res.status})`)
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    let parsed: { criteria?: unknown; summary?: unknown }
    try {
        parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "") as typeof parsed
    } catch {
        throw new Error("AI scoring returned something unreadable")
    }
    const given = Array.isArray(parsed.criteria) ? (parsed.criteria as { score?: unknown; evidence?: unknown }[]) : []
    // Scored in the rubric's order; a missing or odd score counts as 0, never invented.
    const criteria = input.rubric.map((c, i) => {
        const g = given[i] ?? {}
        const raw = Number(g.score)
        const score = Number.isFinite(raw) ? Math.min(10, Math.max(0, Math.round(raw))) : 0
        return { criterion: c.criterion, weight: c.weight, score, evidence: typeof g.evidence === "string" ? g.evidence.slice(0, 400) : "" }
    })
    const totalWeight = criteria.reduce((n, c) => n + c.weight, 0) || 100
    const score = Math.round(criteria.reduce((n, c) => n + (c.weight * c.score) / 10, 0) * (100 / totalWeight))
    const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 600) : ""
    return { score, result: { criteria, summary } }
}
