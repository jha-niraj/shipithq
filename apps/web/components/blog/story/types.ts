/**
 * A blog post's story (plan/web/story ST-14): one small drawing at the top of the post, made only
 * from that post's own facts. `sources` are sentences copied verbatim from the post's markdown and
 * are checked against it by scripts/check-post-stories.mjs; they are kept as the proof, not shown.
 */

type Base<F extends string, D> = {
    slug: string
    form: F
    title: string
    takeaway: string
    sources: string[]
    note?: string
    data: D
}

export type FlowData = { nodes: { id: string; label: string; note?: string }[]; edges: { from: string; to: string; label?: string }[]; lit?: string }
export type BarsData = { unit: string; bars: { label: string; value: number; note?: string }[]; lit?: string }
export type DecisionData = { question: string; branches: { answer: string; then: string; verdict: string }[] }
export type AnnotatedData = { kind: "text" | "code"; heading?: string; lines: string[]; notes: { line: number; note: string }[] }
export type FunnelData = { stages: { label: string; note?: string; count?: number }[]; lit?: string }
export type TimelineData = { unit: string; events: { at: string; label: string; note?: string }[]; lit?: string }
export type MatrixData = {
    x: { low: string; high: string; name: string }
    y: { low: string; high: string; name: string }
    cells: { x: "low" | "high"; y: "low" | "high"; label: string; note?: string }[]
    lit?: string
}
export type SumData = { unit: string; lines: { what: string; amount: number; note?: string }[]; budget?: number }
export type BeforeAfterData = { before: { label: string; lines: string[] }; after: { label: string; lines: string[] }; change: string[] }
export type ChecklistData = { items: { item: string; ifSkipped: string }[] }
export type DialogueData = { turns: { who: "interviewer" | "candidate"; text: string; note?: string }[] }
export type PatternMapData = { pairs: { signal: string; pattern: string; example?: string }[] }
export type TableData = { caption: string; columns: string[]; rows: string[][]; lit?: { row: number; col: number } }
export type LadderData = { rungs: { level: string; does: string; signal?: string }[] }
export type LayersData = { layers: { name: string; items: string[] }[] }

export type PostStory =
    | Base<"flow", FlowData>
    | Base<"bars", BarsData>
    | Base<"decisionPath", DecisionData>
    | Base<"annotated", AnnotatedData>
    | Base<"funnel", FunnelData>
    | Base<"timeline", TimelineData>
    | Base<"matrix", MatrixData>
    | Base<"sum", SumData>
    | Base<"beforeAfter", BeforeAfterData>
    | Base<"checklist", ChecklistData>
    | Base<"dialogue", DialogueData>
    | Base<"patternMap", PatternMapData>
    | Base<"table", TableData>
    | Base<"ladder", LadderData>
    | Base<"layers", LayersData>
