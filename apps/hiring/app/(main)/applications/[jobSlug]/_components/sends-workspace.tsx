"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Columns3, Lock, MessageSquare, X } from "lucide-react"
import { ReportDialog } from "@repo/ui/components/moderation/report-dialog"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { ProfileCard, RoundCard } from "@repo/ui/components/hiring/send-view"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { getSend, getSendsForCompare } from "@/actions/sends"
import type { JobSends, SendDetail, SendRow } from "@/lib/sends"
import { sortSends, type SendSort } from "@/lib/send-sort"
import { renderDiagram } from "@/components/hiring/diagram-viewer"
import { ReplyBox } from "@repo/ui/components/inbox/inbox"
import { messageCandidateAction } from "@/actions/inbox"
import { reportCandidateAction } from "@/actions/moderation"
import { setOutcomeAction } from "@/actions/sends/decisions"
import { DecidePanel } from "./decide-panel"

/*
 * A role's candidates by round (plan/hiring-rounds HR-18), in the project
 * workspace's layout: the list on the left, the chosen candidate's rounds as
 * tabs in the middle, the company AI docked on the right by the shell. Arrow
 * keys move between candidates; up to three can be compared side by side.
 */

type Sort = SendSort
const TYPE_SHORT: Record<string, string> = { APTITUDE: "Apt", DSA: "DSA", SYSTEM_DESIGN: "Design", VOICE_BEHAVIOURAL: "Behav", VOICE_CULTURE: "Culture" }
const STATUS: Record<SendRow["status"], string> = { SENT: "New", VIEWED: "Viewed", INVITED: "Invited", DECLINED: "Declined" }

