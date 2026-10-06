/**
 * The incident diagrams' data (plan/web/story ST-4): moved from apps/main/content/incidents/types.ts
 * so the diagrams in @repo/ui/components/incidents can render on the marketing site as well as in
 * the case player. apps/main re-exports every type here, so case files did not change.
 */

/** A pointer into one of the case's source documents. */
export type SourceRef = { source: string; section: string }

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
