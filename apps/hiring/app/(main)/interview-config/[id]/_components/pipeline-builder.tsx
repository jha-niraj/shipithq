"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Reorder, useDragControls } from "framer-motion"
import { ArrowDown, ArrowLeft, ArrowUp, CircleAlert, GripVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { BEHAVIOURAL_KNOWLEDGE, BEHAVIOURAL_RUBRIC, CULTURE_KNOWLEDGE, CULTURE_RUBRIC } from "@repo/db/hiring-defaults"
import { deletePipeline, getPipeline, getPoolCatalog, savePipeline } from "@/actions/interview-config/pipeline-builder.action"
import {
    AI_ASSESSED_TYPES, PIPELINE_LIMITS, POOLED_TYPES, ROUND_TYPE_LABEL, V1_ROUND_TYPES, roundProblems,
    type BuilderRound, type CatalogItem, type PoolLevel, type RoundDraft, type RubricCriterion, type V1RoundType,
} from "@/types/pipeline"
import { PoolSheet } from "./pool-sheet"

/*
 * The pipeline builder (plan/hiring-rounds HR-10, layout decided by Niraj
 * 2026-09-25): an ordered list of rounds on the left, dragged or moved with the
 * arrows, and the selected round's settings on the right. Nothing is written
 * until Save, which sends the whole pipeline; leaving with unsaved changes
 * asks first. The company AI docks beside this in HA-11.
 */

type Pipeline = {
    id: string
    name: string
    description: string | null
    rounds: BuilderRound[]
    jobsUsing: number
    canManage: boolean
    /** A job's own copy (HR-12). */
    job: { id: string; slug: string; title: string; status: string } | null
    sourceName: string | null
    runs: number
}

/** A round as edited here: `key` is stable across reorders; `savedType` tells a type change apart. */
type EditRound = RoundDraft & { key: string; poolSize: number | null; legacy: boolean; savedType: string | null; savedPool: string[] }
type PooledType = "APTITUDE" | "DSA" | "SYSTEM_DESIGN"

/** The difficulties a default pool takes at each level: mirrors `defaultPool` on the server. */
const LEVEL_DIFFICULTIES: Record<PoolLevel, PoolLevel[]> = { EASY: ["EASY", "MEDIUM"], MEDIUM: ["EASY", "MEDIUM", "HARD"], HARD: ["MEDIUM", "HARD"] }

/** What the pool sheet opens with: the edited pool, the saved one, or the default Save would give. */
function initialSelection(r: EditRound, catalog: CatalogItem[]): string[] {
    if (r.pool) return r.pool
    if (r.savedType === r.roundType) return r.savedPool
    const level = r.poolLevel ?? "MEDIUM"
    if (r.roundType === "DSA") return catalog.filter((c) => c.difficulty === level).map((c) => c.id)
    return catalog.filter((c) => !c.own && !c.draft && LEVEL_DIFFICULTIES[level].includes(c.difficulty)).map((c) => c.id)
}

const isPooled = (t: string) => (POOLED_TYPES as readonly string[]).includes(t)
const isVoice = (t: string) => t === "VOICE_BEHAVIOURAL" || t === "VOICE_CULTURE"

function fromSaved(r: BuilderRound): EditRound {
    return { ...r, key: r.id, poolSize: isPooled(r.roundType) ? r.poolSize : null, savedType: r.roundType }
}

function newRound(t: V1RoundType): EditRound {
    const voice = t === "VOICE_BEHAVIOURAL" ? { rubric: BEHAVIOURAL_RUBRIC, kb: BEHAVIOURAL_KNOWLEDGE } : t === "VOICE_CULTURE" ? { rubric: CULTURE_RUBRIC, kb: CULTURE_KNOWLEDGE } : null
    const ai = (AI_ASSESSED_TYPES as readonly string[]).includes(t)
    return {
        key: `new-${Math.random().toString(36).slice(2, 10)}`,
        roundType: t,
        title: ROUND_TYPE_LABEL[t],
        description: "",
        gateMode: ai ? "ADVISORY" : "HARD",
        passMark: 60,
        timeLimitMinutes: t === "APTITUDE" ? 25 : isVoice(t) ? 20 : 45,
        drawCount: t === "APTITUDE" ? 20 : 1,
        cooldownHours: 24,
        responseMode: isVoice(t) ? "EITHER" : "TYPED",
        rubric: voice ? voice.rubric.map((c) => ({ ...c })) : null,
        mockKnowledgeBase: voice?.kb ?? null,
        poolLevel: t === "DSA" ? "EASY" : "MEDIUM",
        poolSize: null,
        legacy: false,
        savedType: null,
        savedPool: [],
    }
}

/** The pool a round will have after Save: its own, or the default for a new or changed type. */
function effectivePool(r: EditRound, defaults: Record<string, Record<PoolLevel, number>>): number | null {
    if (!isPooled(r.roundType)) return null
    if (r.pool) return r.pool.length
    if (r.savedType === r.roundType && r.poolSize !== null) return r.poolSize
    return defaults[r.roundType]?.[r.poolLevel ?? "MEDIUM"] ?? 0
}

/** A picked pool equal to the saved one is no change (opening the sheet seeds it). */
const samePool = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length

const snapshot = (name: string, description: string, rounds: EditRound[]) =>
    JSON.stringify({
        name,
        description,
        rounds: rounds.map(({ key: _k, poolSize: _p, legacy: _l, savedType: _s, savedPool, pool, ...r }) => ({
            ...r,
            pool: pool && !(r.roundType === _s && samePool(pool, savedPool)) ? [...pool].sort() : undefined,
        })),
    })

export function PipelineBuilder({ pipeline, defaultPoolSizes }: { pipeline: Pipeline; defaultPoolSizes: Record<string, Record<PoolLevel, number>> }) {
    const router = useRouter()
    const [name, setName] = useState(pipeline.name)
    const [description, setDescription] = useState(pipeline.description ?? "")
    const [rounds, setRounds] = useState<EditRound[]>(() => pipeline.rounds.map(fromSaved))
    const [baseline, setBaseline] = useState(() => snapshot(pipeline.name, pipeline.description ?? "", pipeline.rounds.map(fromSaved)))
    const [selected, setSelected] = useState<string | null>(pipeline.rounds[0]?.id ?? null)
    const [adding, setAdding] = useState(false)
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [jobsUsing] = useState(pipeline.jobsUsing)
    // A job's copy with candidates' runs forks on save, so its id can change.
    const [pipelineId, setPipelineId] = useState(pipeline.id)
    const [runs, setRuns] = useState(pipeline.runs)
    const job = pipeline.job
    // The pool sheet (HR-11): which round it is open for, and each type's catalogue once loaded.
    const [poolFor, setPoolFor] = useState<string | null>(null)
    const [catalogs, setCatalogs] = useState<Partial<Record<PooledType, CatalogItem[]>>>({})
    const [catalogLoading, setCatalogLoading] = useState(false)
    const editable = pipeline.canManage

    const dirty = snapshot(name, description, rounds) !== baseline
    const problems = useMemo(
        () => Object.fromEntries(rounds.map((r) => [r.key, roundProblems(r, effectivePool(r, defaultPoolSizes))])),
        [rounds, defaultPoolSizes],
    )
    const firstProblem = rounds.findIndex((r) => problems[r.key]!.length > 0)
    const canSave = editable && dirty && !saving && rounds.length > 0 && firstProblem === -1 && name.trim().length > 0

    // Unsaved changes: ask before a reload, a tab close, or an in-app link.
    useEffect(() => {
        if (!dirty) return
        const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
        const onClick = (e: MouseEvent) => {
            const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null
            if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return
            if (!window.confirm("You have unsaved changes to this pipeline. Leave without saving?")) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
        window.addEventListener("beforeunload", onUnload)
        document.addEventListener("click", onClick, true)
        return () => {
            window.removeEventListener("beforeunload", onUnload)
            document.removeEventListener("click", onClick, true)
        }
    }, [dirty])

    const update = (key: string, patch: Partial<EditRound>) => setRounds((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    const move = (key: string, dir: -1 | 1) => setRounds((rs) => {
        const i = rs.findIndex((r) => r.key === key)
        const j = i + dir
        if (i < 0 || j < 0 || j >= rs.length) return rs
        const copy = [...rs]
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
        return copy
    })
    const remove = (key: string) => {
        const i = rounds.findIndex((r) => r.key === key)
        const next = rounds.filter((r) => r.key !== key)
        setRounds(next)
        // Select the neighbour, so the editor never goes blank mid-edit.
        if (selected === key) setSelected(next[Math.min(i, next.length - 1)]?.key ?? null)
    }
    const add = (t: V1RoundType) => {
        const r = newRound(t)
        setRounds((rs) => [...rs, r])
        setSelected(r.key)
        setAdding(false)
    }

    const save = async () => {
        setSaving(true)
        const r = await savePipeline(pipelineId, {
            name,
            description,
            rounds: rounds.map(({ key: _k, poolSize: _p, legacy: _l, savedType: _s, savedPool: _sp, id, ...rest }) => (id ? { ...rest, id } : rest)),
        })
        if (!r.success) { setSaving(false); toast.error(r.error); return }
        // Reload what was saved: new rounds now have ids and pools (and a fork has a new id).
        if (r.data.id !== pipelineId) setPipelineId(r.data.id)
        const fresh = await getPipeline(r.data.id)
        setSaving(false)
        if (fresh.success) {
            const next = fresh.data.rounds.map(fromSaved)
            const selIndex = rounds.findIndex((x) => x.key === selected)
            setRounds(next)
            setName(fresh.data.name)
            setDescription(fresh.data.description ?? "")
            setBaseline(snapshot(fresh.data.name, fresh.data.description ?? "", next))
            setSelected(next[Math.max(0, selIndex)]?.key ?? null)
            setRuns(fresh.data.runs)
        }
        toast.success(r.data.id !== pipelineId ? "Saved as a new version: candidates already in progress keep the rounds they started with" : "Pipeline saved")
        router.refresh()
    }

    const destroy = async () => {
        const r = await deletePipeline(pipelineId)
        if (!r.success) { toast.error(r.error); setConfirmDelete(false); return }
        setBaseline(snapshot(name, description, rounds)) // nothing to guard any more
        toast.success("Pipeline deleted")
        router.push("/interview-config")
    }

    const current = rounds.find((r) => r.key === selected) ?? null
    const poolRound = rounds.find((r) => r.key === poolFor) ?? null

    const openPool = async (r: EditRound) => {
        const t = r.roundType as PooledType
        setPoolFor(r.key)
        let catalog = catalogs[t]
        if (!catalog) {
            setCatalogLoading(true)
            const res = await getPoolCatalog(t)
            setCatalogLoading(false)
            if (!res.success) { toast.error(res.error); setPoolFor(null); return }
            catalog = res.data
            setCatalogs((c) => ({ ...c, [t]: res.data }))
        }
        // Seed the pick list the first time, so the sheet shows what Save would use.
        if (!r.pool) update(r.key, { pool: initialSelection(r, catalog) })
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link href={job ? `/jobs/${job.slug}/edit` : "/interview-config"} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                <ArrowLeft className="h-4 w-4" /> {job ? job.title : "Pipelines"}
            </Link>

            {job && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    This is <span className="font-medium text-neutral-900 dark:text-white">{job.title}</span>&apos;s own copy{pipeline.sourceName ? <> of <span className="font-medium text-neutral-900 dark:text-white">{pipeline.sourceName}</span></> : null}. Changes here affect only this job; the template stays as it is.
                    {runs > 0 && (
                        <span className="mt-1 block text-neutral-600 dark:text-neutral-400">
                            {runs} {runs === 1 ? "candidate has" : "candidates have"} started these rounds. Saving makes a new version for new candidates; anyone already in progress keeps the rounds they started with.
                        </span>
                    )}
                </div>
            )}

            {/* Header: the name, and Save */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!editable}
                        maxLength={80}
                        aria-label="Pipeline name"
                        className="h-11 max-w-xl text-lg font-semibold"
                    />
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!editable}
                        rows={2}
                        maxLength={1000}
                        placeholder="Who this pipeline is for (shown to candidates)."
                        aria-label="Pipeline description"
                        className="max-w-xl"
                    />
                    {!job && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {jobsUsing === 0 ? "No jobs were made from this pipeline yet." : `${jobsUsing} ${jobsUsing === 1 ? "job was" : "jobs were"} made from this pipeline. Each has its own copy, so saving here doesn't change them.`}
                        </p>
                    )}
                </div>
                {editable && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {dirty && <span className="text-sm text-neutral-500 dark:text-neutral-400">Unsaved changes</span>}
                        {job ? null : confirmDelete ? (
                            <>
                                <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400" onClick={() => void destroy()}>
                                    Delete for good
                                </Button>
                                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setConfirmDelete(true)} aria-label="Delete pipeline"><Trash2 className="h-4 w-4" /></Button>
                        )}
                        <Button onClick={() => void save()} disabled={!canSave} className="gap-1.5">
                            {saving && <InlineLoader size="sm" />} Save pipeline
                        </Button>
                    </div>
                )}
            </div>

            {firstProblem >= 0 && dirty && (
                <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Round {firstProblem + 1}: {problems[rounds[firstProblem]!.key]![0]}
                </p>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
                {/* Rounds, in order */}
                <aside className="space-y-2">
                    <p className="px-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Rounds <span className="normal-case tracking-normal">({rounds.length}/{PIPELINE_LIMITS.maxRounds})</span>
                    </p>
                    <Reorder.Group axis="y" values={rounds} onReorder={editable ? setRounds : () => {}} className="space-y-2">
                        {rounds.map((r, i) => (
                            <RoundRow
                                key={r.key}
                                round={r}
                                index={i}
                                count={rounds.length}
                                selected={r.key === selected}
                                hasProblem={problems[r.key]!.length > 0}
                                editable={editable}
                                onSelect={() => setSelected(r.key)}
                                onMove={(dir) => move(r.key, dir)}
                            />
                        ))}
                    </Reorder.Group>
                    {rounds.length === 0 && (
                        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                            No rounds yet.
                        </p>
                    )}
                    {editable && rounds.length < PIPELINE_LIMITS.maxRounds && (
                        adding ? (
                            <div className="rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
                                {V1_ROUND_TYPES.map((t) => (
                                    <button key={t} type="button" onClick={() => add(t)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">
                                        {ROUND_TYPE_LABEL[t]}
                                    </button>
                                ))}
                                <button type="button" onClick={() => setAdding(false)} className="mt-1 block w-full rounded-lg px-3 py-1.5 text-left text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">Cancel</button>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full gap-1.5" onClick={() => setAdding(true)}>
                                <Plus className="h-4 w-4" /> Add round
                            </Button>
                        )
                    )}
                </aside>

                {/* The selected round */}
                <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    {current ? (
                        <RoundEditor
                            round={current}
                            index={rounds.findIndex((r) => r.key === current.key)}
                            problems={problems[current.key]!}
                            pool={effectivePool(current, defaultPoolSizes)}
                            defaultPoolSizes={defaultPoolSizes}
                            editable={editable}
                            onChange={(patch) => update(current.key, patch)}
                            onRemove={() => remove(current.key)}
                            onEditPool={() => void openPool(current)}
                        />
                    ) : (
                        <p className="px-6 py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
                            {rounds.length ? "Select a round to edit it." : "Add the first round to start."}
                        </p>
                    )}
                </section>
            </div>

            {poolRound && isPooled(poolRound.roundType) && (
                <PoolSheet
                    open={poolFor !== null}
                    onOpenChange={(o) => { if (!o) setPoolFor(null) }}
                    roundType={poolRound.roundType as PooledType}
                    roundTitle={poolRound.title || ROUND_TYPE_LABEL[poolRound.roundType as V1RoundType]}
                    catalog={catalogs[poolRound.roundType as PooledType] ?? null}
                    loading={catalogLoading}
                    selected={poolRound.pool ?? []}
                    drawCount={Number.isFinite(poolRound.drawCount) ? poolRound.drawCount : 1}
                    onChange={(ids) => update(poolRound.key, { pool: ids })}
                    editable={editable}
                    onCatalogRefresh={async () => {
                        const t = poolRound.roundType as PooledType
                        const res = await getPoolCatalog(t)
                        if (res.success) setCatalogs((c) => ({ ...c, [t]: res.data }))
                    }}
                    onCatalogAdd={(item) => setCatalogs((c) => ({ ...c, [poolRound.roundType as PooledType]: [item, ...(c[poolRound.roundType as PooledType] ?? [])] }))}
                />
            )}
        </div>
    )
}

function RoundRow({ round: r, index, count, selected, hasProblem, editable, onSelect, onMove }: {
    round: EditRound
    index: number
    count: number
    selected: boolean
    hasProblem: boolean
    editable: boolean
    onSelect: () => void
    onMove: (dir: -1 | 1) => void
}) {
    const controls = useDragControls()
    const label = (V1_ROUND_TYPES as readonly string[]).includes(r.roundType) ? ROUND_TYPE_LABEL[r.roundType as V1RoundType] : `Legacy: ${r.roundType.replace(/_/g, " ").toLowerCase()}`
    return (
        <Reorder.Item value={r} dragListener={false} dragControls={controls} className="list-none">
            <div
                className={cn(
                    "group flex items-center gap-2 rounded-xl border bg-white px-2 py-2.5 transition-colors dark:bg-neutral-900",
                    selected ? "border-neutral-900 dark:border-white" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700",
                )}
            >
                {editable && (
                    <button
                        type="button"
                        aria-label={`Drag round ${index + 1}`}
                        onPointerDown={(e) => controls.start(e)}
                        className="cursor-grab touch-none rounded p-1 text-neutral-400 hover:text-neutral-700 active:cursor-grabbing dark:hover:text-neutral-200"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}
                <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="w-4 shrink-0 font-mono text-xs text-neutral-400">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">{r.title || label}</span>
                        <span className={cn("block truncate text-xs", r.legacy && r.savedType === r.roundType ? "text-rose-700 dark:text-rose-400" : "text-neutral-500 dark:text-neutral-400")}>{label}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px]", r.gateMode === "HARD" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")}>
                        {r.gateMode === "HARD" ? "HARD" : "ADV"} {r.passMark}
                    </span>
                    {hasProblem && <CircleAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-label="Needs a fix" />}
                </button>
                {editable && (
                    <span className="flex shrink-0 flex-col opacity-60 group-hover:opacity-100">
                        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="rounded p-0.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 dark:hover:text-white"><ArrowUp className="h-3 w-3" /></button>
                        <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded p-0.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 dark:hover:text-white"><ArrowDown className="h-3 w-3" /></button>
                    </span>
                )}
            </div>
        </Reorder.Item>
    )
}

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-900 dark:text-white">{label}</label>
            {children}
            {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
        </div>
    )
}

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v))

