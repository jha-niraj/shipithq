"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { Bot, ChevronDown, Cloud, Cpu, Database, Globe, Layers, ListOrdered, Maximize2, Monitor, Plug } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { cn } from "../../lib/utils"
import type { SystemKind, SystemMap as SystemMapData } from "../../lib/incidents/types"
import { BOX, DiagramFrame, HaloText, INK, LINE, LitRing, Markers, SUB, arrowId, type Tone } from "./kit"
import { layered, mapConnectors } from "../../lib/incidents/layout"

/*
 * The system map (plan/incidents INC-63): the case's parts (browser, edge, compute,
 * stores, queues, outside APIs, AI) and how they connect, laid out left to right along the
 * links, grouped by who runs them. The part that broke pulses rose; the parts that lost
 * something are outlined rose. `lit` rings the part the narration is on; `focusParts`
 * (the chapter's parts) stay bright while the rest recede.
 */

const ICON: Record<SystemKind, typeof Monitor> = {
    client: Monitor, edge: Globe, compute: Cpu, store: Database, cache: Layers, queue: ListOrdered, external: Plug, ai: Bot,
}
const W = 184
const H = 56
const PAD = 16

type Status = "added" | "removed" | "changed"

/** The map after the fix (INC-68): removed parts stay as ghosts so the change reads. */
function afterFix(map: SystemMapData): { map: SystemMapData; status: Map<string, Status>; linkStatus: Map<string, Status> } {
    const a = map.after
    const status = new Map<string, Status>()
    const linkStatus = new Map<string, Status>()
    if (!a) return { map, status, linkStatus }
    a.removed?.forEach((id) => status.set(id, "removed"))
    a.changed?.forEach((id) => status.set(id, "changed"))
    a.added?.forEach((n) => status.set(n.id, "added"))
    a.removedLinks?.forEach((l) => linkStatus.set(`${l.from}>${l.to}`, "removed"))
    a.addedLinks?.forEach((l) => linkStatus.set(`${l.from}>${l.to}`, "added"))
    // Removed links are left out: the Before view shows them, and they would cross the new parts.
    const gone = new Set((a.removedLinks ?? []).map((l) => `${l.from}>${l.to}`))
    const moved = map.nodes.map((n) => (a.move?.[n.id] ? { ...n, ...a.move[n.id] } : n))
    return {
        map: { ...map, incident: undefined, nodes: [...moved, ...(a.added ?? [])], links: [...map.links.filter((l) => !gone.has(`${l.from}>${l.to}`)), ...(a.addedLinks ?? [])] },
        status, linkStatus,
    }
}

