import { ArrowDown, ArrowRight, Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import type {
    AnnotatedData, BarsData, BeforeAfterData, ChecklistData, DecisionData, DialogueData, FlowData, FunnelData,
    LadderData, LayersData, MatrixData, PatternMapData, SumData, TableData, TimelineData,
} from "./types"

/**
 * One renderer per story form (plan/web/story ST-14). Each form has its own layout, so posts that
 * use different forms do not look alike: a chain of steps, a narrowing funnel, a rail of dates, a
 * 2x2, a staircase, stacked slabs, a receipt, a conversation. Server components, no hooks; every
 * label comes from the post's story data. Ink is always dark on the light frames (apps/web is light only).
 */

const cap = cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")
// Grouped by thousands as the posts write them ("1,000,000").
const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString("en-US") : String(n))

// ── A chain of steps, left to right, the lit one dark ───────────────────────
export function Flow({ d }: { d: FlowData }) {
    const label = (from: string, to: string) => d.edges.find((e) => e.from === from && e.to === to)?.label
    return (
        <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch">
            {d.nodes.map((n, i) => {
                const lit = n.id === d.lit
                const next = d.nodes[i + 1]
                const edge = next ? label(n.id, next.id) : undefined
                return (
                    <li key={n.id} className="flex min-w-0 flex-1 flex-col items-stretch gap-2 md:flex-row md:items-center">
                        <div className={cn("min-w-0 flex-1 rounded-xl p-3.5", lit ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-900/10")}>
                            <p className={cn("text-[14px] font-semibold leading-5", lit ? "text-white" : "text-neutral-900")}>{n.label}</p>
                            {n.note && <p className={cn("mt-1 text-[12.5px] leading-5", lit ? "text-neutral-300" : "text-neutral-700")}>{n.note}</p>}
                        </div>
                        {next && (
                            <div className="flex shrink-0 items-center justify-center gap-1.5 text-neutral-600 md:flex-col md:px-0.5">
                                <ArrowDown className="size-4 md:hidden" aria-hidden />
                                <ArrowRight className="hidden size-4 md:block" aria-hidden />
                                {edge && <span className={cn(MONO, "max-w-[7rem] text-center text-[10.5px] leading-4")}>{edge}</span>}
                            </div>
                        )}
                    </li>
                )
            })}
        </ol>
    )
}

// ── Horizontal bars to one scale (log when the values span 100x or more) ────
export function Bars({ d }: { d: BarsData }) {
    const vals = d.bars.map((b) => b.value)
    const max = Math.max(...vals)
    const min = Math.max(Math.min(...vals.filter((v) => v > 0)), 1e-9)
    const log = max / min >= 100
    const w = (v: number) => (v <= 0 ? 0 : log ? (Math.log10(v / min) + 0.35) / (Math.log10(max / min) + 0.35) : v / max)
    return (
        <div>
            <ul className="space-y-3">
                {d.bars.map((b) => {
                    const lit = b.label === d.lit
                    return (
                        <li key={b.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
                            <span className="min-w-0 text-[13.5px] font-medium leading-5 text-neutral-900">{b.label}{b.note && <span className="block text-[11.5px] font-normal text-neutral-600">{b.note}</span>}</span>
                            <span className="flex min-w-0 items-center gap-2">
                                <span className={cn("block h-5 rounded-r-md", lit ? "bg-neutral-900" : "bg-neutral-900/25")} style={{ width: `${Math.max(w(b.value) * 100, 1.5)}%` }} />
                                <span className={cn(MONO, "shrink-0 text-[12px] tabular-nums text-neutral-900")}>{fmt(b.value)}</span>
                            </span>
                        </li>
                    )
                })}
            </ul>
            <p className={cn(cap, "mt-3")}>{d.unit}{log ? " · log scale" : ""}</p>
        </div>
    )
}

// ── A question that branches ─────────────────────────────────────────────────
export function DecisionPath({ d }: { d: DecisionData }) {
    return (
        <div>
            <p className="mx-auto max-w-xl rounded-2xl bg-neutral-900 px-4 py-3 text-center text-[15px] font-semibold leading-6 text-white">{d.question}</p>
            <div aria-hidden className="mx-auto h-4 w-px bg-neutral-900/40" />
            <ul className="grid gap-3 border-t border-neutral-900/30 pt-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 13rem), 1fr))` }}>
                {d.branches.map((b) => (
                    <li key={b.answer} className="flex flex-col rounded-xl bg-white p-4 ring-1 ring-neutral-900/10">
                        <span className={cn(MONO, "self-start rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] text-neutral-900")}>{b.answer}</span>
                        <p className="mt-2 text-[13.5px] leading-5 text-neutral-700">{b.then}</p>
                        <p className="mt-auto flex items-start gap-1.5 pt-3 text-[13.5px] font-semibold leading-5 text-neutral-900"><ArrowRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />{b.verdict}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ── An example with notes in the margin ─────────────────────────────────────
export function Annotated({ d }: { d: AnnotatedData }) {
    const noteFor = (i: number) => d.notes.findIndex((n) => n.line === i)
    return (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-neutral-900/10">
            {d.heading && <p className={cn(cap, "border-b border-neutral-200 px-4 py-2.5")}>{d.heading}</p>}
            <ol className="divide-y divide-neutral-100">
                {d.lines.map((l, i) => {
                    const k = noteFor(i)
                    return (
                        <li key={i} className={cn("grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1 px-4 py-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]", k >= 0 && "bg-neutral-50")}>
                            <span className={cn("min-w-0 text-[13.5px] leading-6 text-neutral-900", d.kind === "code" && cn(MONO, "whitespace-pre-wrap text-[12.5px]"))}>
                                {k >= 0 && <span className={cn(MONO, "mr-2 inline-flex size-5 items-center justify-center rounded-full bg-neutral-900 align-middle text-[10.5px] text-white")}>{k + 1}</span>}
                                {l}
                            </span>
                            {k >= 0 && <span className="text-[12.5px] leading-5 text-neutral-700 md:border-l md:border-neutral-300 md:pl-3">{d.notes[k]!.note}</span>}
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}

// ── A funnel that narrows ────────────────────────────────────────────────────
export function Funnel({ d }: { d: FunnelData }) {
    const n = d.stages.length
    return (
        <ol className="flex flex-col items-center gap-1.5">
            {d.stages.map((s, i) => {
                const lit = s.label === d.lit
                return (
                    <li key={s.label} className={cn("flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg px-4 py-2.5", lit ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 ring-1 ring-neutral-900/10")} style={{ width: `${100 - (i * 44) / Math.max(n - 1, 1)}%` }}>
                        <span className="min-w-0 text-[13.5px] font-semibold">{s.label}</span>
                        {s.count !== undefined && <span className={cn(MONO, "text-[12.5px] tabular-nums")}>{fmt(s.count)}</span>}
                        {s.note && <span className={cn("basis-full text-[12px] leading-5", lit ? "text-neutral-300" : "text-neutral-700")}>{s.note}</span>}
                    </li>
                )
            })}
        </ol>
    )
}

// ── A rail of moments ────────────────────────────────────────────────────────
export function Timeline({ d }: { d: TimelineData }) {
    return (
        <div>
            <ol className="relative grid gap-4 md:gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))` }}>
                {d.events.map((e) => {
                    const lit = e.at === d.lit
                    return (
                        <li key={e.at + e.label} className="relative border-l-2 border-neutral-900/20 pl-4 md:border-l-0 md:border-t-2 md:pl-0 md:pt-4">
                            <span aria-hidden className={cn("absolute -left-[7px] top-1 size-3 rounded-full md:-top-[7px] md:left-0", lit ? "bg-neutral-900" : "bg-white ring-2 ring-neutral-900/40")} />
                            <p className={cn(MONO, "text-[11.5px] uppercase tracking-[0.1em]", lit ? "font-semibold text-neutral-900" : "text-neutral-600")}>{e.at}</p>
                            <p className="mt-1 text-[14px] font-semibold leading-5 text-neutral-900">{e.label}</p>
                            {e.note && <p className="mt-1 text-[12.5px] leading-5 text-neutral-700">{e.note}</p>}
                        </li>
                    )
                })}
            </ol>
            <p className={cn(cap, "mt-4")}>{d.unit}</p>
        </div>
    )
}

// ── A 2x2 with its axes ──────────────────────────────────────────────────────
export function Matrix({ d }: { d: MatrixData }) {
    const cell = (x: "low" | "high", y: "low" | "high") => d.cells.find((c) => c.x === x && c.y === y)
    const box = (x: "low" | "high", y: "low" | "high") => {
        const c = cell(x, y)
        const lit = c && c.label === d.lit
        return (
            <div className={cn("min-h-[6.5rem] rounded-xl p-3.5", lit ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-900/10")}>
                {c && <><p className={cn("text-[14px] font-semibold leading-5", lit ? "text-white" : "text-neutral-900")}>{c.label}</p>{c.note && <p className={cn("mt-1 text-[12.5px] leading-5", lit ? "text-neutral-300" : "text-neutral-700")}>{c.note}</p>}</>}
            </div>
        )
    }
    const order: ["low" | "high", "low" | "high"][] = [["low", "high"], ["high", "high"], ["low", "low"], ["high", "low"]]
    return (
        <>
        {/* Phones: no room for side axes, so each cell names its own two values. */}
        <ul className="space-y-2 md:hidden">
            {order.map(([x, y]) => {
                const c = cell(x, y)
                if (!c) return null
                const lit = c.label === d.lit
                return (
                    <li key={c.label} className={cn("rounded-xl p-3.5", lit ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-900/10")}>
                        <p className="flex flex-wrap gap-1.5">
                            {[`${d.x.name}: ${d.x[x]}`, `${d.y.name}: ${d.y[y]}`].map((t) => (
                                <span key={t} className={cn(MONO, "rounded px-1.5 py-0.5 text-[10.5px]", lit ? "bg-white/15 text-neutral-200" : "bg-neutral-100 text-neutral-700")}>{t}</span>
                            ))}
                        </p>
                        <p className={cn("mt-2 text-[14px] font-semibold leading-5", lit ? "text-white" : "text-neutral-900")}>{c.label}</p>
                        {c.note && <p className={cn("mt-1 text-[12.5px] leading-5", lit ? "text-neutral-300" : "text-neutral-700")}>{c.note}</p>}
                    </li>
                )
            })}
        </ul>
        <div className="hidden grid-cols-[auto_minmax(0,1fr)] gap-2 md:grid">
            <div className="flex max-w-[10rem] flex-col justify-between py-2 text-right">
                <span className={cap}>{d.y.high}</span>
                <span className={cn(cap, "[writing-mode:vertical-rl] rotate-180 self-end")}>{d.y.name}</span>
                <span className={cap}>{d.y.low}</span>
            </div>
            <div>
                <div className="grid grid-cols-2 gap-2">{box("low", "high")}{box("high", "high")}{box("low", "low")}{box("high", "low")}</div>
                <div className="mt-2 flex items-center justify-between gap-2"><span className={cap}>{d.x.low}</span><span className={cn(cap, "text-neutral-900")}>{d.x.name}</span><span className={cap}>{d.x.high}</span></div>
            </div>
        </div>
        </>
    )
}

// ── A receipt: lines, a rule, the total ──────────────────────────────────────
export function Receipt({ d }: { d: SumData }) {
    const total = d.lines.reduce((n, l) => n + l.amount, 0)
    return (
        <div className="mx-auto max-w-md rounded-sm bg-white px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.25)] [background-image:radial-gradient(circle_at_8px_-2px,transparent_5px,white_5.5px)]">
            <ul className={cn(MONO, "space-y-2 text-[13px] text-neutral-900")}>
                {d.lines.map((l) => (
                    <li key={l.what} className="flex items-baseline gap-2">
                        <span className="min-w-0">{l.what}{l.note && <span className="block text-[11.5px] text-neutral-600">{l.note}</span>}</span>
                        <span aria-hidden className="mb-1 min-w-4 flex-1 border-b border-dotted border-neutral-400" />
                        <span className="shrink-0 tabular-nums">{fmt(l.amount)}</span>
                    </li>
                ))}
            </ul>
            <p className={cn(MONO, "mt-3 flex items-baseline justify-between border-t-2 border-double border-neutral-900 pt-2 text-[14px] font-semibold text-neutral-900")}>
                <span>Total</span><span className="tabular-nums">{fmt(total)} {d.unit}</span>
            </p>
            {d.budget !== undefined && <p className={cn(MONO, "mt-1 text-right text-[11.5px] text-neutral-600")}>{d.budget === total ? `Exactly the ${fmt(d.budget)}` : d.budget > total ? `${fmt(d.budget - total)} of ${fmt(d.budget)} left` : `${fmt(total - d.budget)} over ${fmt(d.budget)}`}</p>}
        </div>
    )
}

// ── Two states and what changed between them ────────────────────────────────
export function BeforeAfter({ d }: { d: BeforeAfterData }) {
    return (
        <div>
            <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="rounded-xl border border-dashed border-neutral-400 bg-white/60 p-4">
                    <p className={cap}>{d.before.label}</p>
                    <ul className="mt-2 space-y-1.5 text-[13.5px] leading-6 text-neutral-700">{d.before.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
                <div className="flex items-center justify-center text-neutral-900"><ArrowDown className="size-5 md:hidden" aria-hidden /><ArrowRight className="hidden size-5 md:block" aria-hidden /></div>
                <div className="rounded-xl bg-neutral-900 p-4 text-white">
                    <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-300")}>{d.after.label}</p>
                    <ul className="mt-2 space-y-1.5 text-[13.5px] leading-6 text-neutral-100">{d.after.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
            </div>
            {d.change.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">{d.change.map((c) => <li key={c} className="rounded-md bg-white px-2 py-1 text-[12.5px] text-neutral-900 ring-1 ring-neutral-900/10">{c}</li>)}</ul>
            )}
        </div>
    )
}

// ── A checklist, with what each skipped item costs ──────────────────────────
export function Checklist({ d }: { d: ChecklistData }) {
    return (
        <ul className="divide-y divide-neutral-900/10 overflow-hidden rounded-xl bg-white ring-1 ring-neutral-900/10">
            {d.items.map((it) => (
                <li key={it.item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
                    <span className="mt-0.5 flex size-5 items-center justify-center rounded border-2 border-neutral-900"><Check className="size-3.5" aria-hidden /></span>
                    <span className="text-[14px] font-medium leading-6 text-neutral-900">{it.item}</span>
                    <span className="col-start-2 text-[12.5px] leading-5 text-neutral-700 md:col-start-3"><span className={cn(MONO, "mr-1.5 text-[10.5px] uppercase tracking-[0.12em] text-neutral-900")}>If skipped</span>{it.ifSkipped}</span>
                </li>
            ))}
        </ul>
    )
}

// ── A conversation, with what each turn shows ───────────────────────────────
export function Dialogue({ d }: { d: DialogueData }) {
    return (
        <ol className="space-y-3">
            {d.turns.map((t, i) => {
                const them = t.who === "interviewer"
                return (
                    <li key={i} className={cn("flex flex-col", them ? "items-start" : "items-end")}>
                        <span className={cn(MONO, "mb-1 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>{them ? "Interviewer" : "Candidate"}</span>
                        <p className={cn("max-w-[34rem] px-4 py-2.5 text-[14px] leading-6", them ? "rounded-2xl rounded-tl-sm bg-white text-neutral-900 ring-1 ring-neutral-900/10" : "rounded-2xl rounded-tr-sm bg-neutral-900 text-white")}>{t.text}</p>
                        {t.note && <p className={cn("mt-1 max-w-[30rem] text-[12px] italic leading-5 text-neutral-700", them ? "text-left" : "text-right")}>{t.note}</p>}
                    </li>
                )
            })}
        </ol>
    )
}

// ── Signals in the problem, and the pattern each points to ──────────────────
export function PatternMap({ d }: { d: PatternMapData }) {
    return (
        <ul className="space-y-2">
            {d.pairs.map((p) => (
                <li key={p.signal} className="grid grid-cols-[minmax(0,1fr)] items-center gap-2 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)]">
                    <span className="rounded-lg bg-white px-3.5 py-2 text-[13.5px] leading-5 text-neutral-900 ring-1 ring-neutral-900/10">&ldquo;{p.signal}&rdquo;</span>
                    <ArrowRight className="hidden size-4 text-neutral-600 md:block" aria-hidden />
                    <span className="rounded-lg bg-neutral-900 px-3.5 py-2 text-white">
                        <span className="text-[13.5px] font-semibold">{p.pattern}</span>
                        {p.example && <span className={cn(MONO, "block text-[11px] text-neutral-300")}>{p.example}</span>}
                    </span>
                </li>
            ))}
        </ul>
    )
}

// ── A small table, one cell lit ──────────────────────────────────────────────
export function Table({ d }: { d: TableData }) {
    return (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-neutral-900/10">
            <table className="w-full min-w-[28rem] text-left text-[13px]">
                <caption className={cn(cap, "px-4 pt-3 text-left")}>{d.caption}</caption>
                <thead><tr className="border-b border-neutral-200">{d.columns.map((c) => <th key={c} scope="col" className="px-4 py-2.5 font-semibold text-neutral-900">{c}</th>)}</tr></thead>
                <tbody className="divide-y divide-neutral-100">
                    {d.rows.map((r, i) => (
                        <tr key={i}>{r.map((v, j) => {
                            const lit = d.lit?.row === i && d.lit?.col === j
                            const Tag = j === 0 ? "th" : "td"
                            return <Tag key={j} {...(j === 0 ? { scope: "row" } : {})} className={cn("px-4 py-2.5 align-top", j === 0 ? "font-medium text-neutral-900" : "text-neutral-700", lit && "bg-neutral-900 font-semibold text-white")}>{v}</Tag>
                        })}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── A staircase, the first rung at the bottom ───────────────────────────────
export function Ladder({ d }: { d: LadderData }) {
    const n = d.rungs.length
    return (
        <ol className="flex flex-col-reverse gap-2">
            {d.rungs.map((r, i) => (
                <li key={r.level} className="flex">
                    <span aria-hidden className="hidden shrink-0 md:block" style={{ width: `${(i / Math.max(n - 1, 1)) * 28}%` }} />
                    <div className={cn("min-w-0 flex-1 rounded-xl p-3.5", i === n - 1 ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-900/10")}>
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className={cn("text-[14px] font-semibold", i === n - 1 ? "text-white" : "text-neutral-900")}>{r.level}</span>
                            {r.signal && <span className={cn(MONO, "text-[11px]", i === n - 1 ? "text-neutral-300" : "text-neutral-600")}>{r.signal}</span>}
                        </p>
                        <p className={cn("mt-1 text-[12.5px] leading-5", i === n - 1 ? "text-neutral-300" : "text-neutral-700")}>{r.does}</p>
                    </div>
                </li>
            ))}
        </ol>
    )
}

// ── Stacked layers, the foundation at the bottom ────────────────────────────
export function Layers({ d }: { d: LayersData }) {
    const n = d.layers.length
    return (
        <ol className="flex flex-col-reverse gap-1.5">
            {d.layers.map((l, i) => (
                // Light slabs deepening upward with dark ink (contrast holds on every one); the top layer
                // is the dark one, where the stack is heading.
                <li key={l.name} className={cn("rounded-lg px-4 py-3", i === n - 1 && "bg-neutral-900")} style={i === n - 1 ? undefined : { background: `color-mix(in oklab, #171717 ${5 + (i / Math.max(n - 1, 1)) * 18}%, white)` }}>
                    <p className={cn("text-[13.5px] font-semibold", i === n - 1 ? "text-white" : "text-neutral-900")}>{l.name}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {l.items.map((it) => <li key={it} className={cn("rounded-md px-2 py-0.5 text-[12px]", i === n - 1 ? "bg-white/15 text-white" : "bg-white text-neutral-900")}>{it}</li>)}
                    </ul>
                </li>
            ))}
        </ol>
    )
}