const ago = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    return d <= 0 ? "today" : d === 1 ? "1d" : d < 30 ? `${d}d` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function SendsWorkspace({ data, canMessage, canDecide, canDraft, initialSendId = null }: { data: JobSends; canMessage: boolean; canDecide: boolean; canDraft: boolean; initialSendId?: string | null }) {
    const [rows, setRows] = useState(data.rows)
    const [sort, setSort] = useState<Sort>("sent")
    const [minRound, setMinRound] = useState<number | null>(null)
    const [minScore, setMinScore] = useState(0)
    const [selected, setSelected] = useState<string | null>(null)
    const [ticked, setTicked] = useState<string[]>([])
    const [comparing, setComparing] = useState(false)
    // Deciding on one candidate, or on the ticked ones (HR-19).
    const [deciding, setDeciding] = useState<{ ids: string[]; decision: "INVITE" | "DECLINE" } | null>(null)
    const onDecided = (id: string, status: "INVITED" | "DECLINED") => {
        setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status } : x)))
        // Refetched on next open, so the detail shows the decision.
        setDetails((d) => { const n = { ...d }; delete n[id]; return n })
        setTicked((t) => t.filter((x) => x !== id))
    }
    const undecidedTicked = ticked.filter((id) => ["SENT", "VIEWED"].includes(rows.find((r) => r.id === id)?.status ?? ""))
    const [details, setDetails] = useState<Record<string, SendDetail>>({})
    const [loading, setLoading] = useState(false)
    // Below lg the list and the candidate take turns on the screen.
    const [mobileDetail, setMobileDetail] = useState(false)
    const listRef = useRef<HTMLOListElement>(null)

    const shown = useMemo(() => sortSends(rows, sort, { round: minRound, min: minScore }), [rows, sort, minRound, minScore])

    // Open a send: fetched once, and marked viewed in the list.
    const open = useCallback(async (id: string) => {
        setSelected(id)
        if (details[id]) return
        setLoading(true)
        const r = await getSend(id)
        setLoading(false)
        if (!r.success) { toast.error(r.error); return }
        setDetails((d) => ({ ...d, [id]: r.data }))
        setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status: r.data.status } : x)))
    }, [details])

    // Wide screens open the first candidate; a phone shows the list first. Opening
    // marks a send viewed, so it happens only where the candidate is on screen.
    useEffect(() => {
        // A link from Candidates names the send: open it wherever the screen is.
        if (initialSendId) { setMobileDetail(true); void open(initialSendId); return }
        const first = data.rows[0]?.id
        if (first && window.matchMedia("(min-width: 1024px)").matches) void open(first)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Up and down move through the list; Esc leaves the compare view.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null
            if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
            if (e.key === "Escape" && comparing) { setComparing(false); return }
            if (comparing || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return
            e.preventDefault()
            const i = shown.findIndex((r) => r.id === selected)
            const next = shown[Math.min(shown.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]
            if (next) {
                void open(next.id)
                listRef.current?.querySelector(`[data-send="${next.id}"]`)?.scrollIntoView({ block: "nearest" })
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [shown, selected, comparing, open])

    const tick = (id: string) => setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length >= 3 ? t : [...t, id]))

    const startCompare = async () => {
        const missing = ticked.filter((id) => !details[id])
        if (missing.length) {
            setLoading(true)
            const r = await getSendsForCompare(missing)
            setLoading(false)
            if (!r.success) { toast.error(r.error); return }
            setDetails((d) => ({ ...d, ...Object.fromEntries(r.data.map((x) => [x.id, x])) }))
            setRows((rs) => rs.map((x) => { const f = r.data.find((y) => y.id === x.id); return f ? { ...x, status: f.status } : x }))
        }
        setComparing(true)
    }

    return (
        <div className="flex h-screen flex-col">
            <header className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <Link href="/applications" aria-label="All roles" className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"><ArrowLeft className="h-4 w-4" /></Link>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{data.job.title}</h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{rows.length} {rows.length === 1 ? "candidate" : "candidates"} sent results</p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                    Sort
                    <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-950">
                        <option value="sent">Newest</option>
                        <option value="average">Average</option>
                        {data.columns.map((c) => <option key={c.number} value={`round:${c.number}`}>Round {c.number}: {c.title}</option>)}
                    </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                    At least
                    <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="h-8 w-14 rounded-md border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-950" aria-label="Minimum score" />
                    in
                    <select value={minRound ?? ""} onChange={(e) => setMinRound(e.target.value ? Number(e.target.value) : null)} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-950">
                        <option value="">any round</option>
                        {data.columns.map((c) => <option key={c.number} value={c.number}>Round {c.number}</option>)}
                    </select>
                </label>
                {canDecide && undecidedTicked.length > 0 && !deciding && (
                    <Button size="sm" variant="outline" onClick={() => { setComparing(false); setMobileDetail(true); setDeciding({ ids: undecidedTicked, decision: "DECLINE" }) }}>
                        Decide ({undecidedTicked.length})
                    </Button>
                )}
                <Button size="sm" variant={comparing ? "default" : "outline"} disabled={ticked.length < 2 && !comparing} onClick={() => (comparing ? setComparing(false) : void startCompare())} className="gap-1.5">
                    {comparing ? <X className="h-4 w-4" /> : <Columns3 className="h-4 w-4" />} {comparing ? "Close compare" : `Compare${ticked.length ? ` (${ticked.length})` : ""}`}
                </Button>
            </header>

            {rows.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                    <div className="max-w-sm">
                        <p className="font-medium text-neutral-900 dark:text-white">No results yet</p>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Students send their results after clearing this role&apos;s rounds. Each one appears here with a score per round.</p>
                    </div>
                </div>
            ) : (
                <div className="flex min-h-0 flex-1">
                    <aside className={cn("w-full shrink-0 flex-col border-neutral-200 lg:flex lg:max-w-[26rem] lg:border-r dark:border-neutral-800", mobileDetail ? "hidden" : "flex")}>
                        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800">
                            <span className="w-4" />
                            <span className="flex-1">Candidate</span>
                            {data.columns.map((c) => <span key={c.number} className="w-9 text-right" title={c.title}>{TYPE_SHORT[c.type] ?? c.number}</span>)}
                            <span className="w-8 text-right">Sent</span>
                        </div>
                        <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto" aria-label="Candidates">
                            {shown.length === 0 && <li className="p-4 text-sm text-neutral-500">No one matches the filter.</li>}
                            {shown.map((r) => (
                                <li key={r.id} data-send={r.id}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-current={r.id === selected ? "true" : undefined}
                                        onClick={() => { setComparing(false); setDeciding(null); setMobileDetail(true); void open(r.id) }}
                                        onKeyDown={(e) => { if (e.key === "Enter") void open(r.id) }}
                                        className={cn("flex cursor-pointer items-center gap-2 border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-900", r.id === selected && !comparing ? "bg-neutral-100 dark:bg-neutral-800/70" : "hover:bg-neutral-50 dark:hover:bg-neutral-900")}
                                    >
                                        <span onClick={(e) => e.stopPropagation()} className="flex w-4 items-center">
                                            <Checkbox checked={ticked.includes(r.id)} disabled={r.locked || (!ticked.includes(r.id) && ticked.length >= 3)} onCheckedChange={() => tick(r.id)} aria-label={`Compare ${r.name}`} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5">
                                                {r.status === "SENT" && !r.locked && <span aria-label="New" className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900 dark:bg-white" />}
                                                {r.locked && <Lock aria-hidden className="h-3.5 w-3.5 shrink-0 text-neutral-500" />}
                                                <span className={cn("truncate text-sm text-neutral-900 dark:text-white", r.status === "SENT" && "font-semibold")}>{r.name}</span>
                                                {r.integrity.flagged && <AlertTriangle aria-label={`${r.integrity.pastes} pastes, ${r.integrity.tabLeaves} tab leaves`} className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />}
                                            </span>
                                            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{r.headline}{r.status !== "SENT" && r.status !== "VIEWED" ? ` · ${STATUS[r.status]}` : ""}</span>
                                        </span>
                                        {data.columns.map((c) => {
                                            const s = r.scores[c.number]
                                            return (
                                                <span key={c.number} className="w-9 text-right">
                                                    <span className={cn("block text-sm tabular-nums", s && c.gateMode === "HARD" && s.score >= c.passMark ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-900 dark:text-white")}>{s?.score ?? "-"}</span>
                                                    {s && s.attempt > 1 && <span className="block text-[10px] text-neutral-500">a{s.attempt}</span>}
                                                </span>
                                            )
                                        })}
                                        <span className="w-8 text-right text-xs text-neutral-500 dark:text-neutral-400">{ago(r.sentAt)}</span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <p className="border-t border-neutral-200 px-3 py-2 text-[11px] text-neutral-500 dark:border-neutral-800">Arrow keys move between candidates. Tick up to three to compare.</p>
                    </aside>

                    <section className={cn("min-w-0 flex-1 overflow-y-auto lg:block", mobileDetail || comparing || deciding ? "block" : "hidden")}>
                        {(mobileDetail || comparing || deciding) && (
                            <button type="button" onClick={() => { setMobileDetail(false); setComparing(false); setDeciding(null) }} className="m-3 inline-flex items-center gap-1 text-sm text-neutral-600 lg:hidden dark:text-neutral-300">
                                <ArrowLeft className="h-4 w-4" /> Candidates
                            </button>
                        )}
                        {deciding ? (
                            <DecidePanel
                                key={deciding.ids.join(",") + deciding.decision}
                                candidates={deciding.ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is SendRow => Boolean(r)).map((r) => ({ sendId: r.id, name: r.name, headline: r.headline }))}
                                initial={deciding.decision}
                                canDraft={canDraft}
                                onDecided={onDecided}
                                onClose={() => { setDeciding(null); if (selected) void open(selected) }}
                            />
                        ) : comparing ? (
                            <CompareView columns={data.columns} details={ticked.map((id) => details[id]).filter((d): d is SendDetail => Boolean(d))} jobTitle={data.job.title} />
                        ) : selected && details[selected] ? (
                            <CandidateDetail
                                detail={details[selected]!}
                                jobTitle={data.job.title}
                                canMessage={canMessage}
                                canDecide={canDecide}
                                onDecide={(decision) => setDeciding({ ids: [selected], decision })}
                            />
                        ) : loading ? (
                            <DetailSkeleton />
                        ) : (
                            <p className="p-8 text-sm text-neutral-500">Choose a candidate.</p>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}

function CandidateDetail({ detail, jobTitle, canMessage, canDecide, onDecide }: { detail: SendDetail; jobTitle: string; canMessage: boolean; canDecide: boolean; onDecide: (d: "INVITE" | "DECLINE") => void }) {
    const [tab, setTab] = useState("overview")
    const [composing, setComposing] = useState(false)
    useEffect(() => { setTab("overview"); setComposing(false) }, [detail.id])
    const send = async (text: string) => {
        const r = await messageCandidateAction(detail.id, text)
        if (!r.success) { toast.error(r.error); return false }
        toast.success(`Sent to ${detail.profile.name}. Replies arrive in your Inbox.`)
        setComposing(false)
        return true
    }
    const rounds = detail.snapshot.rounds
    const current = rounds.find((r) => `round-${r.number}` === tab)
    return (
        <div className="mx-auto w-full max-w-3xl space-y-4 p-5">
            {canDecide && (detail.status === "SENT" || detail.status === "VIEWED") && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">Decide on {detail.profile.name.split(" ")[0]}</p>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onDecide("DECLINE")}>Decline</Button>
                        <Button size="sm" onClick={() => onDecide("INVITE")}>Invite</Button>
                    </div>
                </div>
            )}
            {(detail.status === "INVITED" || detail.status === "DECLINED") && <DecisionCard detail={detail} canDecide={canDecide} />}
            {canMessage && composing
                ? <ReplyBox placeholder={`Write to ${detail.profile.name}...`} onSend={send} actionLabel="Send" />
                : (
                    <div className="flex items-center justify-end gap-1">
                        {/* Report the candidate (HR-24); they're never told who reported. */}
                        <ReportDialog kind="STUDENT" name={detail.profile.name} onSubmit={async (reason, details) => {
                            const r = await reportCandidateAction(detail.id, reason, details)
                            return r.success ? null : r.error
                        }} />
                        {canMessage && <Button size="sm" variant="outline" onClick={() => setComposing(true)} className="gap-1.5"><MessageSquare className="h-4 w-4" /> Message {detail.profile.name.split(" ")[0]}</Button>}
                    </div>
                )}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList variant="segmented" size="sm" fit aria-label="Rounds">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {rounds.map((r) => <TabsTrigger key={r.number} value={`round-${r.number}`}>{r.number}. {r.title}</TabsTrigger>)}
                </TabsList>
            </Tabs>
            {current ? (
                <RoundCard round={current} renderDiagram={renderDiagram} />
            ) : (
                <>
                    <ProfileCard companyName={detail.companyName} jobTitle={jobTitle} profile={detail.profile} reusedFromJob={detail.snapshot.reusedFromJob} email={detail.email} />
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {rounds.map((r) => (
                            <li key={r.number}>
                                <button type="button" onClick={() => setTab(`round-${r.number}`)} className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600">
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Round {r.number} · attempt {r.attempt.number} of {r.attempt.of}</p>
                                    <p className="flex items-baseline justify-between gap-2">
                                        <span className="truncate font-medium text-neutral-900 dark:text-white">{r.title}</span>
                                        <span className={cn("text-2xl font-semibold tabular-nums", r.gateMode === "HARD" && r.attempt.passed ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-900 dark:text-white")}>{r.attempt.score}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{r.attempt.integrity.pastes} pastes · {r.attempt.integrity.tabLeaves} tab leaves</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Sent {new Date(detail.sentAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. The candidate agreed to share exactly this.</p>
                </>
            )}
        </div>
    )
}

function CompareView({ columns, details, jobTitle }: { columns: JobSends["columns"]; details: SendDetail[]; jobTitle: string }) {
    const row = (label: string, cell: (d: SendDetail) => React.ReactNode) => (
        <tr className="border-b border-neutral-100 dark:border-neutral-900">
            <th scope="row" className="w-40 px-3 py-2.5 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</th>
            {details.map((d) => <td key={d.id} className="px-3 py-2.5 align-top text-sm text-neutral-900 dark:text-white">{cell(d)}</td>)}
        </tr>
    )
    const roundOf = (d: SendDetail, n: number) => d.snapshot.rounds.find((r) => r.number === n)
    const sum = (d: SendDetail, k: "pastes" | "tabLeaves") => d.snapshot.rounds.reduce((n, r) => n + r.attempt.integrity[k], 0)
    return (
        <div className="p-5">
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">{jobTitle} · comparing {details.length}. Esc to close.</p>
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full min-w-[36rem] table-fixed">
                    <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-800">
                            <th className="w-40" />
                            {details.map((d) => (
                                <th key={d.id} scope="col" className="px-3 py-3 text-left align-top">
                                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{d.profile.name}</p>
                                    <p className="truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">{d.profile.headline}</p>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {columns.map((c) => row(`${c.number}. ${c.title}`, (d) => {
                            const r = roundOf(d, c.number)
                            if (!r) return <span className="text-neutral-400">-</span>
                            const summary = (r.attempt.detail.rubric as { summary?: string } | null | undefined)?.summary
                            return (
                                <div>
                                    <p><span className={cn("text-lg font-semibold tabular-nums", c.gateMode === "HARD" && r.attempt.passed && "text-emerald-700 dark:text-emerald-400")}>{r.attempt.score}</span> <span className="text-xs text-neutral-500">({r.attempt.number}/{r.attempt.of})</span></p>
                                    {summary && <p className="mt-1 line-clamp-3 text-xs text-neutral-600 dark:text-neutral-400">{summary}</p>}
                                </div>
                            )
                        }))}
                        {row("Pastes", (d) => <span className="tabular-nums">{sum(d, "pastes")}</span>)}
                        {row("Tab leaves", (d) => <span className="tabular-nums">{sum(d, "tabLeaves")}</span>)}
                        {row("Education", (d) => <span className="text-xs">{d.profile.education.map((e) => e.institution).join(", ") || "-"}</span>)}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function DetailSkeleton() {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-4 p-5">
            <ShimmerStyles />
            <Shimmer className="h-8 w-80 rounded-lg" />
            <Shimmer className="h-40 w-full rounded-2xl" delay={0.05} />
            <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-24 w-full rounded-2xl" delay={0.08 + i * 0.03} />)}
            </div>
        </div>
    )
}

const OUTCOME_LABEL: Record<string, string> = { INTERVIEWING: "Interviewing", OFFER: "Offer", HIRED: "Hired", NOT_SELECTED: "Not selected" }

/** What was decided, the private note, and the outcome on both sides (HR-19, DoD 17). */
function DecisionCard({ detail, canDecide }: { detail: SendDetail; canDecide: boolean }) {
    const [outcome, setOutcome] = useState(detail.decision.companyOutcome ?? "")
    const [saving, setSaving] = useState(false)
    const invited = detail.status === "INVITED"
    const save = async (value: string) => {
        setOutcome(value)
        setSaving(true)
        const r = await setOutcomeAction(detail.id, value as "INTERVIEWING" | "OFFER" | "HIRED" | "NOT_SELECTED")
        setSaving(false)
        if (!r.success) { toast.error(r.error); setOutcome(detail.decision.companyOutcome ?? ""); return }
        toast.success(`Marked ${OUTCOME_LABEL[value]}. ${detail.profile.name.split(" ")[0]} can see it.`)
    }
    return (
        <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {invited ? "Invited" : "Declined"}{detail.decision.decidedAt ? ` on ${new Date(detail.decision.decidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
            </p>
            {detail.decision.feedback && <p className="whitespace-pre-line rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{detail.decision.feedback}</p>}
            {detail.decision.note && <p className="text-xs text-neutral-500 dark:text-neutral-400">Team note (private): {detail.decision.note}</p>}
            {invited && (
                <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
                    <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                        Outcome
                        <select value={outcome} disabled={!canDecide || saving} onChange={(e) => void save(e.target.value)} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-950">
                            <option value="" disabled>Choose</option>
                            {Object.entries(OUTCOME_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </label>
                    {saving && <InlineLoader size="sm" />}
                    <span className="text-neutral-500 dark:text-neutral-400">Candidate says: {detail.decision.studentOutcome ? OUTCOME_LABEL[detail.decision.studentOutcome] : "nothing yet"}</span>
                </div>
            )}
        </section>
    )
}