export function SystemMap({ map: base, lit = null, focusParts, showIncident = true, compact = false, view = "before", pick, className }: {
    map: SystemMapData
    lit?: string | null
    focusParts?: string[]
    showIncident?: boolean
    compact?: boolean
    /** "after": the map once the fix is in (INC-68). */
    view?: "before" | "after"
    /**
     * A "pick" check on the map (INC-71): parts are tappable, the picked ones ringed; with
     * `answer` (the results), right picks go emerald, wrong ones rose, missed ones dashed.
     */
    pick?: { picked: string[]; toggle?: (id: string) => void; answer?: string[] }
    className?: string
}) {
    const uid = useId().replace(/:/g, "")
    const { map, status, linkStatus } = useMemo(
        () => (view === "after" ? afterFix(base) : { map: base, status: new Map<string, Status>(), linkStatus: new Map<string, Status>() }),
        [base, view],
    )
    const { placed, width, height } = useMemo(() => layered(map.nodes, map.links, { w: W, h: H, gapX: compact ? 70 : 118, gapY: 30 }), [map, compact])
    const broken = new Set(showIncident ? map.incident?.broken ?? [] : [])
    const blast = new Set(showIncident ? map.incident?.blast ?? [] : [])
    const focus = new Set(focusParts ?? [])
    const receded = (id: string) => (lit ? lit !== id : focus.size > 0 && !focus.has(id))

    // Group boxes around their members, with room above for the label.
    const groups = (map.groups ?? []).map((g) => {
        const members = map.nodes.filter((n) => n.group === g.id).map((n) => placed.get(n.id)!).filter(Boolean)
        if (!members.length) return null
        const x0 = Math.min(...members.map((m) => m.x)) - PAD
        const y0 = Math.min(...members.map((m) => m.y)) - PAD - 14
        const x1 = Math.max(...members.map((m) => m.x + m.w)) + PAD
        const y1 = Math.max(...members.map((m) => m.y + m.h)) + PAD
        return { ...g, x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    }).filter(Boolean) as { id: string; label: string; x: number; y: number; w: number; h: number }[]

    // Every link's path once, with ends spread where links share a side.
    const paths = useMemo(() => mapConnectors(map.links, placed), [map.links, placed])

    const minX = Math.min(0, ...groups.map((g) => g.x)) - 10
    const minY = Math.min(0, ...groups.map((g) => g.y)) - 10
    const maxX = Math.max(width, ...groups.map((g) => g.x + g.w)) + 10
    const maxY = Math.max(height, ...groups.map((g) => g.y + g.h)) + 10

    return (
        <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label={map.caption ?? "The system"} className={cn("h-auto w-full", className)}>
            <defs><Markers uid={uid} /></defs>

            {groups.map((g) => (
                <g key={g.id}>
                    <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={18} fill="none" strokeDasharray="4 5" strokeWidth={1.2} className="stroke-neutral-300 dark:stroke-neutral-700" />
                    <text x={g.x + 14} y={g.y + 17} className="fill-neutral-500 text-[11px] font-medium dark:fill-neutral-400">{g.label}</text>
                </g>
            ))}

            {map.links.map((l, i) => {
                const path = paths[i]
                if (!path) return null
                const { d } = path
                const ls = linkStatus.get(`${l.from}>${l.to}`)
                const bad = (broken.has(l.from) && broken.has(l.to)) || ls === "removed"
                const good = ls === "added"
                const dim = receded(l.from) && receded(l.to)
                return (
                    <g key={i} className={cn("transition-opacity duration-300", dim && "opacity-30", ls === "removed" && "opacity-60")}>
                        <path d={d} fill="none" strokeWidth={good ? 2 : 1.6} strokeLinejoin="round" strokeDasharray={l.async || ls === "removed" ? "5 5" : undefined}
                            markerEnd={`url(#${arrowId(uid, bad ? "bad" : good ? "good" : "default")})`} className={bad ? LINE.bad : good ? LINE.good : LINE.default} />
                    </g>
                )
            })}

            {map.nodes.map((n) => {
                const b = placed.get(n.id)
                if (!b) return null
                const Icon = ICON[n.kind]
                const st = status.get(n.id)
                const tone: Tone = broken.has(n.id) ? "bad" : st === "added" ? "good" : "default"
                const picked = pick?.picked.includes(n.id)
                const right = pick?.answer?.includes(n.id)
                const tap = pick?.toggle
                return (
                    <g key={n.id} className={cn("transition-opacity duration-300", receded(n.id) && "opacity-35", st === "removed" && "opacity-50", tap && "cursor-pointer focus:outline-none")}
                        {...(tap ? {
                            role: "button", tabIndex: 0, "aria-pressed": !!picked, "aria-label": n.label,
                            onClick: () => tap(n.id),
                            onKeyDown: (k: React.KeyboardEvent) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); tap(n.id) } },
                        } : {})}>
                        {pick && (picked || right) && (
                            <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx={19} fill="none" strokeWidth={2.2}
                                strokeDasharray={pick.answer && right && !picked ? "5 4" : undefined}
                                className={!pick.answer ? "stroke-neutral-900 dark:stroke-white" : right ? "stroke-emerald-600 dark:stroke-emerald-500" : "stroke-rose-500"} />
                        )}
                        {st === "changed" && <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx={19} fill="none" strokeWidth={1.6} strokeDasharray="5 4" className="stroke-emerald-600 dark:stroke-emerald-500" />}
                        {st === "removed" && <line x1={b.x + 8} y1={b.y + b.h / 2} x2={b.x + b.w - 8} y2={b.y + b.h / 2} strokeWidth={1.6} className="stroke-rose-500" />}
                        {broken.has(n.id) && <rect x={b.x - 7} y={b.y - 7} width={b.w + 14} height={b.h + 14} rx={20} fill="none" strokeWidth={2} className="dk-pulse stroke-rose-500" />}
                        {!broken.has(n.id) && blast.has(n.id) && <rect x={b.x - 5} y={b.y - 5} width={b.w + 10} height={b.h + 10} rx={18} fill="none" strokeWidth={1.5} strokeDasharray="4 4" className="stroke-rose-500" />}
                        {lit === n.id && <LitRing {...b} r={14} />}
                        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} strokeWidth={1.4} className={BOX[tone]} />
                        <Icon x={b.x + 12} y={b.y + b.h / 2 - 9} width={18} height={18} strokeWidth={1.8}
                            className={tone === "bad" ? "text-rose-600 dark:text-rose-400" : tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-600 dark:text-neutral-300"} aria-hidden />
                        <text x={b.x + 38} y={n.sub && !compact ? b.y + b.h / 2 - 3 : b.y + b.h / 2 + 5} className={cn("text-[13.5px] font-semibold", INK[tone])}>{n.label}</text>
                        {n.sub && !compact && <text x={b.x + 38} y={b.y + b.h / 2 + 14} className={cn("font-mono text-[10px]", SUB[tone])}>{n.sub}</text>}
                    </g>
                )
            })}

            {/* Link labels last, so no box covers them. */}
            {!compact && map.links.map((l, i) => {
                const path = paths[i]
                if (!path || !l.label) return null
                const { label } = path
                return (
                    <HaloText key={`l${i}`} x={label.x} y={label.y} textAnchor={label.anchor}
                        className={cn("font-mono text-[10.5px] fill-neutral-500 transition-opacity duration-300 dark:fill-neutral-400", receded(l.from) && receded(l.to) && "opacity-30")}>
                        {l.label}
                    </HaloText>
                )
            })}
        </svg>
    )
}

