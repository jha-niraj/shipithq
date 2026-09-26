/**
 * The shape of an Incidents case (plan/incidents INC-2). A case is a typed file in
 * this folder; the components in `components/incidents` render any case of this
 * shape, so a new case is content, not code.
 *
 * Every claim carries `sources`: the section of the source document it comes from.
 * Cases are written by hand from real failures (plan/incidents/overview.md).
 */

import type { IncidentMeta } from "./index"
import type { QuizQuestion } from "@repo/ui/lib/quiz"

/** A pointer into one of the case's source documents. */
export type SourceRef = { source: string; section: string }

export type CaseSource = { title: string; author: string; date: string }

// ── 1. The incident ──────────────────────────────────────────────────────────

export type StoryBeat =
    | { kind: "scene"; id: string; at: string; text: string }
    | { kind: "message"; id: string; at: string; from: string; text: string }
    | { kind: "thread"; id: string; at: string; channel: string; messages: { from: string; t: string; text: string }[] }
    | { kind: "log"; id: string; at: string; lines: { t: string; text: string; tone?: "ok" | "bad" | "muted" }[] }
    | { kind: "evidence"; id: string; at: string; title: string; rows: { label: string; value: string }[]; note: string; sources: SourceRef[] }
    | {
        kind: "fork"
        id: string
        at: string
        prompt: string
        options: { id: string; label: string; consequence: string }[]
        /** What actually happened, shown after any choice. */
        after: string
    }

// ── 2. The model ─────────────────────────────────────────────────────────────

export type ModelStep = {
    id: string
    title: string
    body: string
    /** Which part of the case's diagram lights up while this step is on screen. */
    focus: string
    sources: SourceRef[]
}

// ── 3. The simulator ─────────────────────────────────────────────────────────

export type SimValues = Record<string, string>

export type SimControl = {
    id: string
    label: string
    options: {
        value: string
        label: string
        hint?: string
        /** Unavailable while another control has one of these values, e.g. cpu_ms in a namespace. */
        disabledWhen?: SimValues
        disabledReason?: string
    }[]
}

export type LaneState = "wait" | "run" | "idle" | "background" | "done" | "dead" | "never"

export type SimLane = {
    id: string
    label: string
    segments: { from: number; to: number; state: LaneState; label?: string }[]
}

export type SimRun = {
    verdict: "completes" | "killed" | "evicted" | "never-runs"
    /** Seconds on the timeline where the work stops (finished or killed). */
    end: number
    headline: string
    reason: string
    sources: SourceRef[]
    lanes: SimLane[]
    marks: { at: number; label: string; tone?: "bad" | "muted" }[]
    /** A budget meter, when a budget is what ends the run. */
    meter?: { label: string; budget: number; rate: number }
}

export type SimulatorSpec = {
    /** The length of the timeline, in seconds. */
    duration: number
    /** One line describing the job being simulated. */
    job: string
    controls: SimControl[]
    defaults: SimValues
    simulate: (values: SimValues) => SimRun
    /** Shown under the simulator: what is faithful and what is illustrative. */
    fidelity: string
}

// ── 4. Predict ───────────────────────────────────────────────────────────────

export type PredictQuestion = {
    id: string
    /** The situation, in a sentence or two. */
    setup: string
    prompt: string
    /** The simulator settings that play this situation after the reader commits. */
    scenario: SimValues
    options: { id: string; label: string }[]
    answer: string
    explanation: string
    sources: SourceRef[]
}

// ── 5. The fix ───────────────────────────────────────────────────────────────

export type DecisionNode = { id: string; question: string; yes: string; no: string }
export type DecisionLeaf = { id: string; title: string; body: string }

export type CodeTab = { label: string; lang: "ts" | "jsonc" | "sql"; code: string }

export type FixPattern = {
    id: string
    title: string
    when: string
    body: string
    doesNotFix?: string
    code?: CodeTab[]
    sources: SourceRef[]
}

export type Twist = {
    title: string
    body: string[]
    signature: string
    code: CodeTab[]
    sources: SourceRef[]
}

// ── 6. Checklist and the round ──────────────────────────────────────────────

export type ChecklistItem = { id: string; text: string; why: string }

export type RoundItem = {
    id: string
    symptom: string
    options: { id: string; label: string }[]
    answer: string
    explanation: string
    sources: SourceRef[]
}

// ── Chapters (INC-22): explain, check, talk ────────────────────────────────

/** A flowchart as data, so it lives in the database with the rest of the step. */
export type FlowNode = {
    id: string
    label: string
    sub?: string
    /** Top-left corner and size on the chart's own grid. */
    x: number
    y: number
    w?: number
    h?: number
    tone?: "default" | "strong" | "bad" | "muted"
    /** A decision: drawn as a diamond-ish pill. */
    decision?: boolean
}
export type FlowEdge = { from: string; to: string; label?: string; dashed?: boolean; bad?: boolean; flowing?: boolean }
export type Flow = { width: number; height: number; nodes: FlowNode[]; edges: FlowEdge[]; caption?: string }

export type ChapterBlock =
    /** Narrated: spoken by the lead (the orb) and shown. */
    | { kind: "say"; text: string }
    | { kind: "flow"; flow: Flow }
    /** What you would see: a log, a thread, a database row. */
    | { kind: "see"; title: string; lines: { t?: string; who?: string; text: string; tone?: "bad" | "muted" }[] }
    | { kind: "note"; text: string }
    | { kind: "compare"; columns: string[]; rows: { label: string; cells: string[] }[] }
    | { kind: "simulator" }

export type Chapter = {
    id: string
    title: string
    /** One line under the title: what this chapter gives you. */
    lead: string
    blocks: ChapterBlock[]
    /** Glossary keys this chapter introduces. */
    terms?: string[]
    check?: QuizQuestion[]
    /** A short midway talk: free and uncapped (overview, round 4). */
    talk?: { opening: string; probe: string[] }
    sources: SourceRef[]
    /** Outside sources (another platform's docs), shown as links. */
    links?: { label: string; href: string }[]
}

// ── The case ────────────────────────────────────────────────────────────────

export type IncidentCase = IncidentMeta & {
    sources: Record<string, CaseSource>
    story: StoryBeat[]
    model: { diagram: string; intro: string; steps: ModelStep[] }
    simulator: SimulatorSpec
    predict: PredictQuestion[]
    fix: {
        intro: string
        tree: { start: string; nodes: DecisionNode[]; leaves: DecisionLeaf[] }
        patterns: FixPattern[]
        twist: Twist
        afterShip: { title: string; body: string; sources: SourceRef[] }[]
    }
    /** The case as chapters (INC-22). The player shows these; the fields above feed the simulator, the final quiz, the round and ShipItHQ AI. */
    chapters?: Chapter[]
    glossary?: Record<string, { term: string; definition: string }>
    /** The talk-it-through step: who the reader talks to, how it opens, what it probes. */
    mock?: { role: string; opening: string; probe: string[]; minutes: number }
    /** The postmortem as the team would write it, shown after the fix. */
    postmortem?: { summary: string; sections: { title: string; items: string[] }[]; sources: SourceRef[] }
    checklist: ChecklistItem[]
    round: RoundItem[]
    closing: string[]
}
