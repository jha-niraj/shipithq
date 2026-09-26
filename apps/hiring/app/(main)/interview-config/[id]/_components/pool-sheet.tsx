"use client"

import { useEffect, useMemo, useState } from "react"
import { CircleAlert, PenLine, Plus, Search, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { cn } from "@repo/ui/lib/utils"
import { createCompanyDesignPrompt } from "@/actions/interview-config/pipeline-builder.action"
import { PIPELINE_LIMITS, type CatalogItem, type PoolLevel, type RubricCriterion } from "@/types/pipeline"
import { AptitudeAiPanel } from "./aptitude-ai-panel"

/*
 * Choosing a round's questions (plan/hiring-rounds HR-11, a side sheet decided
 * by Niraj 2026-09-25). Search and filter ShipItHQ's catalogue and the
 * company's own items, tick what the round may draw, and return to the
 * builder; the pipeline's Save writes it. A company's AI questions that are
 * still drafts show here but can't be picked until approved.
 */

type PooledType = "APTITUDE" | "DSA" | "SYSTEM_DESIGN"

const NOUN: Record<PooledType, [string, string]> = {
    APTITUDE: ["question", "questions"],
    DSA: ["problem", "problems"],
    SYSTEM_DESIGN: ["prompt", "prompts"],
}
const SECTION_LABEL: Record<string, string> = { QUANT: "Quant", LOGICAL: "Logical", VERBAL: "Verbal" }

export function PoolSheet({ open, onOpenChange, roundType, roundTitle, catalog, loading, selected, drawCount, editable, onChange, onCatalogAdd, onCatalogRefresh }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    roundType: PooledType
    roundTitle: string
    catalog: CatalogItem[] | null
    loading: boolean
    selected: string[]
    drawCount: number
    /** Members without "manage pipelines" see the pool read-only. */
    editable: boolean
    onChange: (ids: string[]) => void
    /** A company-written prompt was saved: add it to the catalogue. */
    onCatalogAdd: (item: CatalogItem) => void
    /** Reload this type's catalogue (after AI questions are approved or rejected). */
    onCatalogRefresh: () => Promise<void>
}) {
    const [query, setQuery] = useState("")
    const [levels, setLevels] = useState<PoolLevel[]>([])
    const [section, setSection] = useState<string | null>(null)
    const [tag, setTag] = useState<string | null>(null)
    const [ownOnly, setOwnOnly] = useState(false)
    const [writing, setWriting] = useState(false)
    const [generating, setGenerating] = useState(false)
    const chosen = useMemo(() => new Set(selected), [selected])
    const [one, many] = NOUN[roundType]

    useEffect(() => {
        if (!open) { setQuery(""); setLevels([]); setSection(null); setTag(null); setOwnOnly(false); setWriting(false); setGenerating(false) }
    }, [open])

    const tags = useMemo(() => [...new Set((catalog ?? []).filter((c) => !section || c.section === section).map((c) => c.tag))].sort(), [catalog, section])
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        return (catalog ?? []).filter((c) =>
            (!q || c.title.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q))
            && (levels.length === 0 || levels.includes(c.difficulty))
            && (!section || c.section === section)
            && (!tag || c.tag === tag)
            && (!ownOnly || c.own))
    }, [catalog, query, levels, section, tag, ownOnly])
    const pickable = shown.filter((c) => !c.draft)
    const allShownPicked = pickable.length > 0 && pickable.every((c) => chosen.has(c.id))

    const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id])
    const pickShown = () => {
        if (allShownPicked) onChange(selected.filter((id) => !pickable.some((c) => c.id === id)))
        else onChange([...new Set([...selected, ...pickable.map((c) => c.id)])])
    }

    const size = selected.length
    const tooSmall = size < drawCount
    const repeats = !tooSmall && size < drawCount * PIPELINE_LIMITS.poolToDrawWarning

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" scroll={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
                <div className="border-b border-neutral-200 px-5 pb-4 pt-5 dark:border-neutral-800">
                    <SheetTitle className="pr-8 text-base">Edit pool: {roundTitle}</SheetTitle>
                    <SheetDescription className="mt-1 text-sm">
                        Each attempt draws {drawCount} {drawCount === 1 ? one : many} at random from what you tick here.
                        {roundType === "APTITUDE" && " Draws are spread evenly across the sections you include."}
                    </SheetDescription>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${many}`} className="pl-9" aria-label={`Search ${many}`} />
                        </div>
                        {editable && roundType === "APTITUDE" && (
                            <Button variant="outline" className="gap-1.5" onClick={() => setGenerating((g) => !g)}>
                                <Sparkles className="h-4 w-4" /> Generate with AI{catalog?.some((c) => c.draft) ? ` (${catalog.filter((c) => c.draft).length} to review)` : ""}
                            </Button>
                        )}
                        {editable && roundType === "SYSTEM_DESIGN" && (
                            <Button variant="outline" className="gap-1.5" onClick={() => setWriting((w) => !w)}><PenLine className="h-4 w-4" /> Write your own</Button>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {(["EASY", "MEDIUM", "HARD"] as PoolLevel[]).map((l) => (
                            <Chip key={l} active={levels.includes(l)} onClick={() => setLevels((ls) => ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l])}>
                                {l.charAt(0) + l.slice(1).toLowerCase()}
                            </Chip>
                        ))}
                        {roundType === "APTITUDE" && (
                            <>
                                <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
                                {Object.keys(SECTION_LABEL).map((s) => (
                                    <Chip key={s} active={section === s} onClick={() => { setSection(section === s ? null : s); setTag(null) }}>{SECTION_LABEL[s]}</Chip>
                                ))}
                            </>
                        )}
                        {(catalog ?? []).some((c) => c.own) && (
                            <>
                                <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
                                <Chip active={ownOnly} onClick={() => setOwnOnly((o) => !o)}>Yours</Chip>
                            </>
                        )}
                        {tags.length > 1 && (
                            <select
                                value={tag ?? ""}
                                onChange={(e) => setTag(e.target.value || null)}
                                aria-label="Topic"
                                className="h-7 rounded-full border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                            >
                                <option value="">All topics</option>
                                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {generating && roundType === "APTITUDE" && (
                    <AptitudeAiPanel onChanged={onCatalogRefresh} onClose={() => setGenerating(false)} />
                )}

                {writing && roundType === "SYSTEM_DESIGN" && (
                    <WritePrompt onSaved={(item) => { onCatalogAdd(item); onChange([...selected, item.id]); setWriting(false) }} onCancel={() => setWriting(false)} />
                )}

                <ScrollArea className="min-h-0 flex-1">
                    {loading || !catalog ? (
                        <div className="space-y-1 p-3" aria-busy aria-label={`Loading ${many}`}>
                            <ShimmerStyles />
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                                    <Shimmer className="h-4 w-4 rounded" delay={i * 0.03} />
                                    <Shimmer className="h-4 flex-1" delay={i * 0.03} />
                                    <Shimmer className="h-4 w-16" delay={i * 0.03} />
                                </div>
                            ))}
                        </div>
                    ) : shown.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">Nothing matches these filters.</p>
                    ) : (
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {shown.map((c) => (
                                <li key={c.id}>
                                    <label className={cn("flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40", c.draft && "cursor-not-allowed opacity-60")}>
                                        <Checkbox checked={chosen.has(c.id)} disabled={c.draft || !editable} onCheckedChange={() => toggle(c.id)} className="mt-0.5" aria-label={c.title} />
                                        <span className="min-w-0 flex-1">
                                            <span className="line-clamp-2 text-sm text-neutral-900 dark:text-white">{c.title}</span>
                                            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                                                {c.section ? `${SECTION_LABEL[c.section] ?? c.section} · ` : ""}{c.tag}
                                                {c.own && <span className="ml-1.5 rounded bg-neutral-100 px-1 py-px text-[10px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">Yours</span>}
                                                {c.draft && <span className="ml-1.5">Draft: approve it to use it</span>}
                                            </span>
                                        </span>
                                        <span className="shrink-0 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{c.difficulty}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </ScrollArea>

                <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
                    {(tooSmall || repeats) && (
                        <p className={cn("mb-2 flex items-start gap-1.5 text-xs", tooSmall ? "text-rose-700 dark:text-rose-400" : "text-neutral-600 dark:text-neutral-400")}>
                            <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                            {tooSmall
                                ? `Pick at least ${drawCount}: each attempt draws ${drawCount}.`
                                : `Retakes will repeat ${many}: fewer than ${drawCount * PIPELINE_LIMITS.poolToDrawWarning} are picked for a draw of ${drawCount}.`}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className={cn("flex items-center gap-2", !editable && "invisible")}>
                            <Button variant="outline" size="sm" onClick={pickShown} disabled={pickable.length === 0}>
                                {allShownPicked ? "Untick" : "Tick"} all shown ({pickable.length})
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={size === 0}>Clear</Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">{size} {size === 1 ? one : many} picked</span>
                            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                active ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300",
            )}
        >
            {children}
        </button>
    )
}

/** A company's own design prompt: LIVE at once, private to it (HR-11). */
function WritePrompt({ onSaved, onCancel }: { onSaved: (item: CatalogItem) => void; onCancel: () => void }) {
    const [title, setTitle] = useState("")
    const [prompt, setPrompt] = useState("")
    const [difficulty, setDifficulty] = useState<PoolLevel>("MEDIUM")
    const [rubric, setRubric] = useState<RubricCriterion[]>([
        { criterion: "Requirements and scope", weight: 20, lookFor: "" },
        { criterion: "Design and data model", weight: 40, lookFor: "" },
        { criterion: "Scaling and trade-offs", weight: 40, lookFor: "" },
    ])
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const total = rubric.reduce((n, c) => n + (Number.isFinite(c.weight) ? c.weight : 0), 0)

    const save = async () => {
        setSaving(true)
        setError(null)
        const r = await createCompanyDesignPrompt({ title, prompt, difficulty, rubric })
        setSaving(false)
        if (!r.success) { setError(r.error); return }
        onSaved(r.data)
    }

    return (
        <div className="max-h-[55%] overflow-y-auto border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-white">Your own design prompt</p>
            <div className="grid gap-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Design a notification service" maxLength={80} aria-label="Prompt title" />
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as PoolLevel)} aria-label="Difficulty" className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                    </select>
                </div>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={4000} aria-label="Brief"
                    placeholder="The system to design, its scale (users, requests, data) and what the answer should cover." />
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Rubric</p>
                        <p className={cn("text-xs tabular-nums", total === 100 ? "text-neutral-500" : "text-rose-700 dark:text-rose-400")}>Weights: {total} / 100</p>
                    </div>
                    {rubric.map((c, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1.4fr)_auto]">
                            <Input value={c.criterion} onChange={(e) => setRubric(rubric.map((x, j) => j === i ? { ...x, criterion: e.target.value } : x))} placeholder="Criterion" maxLength={60} aria-label="Criterion" />
                            <Input type="number" value={Number.isNaN(c.weight) ? "" : c.weight} onChange={(e) => setRubric(rubric.map((x, j) => j === i ? { ...x, weight: e.target.value === "" ? Number.NaN : Number(e.target.value) } : x))} aria-label="Weight" />
                            <Input value={c.lookFor} onChange={(e) => setRubric(rubric.map((x, j) => j === i ? { ...x, lookFor: e.target.value } : x))} placeholder="What a strong answer shows" maxLength={300} aria-label="What a strong answer shows" />
                            <Button variant="ghost" size="icon" aria-label="Remove criterion" onClick={() => setRubric(rubric.filter((_, j) => j !== i))} disabled={rubric.length <= 2}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    {rubric.length < 8 && (
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setRubric([...rubric, { criterion: "", weight: 0, lookFor: "" }])}><Plus className="h-4 w-4" /> Criterion</Button>
                    )}
                </div>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button size="sm" className="gap-1.5" onClick={() => void save()} disabled={saving || total !== 100}>
                    {saving && <InlineLoader size="sm" />} Save and pick it
                </Button>
            </div>
        </div>
    )
}