const OPEN_KEY = "incidents:map-open"

/**
 * The map pinned above a chapter (INC-63): compact, the chapter's parts bright, the part
 * being read ringed. It folds to a single line (remembered), and "Expand" opens it full
 * size with the incident note. Below `sm` it shows the chapter's parts as a line of names.
 */
export function SystemStrip({ map, lit, chapterId }: { map: SystemMapData; lit: string | null; chapterId: string }) {
    const [open, setOpen] = useState(true)
    const [full, setFull] = useState(false)
    useEffect(() => { try { if (localStorage.getItem(OPEN_KEY) === "0") setOpen(false) } catch { /* no storage */ } }, [])
    const toggle = () => setOpen((o) => { try { localStorage.setItem(OPEN_KEY, o ? "0" : "1") } catch { /* no storage */ } return !o })
    const parts = map.chapters?.[chapterId] ?? []
    const names = (lit ? [lit] : parts).map((id) => map.nodes.find((n) => n.id === id)?.label).filter(Boolean)

    return (
        <section aria-label="The system" className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <ChevronDown className={cn("size-4 shrink-0 text-neutral-500 transition-transform", !open && "-rotate-90")} aria-hidden />
                    <span className="shrink-0 text-[13px] font-medium text-neutral-900 dark:text-white">The system</span>
                    {names.length > 0 && <span className="min-w-0 truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">{names.join(" · ")}</span>}
                </button>
                <button type="button" onClick={() => setFull(true)} aria-label="Expand the system map"
                    className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white">
                    <Maximize2 className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Expand</span>
                </button>
            </div>
            {open && (
                <div className="hidden border-t border-neutral-100 px-3 pb-3 pt-2 sm:block dark:border-neutral-900">
                    <style>{`.sm-strip svg { max-height: 150px }`}</style>
                    <div className="sm-strip"><SystemMap map={map} lit={lit} focusParts={parts} compact /></div>
                </div>
            )}

            <Sheet open={full} onOpenChange={setFull}>
                <SheetContent className="w-full sm:max-w-none lg:w-2/3">
                    <SheetHeader className="text-left">
                        <SheetTitle>The system</SheetTitle>
                        <SheetDescription>{map.incident?.note ?? map.caption ?? "Every part in this case and how they connect."}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                        <DiagramFrame caption={map.caption}>
                            <SystemMap map={map} lit={lit} focusParts={parts} />
                        </DiagramFrame>
                        <Legend />
                    </div>
                </SheetContent>
            </Sheet>
        </section>
    )
}

