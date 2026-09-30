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
    tone?: "default" | "strong" | "bad" | "good" | "muted"
    /** A decision: drawn as a diamond-ish pill. */
    decision?: boolean
    /** Builds with the narration (INC-51): shown from the paragraph whose focus reaches this order. */
    order?: number
}
export type FlowEdge = { from: string; to: string; label?: string; dashed?: boolean; bad?: boolean; flowing?: boolean }
export type Flow = { width: number; height: number; nodes: FlowNode[]; edges: FlowEdge[]; caption?: string }

/** One arrow in a sequence (INC-64). `only` shows it on one path of the Normal / Failing switch. */
export type SequenceMessage = {
    id: string
    from: string
    to: string
    label: string
    /** When it happens, in ms from the start; shown in the time gutter. */
    at?: number
    kind?: "request" | "response" | "async" | "failed"
    only?: "normal" | "failing"
}

/**
 * Who talked to whom, in what order and when (plan/incidents INC-64): actors as columns,
 * messages as arrows down the page. A `cut` is a line where something stops ("30 s: the
 * tab refreshes"). With `variants`, a switch shows the normal path or the failing one.
 */
export type Sequence = {
    actors: { id: string; label: string; sub?: string }[]
    messages: SequenceMessage[]
    cuts?: { at: number; label: string; only?: "normal" | "failing" }[]
    variants?: { normal: string; failing: string }
    /** The switch's two labels, when not "Normal" and "Failing" (the fix: "Nobody refreshes", "Refresh at 30 s"). */
    tabs?: { normal: string; failing: string }
    caption?: string
}

/** One moment in the incident (INC-65). `at` is ms from the incident's start (T+0). */
export type TimelineEvent = {
    id: string
    at: number
    label: string
    detail?: string
    kind: "change" | "signal" | "action" | "comms" | "mistake" | "resolution"
}

/**
 * The incident's own clock (plan/incidents INC-65): what happened when, and the spans that
 * matter on call (time to detect, to mitigate, to resolve), each from one event to another.
 */
export type IncidentTimeline = {
    events: TimelineEvent[]
    spans?: { id: string; label: string; from: string; to: string }[]
    /** What T+0 was, in words: "Thursday, 3:45 pm, on the client call". */
    start?: string
    caption?: string
}

/**
 * What on-call saw (plan/incidents INC-66): small charts on one time axis, illustrative
 * numbers shaped from the case's sources. Points are [ms from T+0, value].
 */
export type Dashboard = {
    series: { id: string; name: string; unit: string; points: [number, number][]; bad?: boolean }[]
    markers?: { id: string; at: number; label: string }[]
    caption?: string
}

/** One link in a causal chain (INC-67). */
export type Cause = { id: string; label: string; detail?: string; sources?: SourceRef[] }

/**
 * Why it happened (plan/incidents INC-67): from the symptom back to the trigger, the
 * contributing factors and the latent weaknesses that had been there all along.
 */
export type CausalChain = { symptom: Cause; trigger: Cause; contributing: Cause[]; latent: Cause[]; caption?: string }

/** A record's states and how it moves between them (INC-67); `stuck` is where it got trapped. */
export type StateDiagram = {
    /** `col`/`row` pin a state where the automatic layout can't read the story (a cycle). */
    states: { id: string; label: string; sub?: string; col?: number; row?: number }[]
    transitions: { from: string; to: string; label?: string; bad?: boolean }[]
    stuck?: string
    caption?: string
}

/** How a team should run this incident (INC-72): the severity, and who does what. */
export type IncidentRoles = {
    severity: { level: string; why: string }
    roles: { role: string; does: string }[]
    sources: SourceRef[]
}

/** Status-page updates, as a team would post them (INC-72). `at` is ms from T+0. */
export type StatusUpdates = {
    updates: { at: number; state: "Investigating" | "Identified" | "Monitoring" | "Resolved"; text: string }[]
    caption?: string
}

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

// ── The system map (INC-63) ─────────────────────────────────────────────────

/** What a part of the system is; decides its icon. */
export type SystemKind = "client" | "edge" | "compute" | "store" | "cache" | "queue" | "external" | "ai"

export type SystemNode = {
    id: string
    label: string
    /** One short second line: "Cloudflare Worker", "Postgres". */
    sub?: string
    kind: SystemKind
    /** The group box it sits in ("Cloudflare", "The provider"). */
    group?: string
    /** Pin to a column or row of the layout; `x`/`y` place it by hand. */
    col?: number
    row?: number
    x?: number
    y?: number
}
export type SystemLink = { from: string; to: string; label?: string; async?: boolean }

/**
 * The case's system as one picture (plan/incidents INC-63): its parts and how they
 * connect, the part that broke and what it took down with it. Pinned above every
 * chapter; a `say` block's focus `map:<id>` lights a part.
 */
export type SystemMap = {
    nodes: SystemNode[]
    links: SystemLink[]
    groups?: { id: string; label: string }[]
    incident?: {
        /** The parts that failed. */
        broken: string[]
        /** The parts that lost something because of it. */
        blast?: string[]
        /** One line: what happened, on the map. */
        note: string
    }
    /**
     * The fix as a change to the map (INC-68): parts and links added, parts and links
     * removed, parts changed, each with what it costs or why.
     */
    after?: {
        added?: SystemNode[]
        addedLinks?: SystemLink[]
        removed?: string[]
        removedLinks?: { from: string; to: string }[]
        changed?: string[]
        /** Where existing parts sit in the after view, so the new parts get room. */
        move?: Record<string, { col?: number; row?: number }>
        notes?: Record<string, string>
        note: string
    }
    /** Which parts each chapter is about, by chapter id: lit on that chapter's strip. */
    chapters?: Record<string, string[]>
    caption?: string
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
    checklist: ChecklistItem[]
    round: RoundItem[]
    closing: string[]
}
