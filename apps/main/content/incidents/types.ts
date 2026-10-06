import type { TrafficScenario } from "@/components/incidents/sim/schema"
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
// The diagram types live in @repo/ui so the marketing site can draw the same diagrams
// (plan/web/story ST-4). Re-exported here so every case file keeps importing from this file.
import type { SourceRef, FlowNode, FlowEdge, Flow, SequenceMessage, Sequence, TimelineEvent, IncidentTimeline, Dashboard, Cause, CausalChain, StateDiagram, IncidentRoles, StatusUpdates, SystemKind, SystemNode, SystemLink, SystemMap } from "@repo/ui/lib/incidents/types"
export type { SourceRef, FlowNode, FlowEdge, Flow, SequenceMessage, Sequence, TimelineEvent, IncidentTimeline, Dashboard, Cause, CausalChain, StateDiagram, IncidentRoles, StatusUpdates, SystemKind, SystemNode, SystemLink, SystemMap } from "@repo/ui/lib/incidents/types"


/** `url`: where a reader can open it (a post, a page); shown as a link in the sources. */
export type CaseSource = { title: string; author: string; date: string; url?: string }

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
    /** Axis ticks in seconds (default 0, 30, 60, 90 and the end). */
    ticks?: number[]
    /** A line drawn across every lane, its tick in white (default 30 s); null for none. */
    line?: number | null
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

export type ChapterBlock =
    /**
     * Narrated: spoken by the lead and shown. `focus` names what this paragraph is about
     * (INC-49): a block's `id`, or `id:part` for a flow node id, a compare row label or a
     * see line index. While it is read, that part lights and the rest dims.
     */
    | { kind: "say"; text: string; focus?: string }
    | { kind: "flow"; flow: Flow; id?: string }
    /** A request and response cycle over time (INC-64); focus parts are message or actor ids. */
    | { kind: "sequence"; sequence: Sequence; id?: string }
    /** The incident's clock (INC-65); focus parts are event or span ids. Scrubs with a dashboard in the same chapter. */
    | { kind: "timeline"; timeline: IncidentTimeline; id?: string }
    /** The charts on-call saw (INC-66); focus parts are series or marker ids. */
    | { kind: "dashboard"; dashboard: Dashboard; id?: string }
    /** From the symptom back to its causes (INC-67); focus parts are cause ids. */
    | { kind: "causes"; causes: CausalChain; id?: string }
    /** A record's states (INC-67); focus parts are state ids. */
    | { kind: "states"; states: StateDiagram; id?: string }
    /** The fix as a before and after of the case's system map (INC-68); focus parts are node ids. */
    | { kind: "map-change"; id?: string; caption?: string }
    /** The human side (INC-72): severity and roles, status updates, a runbook excerpt. */
    | { kind: "roles"; roles: IncidentRoles; id?: string }
    | { kind: "status"; status: StatusUpdates; id?: string }
    | { kind: "runbook"; title: string; steps: string[]; id?: string }
    /**
     * Read-only reference code (plan/long-jobs-vercel LJV-5), from the `code_sample` tables.
     * Narration lights lines with `focus: "<id>:L12-20"`.
     */
    | { kind: "code"; id?: string; sample: string; stage?: string; file?: string; highlight?: string; compare?: boolean }
    /** What you would see: a log, a thread, a database row. */
    | { kind: "see"; title: string; lines: { t?: string; who?: string; text: string; tone?: "bad" | "muted" }[]; id?: string }
    | { kind: "note"; text: string; id?: string }
    | { kind: "compare"; columns: string[]; rows: { label: string; cells: string[] }[]; id?: string }
    /** `preset`: the choices it opens on, for the chapter's point (INC-58). */
    | { kind: "simulator"; id?: string; preset?: Record<string, string> }

export type Chapter = {
    id: string
    title: string
    /** The sidebar's section: "What happened", "How it was fixed", "Beyond this case". */
    act?: string
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
    /** The system as one picture, pinned above every chapter (INC-63). */
    system?: SystemMap
    story: StoryBeat[]
    model: { diagram: string; intro: string; steps: ModelStep[] }
    /** Case 1's timeline (code), or a traffic scenario (data) on the shared engine (INC-55). */
    simulator: SimulatorSpec | TrafficScenario
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
    /** What a reader can learn from this case; the learning path (Pathfinder) builds on these (INC-32). */
    learn?: { title: string; summary: string }[]
    /** `pathTopic`: the Pathfinder path topic that teaches it properly (INC-50). */
    glossary?: Record<string, { term: string; definition: string; pathTopic?: string }>
    /** The talk-it-through step: who the reader talks to, how it opens, what it probes. */
    mock?: { role: string; opening: string; probe: string[]; minutes: number }
    /** The postmortem as the team would write it, shown after the fix. */
    postmortem?: { summary: string; sections: { title: string; items: string[] }[]; sources: SourceRef[] }
    /**
     * What a good postmortem of this case covers, per section (INC-72): the student ticks
     * the ones theirs covered after comparing it with the real one.
     */
    postmortemPoints?: Record<"impact" | "timeline" | "causes" | "well" | "actions", { id: string; label: string }[]>
    /** Build it yourself (LJV-5): an official project, shown in the "Keep learning" step. */
    build?: { project: string; title: string; summary: string }
    checklist: ChecklistItem[]
    round: RoundItem[]
    closing: string[]
}