function RoundEditor({ round: r, index, problems, pool, defaultPoolSizes, editable, onChange, onRemove, onEditPool }: {
    round: EditRound
    index: number
    problems: string[]
    pool: number | null
    defaultPoolSizes: Record<string, Record<PoolLevel, number>>
    editable: boolean
    onChange: (patch: Partial<EditRound>) => void
    onRemove: () => void
    onEditPool: () => void
}) {
    const v1 = (V1_ROUND_TYPES as readonly string[]).includes(r.roundType)
    const pooled = isPooled(r.roundType)
    const voice = isVoice(r.roundType)
    // A new or re-typed round draws from a level until the company picks its pool itself.
    const freshPool = pooled && r.savedType !== r.roundType && !r.pool
    const id = (s: string) => `r-${r.key}-${s}`

    const changeType = (t: V1RoundType) => {
        const d = newRound(t)
        onChange({
            roundType: t,
            // A type change resets what only makes sense for the old type.
            title: r.title && r.title !== ROUND_TYPE_LABEL[r.roundType as V1RoundType] ? r.title : d.title,
            gateMode: d.gateMode,
            drawCount: d.drawCount,
            timeLimitMinutes: d.timeLimitMinutes,
            responseMode: d.responseMode,
            rubric: d.rubric,
            mockKnowledgeBase: d.mockKnowledgeBase,
            poolLevel: d.poolLevel,
            // A pool belongs to its type: picked problems can't carry over to aptitude.
            pool: undefined,
        })
    }

    return (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Round {index + 1}</p>
                {editable && (
                    <Button variant="ghost" size="sm" className="gap-1.5 text-neutral-600 dark:text-neutral-300" onClick={onRemove}>
                        <Trash2 className="h-4 w-4" /> Remove round
                    </Button>
                )}
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label="Type" htmlFor={id("type")}>
                    <Select value={v1 ? r.roundType : undefined} onValueChange={(t) => changeType(t as V1RoundType)} disabled={!editable}>
                        <SelectTrigger id={id("type")}>
                            <SelectValue placeholder={`Legacy: ${r.roundType.replace(/_/g, " ").toLowerCase()} (pick a type)`} />
                        </SelectTrigger>
                        <SelectContent>
                            {V1_ROUND_TYPES.map((t) => <SelectItem key={t} value={t}>{ROUND_TYPE_LABEL[t]}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="Title" htmlFor={id("title")}>
                    <Input id={id("title")} value={r.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={80} disabled={!editable} />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="What the round checks" hint="Shown to candidates before they start." htmlFor={id("desc")}>
                        <Textarea id={id("desc")} value={r.description} onChange={(e) => onChange({ description: e.target.value })} rows={2} maxLength={2000} disabled={!editable} />
                    </Field>
                </div>
            </div>

            {/* Gate */}
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <Field
                    label="Gate"
                    hint={r.gateMode === "HARD" ? "Below the pass mark, the next round stays locked." : "Scored and shown to you; never blocks the next round."}
                >
                    <div role="radiogroup" aria-label="Gate" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
                        {(["HARD", "ADVISORY"] as const).map((g) => (
                            <button
                                key={g}
                                type="button"
                                role="radio"
                                aria-checked={r.gateMode === g}
                                disabled={!editable}
                                onClick={() => onChange({ gateMode: g })}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-sm font-medium",
                                    r.gateMode === g ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white",
                                )}
                            >
                                {g === "HARD" ? "Hard gate" : "Advisory"}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Pass mark (0-100)" htmlFor={id("pass")}>
                    <Input id={id("pass")} type="number" inputMode="numeric" min={0} max={100} value={Number.isNaN(r.passMark) ? "" : r.passMark} onChange={(e) => onChange({ passMark: num(e.target.value) })} disabled={!editable} className="w-32" />
                </Field>
                <Field label="Time limit (minutes)" htmlFor={id("time")}>
                    <Input id={id("time")} type="number" inputMode="numeric" min={5} max={180} value={Number.isNaN(r.timeLimitMinutes) ? "" : r.timeLimitMinutes} onChange={(e) => onChange({ timeLimitMinutes: num(e.target.value) })} disabled={!editable} className="w-32" />
                </Field>
                <Field label="Retake cool-down (hours)" hint="How long a candidate waits before trying this round again." htmlFor={id("cool")}>
                    <Input id={id("cool")} type="number" inputMode="numeric" min={0} max={720} value={Number.isNaN(r.cooldownHours) ? "" : r.cooldownHours} onChange={(e) => onChange({ cooldownHours: num(e.target.value) })} disabled={!editable} className="w-32" />
                </Field>
            </div>

            {/* Questions */}
            {pooled && (
                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                    <Field label={r.roundType === "APTITUDE" ? "Questions per attempt" : r.roundType === "DSA" ? "Problems per attempt" : "Prompts per attempt"} htmlFor={id("draw")}>
                        <Input id={id("draw")} type="number" inputMode="numeric" min={1} max={50} value={Number.isNaN(r.drawCount) ? "" : r.drawCount} onChange={(e) => onChange({ drawCount: num(e.target.value) })} disabled={!editable} className="w-32" />
                    </Field>
                    {freshPool ? (
                        <Field label="Question level" hint="Sets which of ShipItHQ's questions this round draws from. You can pick them one by one later.">
                            <Select value={r.poolLevel ?? "MEDIUM"} onValueChange={(v) => onChange({ poolLevel: v as PoolLevel })} disabled={!editable}>
                                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(["EASY", "MEDIUM", "HARD"] as PoolLevel[]).map((l) => (
                                        <SelectItem key={l} value={l}>
                                            {l.charAt(0) + l.slice(1).toLowerCase()} ({defaultPoolSizes[r.roundType]?.[l] ?? 0})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : (
                        <Field label="Pool" hint="What each attempt draws from.">
                            <div className="flex items-center gap-3 pt-1">
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{pool ?? 0} {pool === 1 ? "item" : "items"}{r.pool && r.savedType === r.roundType ? " (edited)" : ""}</span>
                                <Button variant="outline" size="sm" onClick={onEditPool}>{editable ? "Edit pool" : "View pool"}</Button>
                            </div>
                        </Field>
                    )}
                    {freshPool && editable && (
                        <div className="sm:col-span-2">
                            <Button variant="ghost" size="sm" className="-ml-2" onClick={onEditPool}>Or pick them one by one</Button>
                        </div>
                    )}
                    {pool !== null && Number.isFinite(r.drawCount) && pool < r.drawCount * PIPELINE_LIMITS.poolToDrawWarning && pool >= r.drawCount && (
                        <p className="text-xs text-neutral-600 sm:col-span-2 dark:text-neutral-400">
                            The pool holds {pool}, less than twice the draw: retakes will repeat questions.
                        </p>
                    )}
                </div>
            )}

            {voice && (
                <div className="space-y-4 px-5 py-5">
                    <Field label="Candidates answer by">
                        <div role="radiogroup" aria-label="Answer by" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
                            {(["EITHER", "VOICE", "TYPED"] as const).map((m) => (
                                <button key={m} type="button" role="radio" aria-checked={r.responseMode === m} disabled={!editable} onClick={() => onChange({ responseMode: m })}
                                    className={cn("rounded-md px-3 py-1.5 text-sm font-medium", r.responseMode === m ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white")}>
                                    {m === "EITHER" ? "Their choice" : m === "VOICE" ? "Speaking" : "Typing"}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <RubricEditor rubric={r.rubric ?? []} editable={editable} onChange={(rubric) => onChange({ rubric })} />
                    <Field label="What the interviewer should probe" hint="The AI interviewer's brief: the questions to draw from and how to follow up." htmlFor={id("kb")}>
                        <Textarea id={id("kb")} value={r.mockKnowledgeBase ?? ""} onChange={(e) => onChange({ mockKnowledgeBase: e.target.value })} rows={6} maxLength={4000} disabled={!editable} />
                    </Field>
                </div>
            )}

            {problems.length > 0 && (
                <ul className="space-y-1 px-5 py-4 text-sm text-rose-700 dark:text-rose-400">
                    {problems.map((p) => <li key={p} className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {p}</li>)}
                </ul>
            )}
        </div>
    )
}

function RubricEditor({ rubric, editable, onChange }: { rubric: RubricCriterion[]; editable: boolean; onChange: (r: RubricCriterion[]) => void }) {
    const total = rubric.reduce((n, c) => n + (Number.isFinite(c.weight) ? c.weight : 0), 0)
    const set = (i: number, patch: Partial<RubricCriterion>) => onChange(rubric.map((c, j) => (j === i ? { ...c, ...patch } : c)))
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Rubric</p>
                <p className={cn("text-xs tabular-nums", total === 100 ? "text-neutral-500 dark:text-neutral-400" : "text-rose-700 dark:text-rose-400")}>Weights: {total} / 100</p>
            </div>
            <div className="space-y-2">
                {rubric.map((c, i) => (
                    <div key={i} className="grid gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto] dark:border-neutral-800">
                        <Input value={c.criterion} onChange={(e) => set(i, { criterion: e.target.value })} placeholder="Criterion" maxLength={60} disabled={!editable} aria-label="Criterion" />
                        <Input type="number" inputMode="numeric" min={0} max={100} value={Number.isNaN(c.weight) ? "" : c.weight} onChange={(e) => set(i, { weight: num(e.target.value) })} disabled={!editable} aria-label="Weight" />
                        {editable && (
                            <Button variant="ghost" size="icon" aria-label="Remove criterion" onClick={() => onChange(rubric.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                        )}
                        <Textarea value={c.lookFor} onChange={(e) => set(i, { lookFor: e.target.value })} placeholder="What a strong answer shows" rows={2} maxLength={300} disabled={!editable} aria-label="What a strong answer shows" className="sm:col-span-3" />
                    </div>
                ))}
            </div>
            {editable && rubric.length < 8 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([...rubric, { criterion: "", weight: 0, lookFor: "" }])}>
                    <Plus className="h-4 w-4" /> Add criterion
                </Button>
            )}
        </div>
    )
}
