import type { IncidentCase } from "./types"
import type { QuizQuestion } from "@repo/ui/lib/quiz"
import { INCIDENT_XP } from "./index"

/**
 * A case as the player's steps (plan/incidents INC-14, INC-22). Each chapter becomes a
 * "chapter" step (narrated, with its flowcharts), then its "check" (a quiz on one page)
 * and, where it has one, a short "talk". The case ends with the final quiz (every
 * prediction), spot the failure, the closing talk and what to remember.
 *
 * Every step is plain JSON, because `pnpm script incidents-seed` writes it to
 * `incident_step`. Behaviour that is code (the simulator, the flowchart renderer) lives in
 * the app. `key` is stable: a reader's answers and ticks are saved against it.
 */

export type StepKind = "start" | "chapter" | "check" | "talk" | "final-quiz" | "round" | "postmortem" | "closing-talk" | "closing" | "learn"

export type AuthoredStep = {
    key: string
    part: string
    kind: StepKind
    title: string
    content: Record<string, unknown>
    xp: number
}

/** The case's predictions, as the shared quiz's single-choice questions. */
export function finalQuiz(c: IncidentCase): QuizQuestion[] {
    return c.predict.map((q) => ({
        id: q.id,
        kind: "single" as const,
        prompt: `${q.setup} ${q.prompt}`,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
    }))
}

export function stepsFor(c: IncidentCase): AuthoredStep[] {
    const steps: AuthoredStep[] = []
    const chapters = c.chapters ?? []
    // The case's front page (Niraj, 2026-09-28): what it is, what you'll do, and Start.
    steps.push({
        key: "start", part: "Start", kind: "start", title: "Start the case",
        content: {
            act: "Start",
            summary: c.summary,
            minutes: c.minutes,
            chapters: chapters.length,
            checks: chapters.filter((ch) => ch.check?.length).length,
            talks: chapters.filter((ch) => ch.talk).length + (c.mock ? 1 : 0),
        },
        xp: 0,
    })
    chapters.forEach((ch, i) => {
        const part = `${String(i + 1).padStart(2, "0")} · ${ch.title}`
        steps.push({
            key: `ch-${ch.id}`, part, kind: "chapter", title: ch.title,
            content: { ...ch, check: undefined, talk: undefined, glossary: (ch.terms ?? []).map((t) => (c.glossary?.[t] ? { key: t, ...c.glossary[t] } : null)).filter(Boolean) },
            xp: 0,
        })
        if (ch.check?.length) {
            steps.push({ key: `check-${ch.id}`, part, kind: "check", title: "Check yourself", content: { chapter: ch.id, act: ch.act, questions: ch.check }, xp: ch.check.length * INCIDENT_XP.prediction })
        }
        if (ch.talk) {
            steps.push({ key: `talk-${ch.id}`, part, kind: "talk", title: "Talk it through", content: { chapter: ch.id, act: ch.act, ...ch.talk, minutes: 3 }, xp: 0 })
        }
    })
    const end = "Final"
    steps.push({ key: "final-quiz", part: end, kind: "final-quiz", title: "Make the call", content: { questions: finalQuiz(c) }, xp: c.predict.length * INCIDENT_XP.prediction })
    steps.push({ key: "round", part: end, kind: "round", title: "Spot the failure", content: { items: c.round }, xp: INCIDENT_XP.perfectRound })
    // Write the postmortem, then compare it with the real one (INC-72; 30 XP, once: overview).
    if (c.postmortem && c.postmortemPoints) {
        steps.push({ key: "postmortem", part: end, kind: "postmortem", title: "Write the postmortem", content: { real: c.postmortem, points: c.postmortemPoints }, xp: INCIDENT_XP.report })
    }
    if (c.mock) steps.push({ key: "closing-talk", part: end, kind: "closing-talk", title: "You're the incident lead", content: { ...c.mock }, xp: 0 })
    steps.push({ key: "closing", part: end, kind: "closing", title: "What to remember", content: { lines: c.closing, checklist: c.checklist }, xp: INCIDENT_XP.completion })
    // What the case teaches, and its Pathfinder path (moved out of the sidebar, 2026-09-28).
    if (c.learn?.length) steps.push({ key: "learn", part: "Keep learning", kind: "learn", title: "What you'll learn", content: { act: "Keep learning", learn: c.learn }, xp: 0 })
    return steps
}