function Legend() {
    return (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-neutral-600 dark:text-neutral-400">
            <li className="flex items-center gap-2"><span className="inline-block h-3.5 w-5 rounded-md border-2 border-rose-500" /> Broke</li>
            <li className="flex items-center gap-2"><span className="inline-block h-3.5 w-5 rounded-md border border-dashed border-rose-500" /> Lost something because of it</li>
            <li className="flex items-center gap-2"><span className="inline-block w-6 border-t border-dashed border-neutral-400" /> Happens later (async)</li>
            <li className="flex items-center gap-2"><Cloud className="size-3.5" aria-hidden /> Dashed boxes: who runs these parts</li>
        </ul>
    )
}

/**
 * The fix as a before and after of the case's map (plan/incidents INC-68): a switch (the
 * shared tabs) between the system as it was and as it is now, then what each change is
 * and what it costs.
 */
export function MapChange({ map, lit = null, caption }: { map: SystemMapData; lit?: string | null; caption?: string }) {
    const [view, setView] = useState<"before" | "after">("after")
    const a = map.after
    if (!a) return null
    const name = (id: string) => [...map.nodes, ...(a.added ?? [])].find((n) => n.id === id)?.label ?? id
    const notes = Object.entries(a.notes ?? {})
    return (
        <DiagramFrame caption={caption}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-neutral-600 dark:text-neutral-400">{view === "after" ? a.note : map.incident?.note ?? "The system as it was."}</p>
                <Tabs value={view} onValueChange={(v) => setView(v as "before" | "after")}>
                    <TabsList size="sm" fit>
                        <TabsTrigger value="before">Before</TabsTrigger>
                        <TabsTrigger value="after">After the fix</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <SystemMap map={map} lit={lit} view={view} showIncident={view === "before"} />
            {view === "after" && notes.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {notes.map(([id, note]) => {
                        const kind = a.added?.some((n) => n.id === id) ? "Added" : a.removed?.includes(id) ? "Removed" : "Changed"
                        return (
                            <li key={id} className={cn("flex gap-3 rounded-xl bg-white p-3 text-[13px] ring-1 dark:bg-neutral-950", lit === id ? "ring-2 ring-neutral-900 dark:ring-white" : "ring-neutral-200 dark:ring-neutral-800")}>
                                <span className={cn("w-16 shrink-0 text-[11px] font-medium", kind === "Added" ? "text-emerald-700 dark:text-emerald-400" : kind === "Removed" ? "text-rose-600 dark:text-rose-400" : "text-neutral-500")}>{kind}</span>
                                <span className="min-w-0"><span className="font-medium text-neutral-900 dark:text-white">{name(id)}</span><span className="block text-neutral-600 dark:text-neutral-400">{note}</span></span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </DiagramFrame>
    )
}
