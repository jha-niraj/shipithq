"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Check, FileText, Link2, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import {
    searchReportCompanies, searchReportLinks, submitReport,
    type ReportCompanyHit, type ReportLinkHit,
} from "@/actions/(main)/companies/reports.action"
import {
    REPORT_LEVELS, REPORT_LEVEL_LABEL, REPORT_OUTCOMES, REPORT_OUTCOME_LABEL, REPORT_ROLE_FAMILIES, REPORT_ROLE_FAMILY_LABEL,
    REPORT_ROUND_LABEL, REPORT_ROUND_TYPES,
    type ReportLevel, type ReportOutcome, type ReportRoleFamily, type ReportRoundType,
} from "@/lib/interview-reports/types"

/*
 * Report a real interview (plan/competition/skillmeet CMP-1): the company, role,
 * month and outcome, then the rounds in order with the questions asked. One
 * sheet, opened from the company page, a pending company's page, an imported
 * job's page (prefilled) and My rounds (with a company search). An admin reviews
 * it; only aggregates are ever public.
 */

type Company = { companyId: string | null; companyRequestId: string | null; name: string }
type Question = { key: number; text: string; link: ReportLinkHit | null }
type Round = { key: number; type: ReportRoundType | ""; title: string; minutes: string; questions: Question[] }

/** Round types whose questions can be linked to our banks. */
const LINKABLE: Partial<Record<ReportRoundType, "PROBLEM" | "APTITUDE">> = { DSA: "PROBLEM", ONLINE_ASSESSMENT: "PROBLEM", TECHNICAL: "PROBLEM", APTITUDE: "APTITUDE" }

let seq = 0
const next = () => ++seq
const newQuestion = (): Question => ({ key: next(), text: "", link: null })
const newRound = (): Round => ({ key: next(), type: "", title: "", minutes: "", questions: [newQuestion()] })
const thisMonth = () => new Date().toISOString().slice(0, 7)

export interface ReportPrefill {
    company?: Company
    importedJobId?: string
    role?: string
    level?: ReportLevel
}

export function ReportInterviewButton({ prefill, label = "Report your interview", variant = "outline", size = "sm", className }: {
    prefill?: ReportPrefill
    label?: string
    variant?: "outline" | "default" | "ghost"
    size?: "sm" | "default"
    className?: string
}) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button variant={variant} size={size} className={cn("gap-1.5", className)} onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4" /> {label}
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>Report your interview</SheetTitle>
                        <SheetDescription>
                            The rounds you took and what they asked. It helps the next student prepare: only totals are ever shown (&quot;reported 4 times&quot;), never your report. An admin reviews it; approved reports earn 10 credits.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="px-4 pb-6">{open && <ReportForm prefill={prefill} onDone={() => setOpen(false)} />}</div>
                </SheetContent>
            </Sheet>
        </>
    )
}

function ReportForm({ prefill, onDone }: { prefill?: ReportPrefill; onDone: () => void }) {
    const [company, setCompany] = useState<Company | null>(prefill?.company ?? null)
    const [role, setRole] = useState(prefill?.role ?? "")
    const [month, setMonth] = useState(thisMonth())
    const [outcome, setOutcome] = useState<ReportOutcome | "">("")
    const [family, setFamily] = useState<ReportRoleFamily | "">("")
    const [level, setLevel] = useState<ReportLevel | "">(prefill?.level ?? "")
    const [rounds, setRounds] = useState<Round[]>([newRound()])
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(false)

    const setRound = (key: number, patch: Partial<Round>) => setRounds((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    const move = (i: number, d: -1 | 1) => setRounds((rs) => {
        const j = i + d
        if (j < 0 || j >= rs.length) return rs
        const copy = [...rs]
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
        return copy
    })
    const ready = company && role.trim().length >= 2 && family && level && month && outcome && rounds.length > 0 && rounds.every((r) => r.type)

    const submit = async () => {
        if (!company || !outcome || !family || !level) return
        setBusy(true)
        const r = await submitReport({
            companyId: company.companyId ?? undefined,
            companyRequestId: company.companyRequestId ?? undefined,
            importedJobId: prefill?.importedJobId,
            role,
            roleFamily: family,
            level,
            month,
            outcome,
            rounds: rounds.map((x) => ({
                type: x.type as ReportRoundType,
                title: x.title,
                minutes: x.minutes ? Number(x.minutes) : null,
                questions: x.questions.filter((q) => q.text.trim()).map((q) => ({
                    text: q.text,
                    practiceProblemId: q.link?.kind === "PROBLEM" ? q.link.id : null,
                    aptitudeQuestionId: q.link?.kind === "APTITUDE" ? q.link.id : null,
                })),
            })),
        })
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setSent(true)
    }

    if (sent) {
        return (
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="flex items-center gap-2 font-medium text-neutral-900 dark:text-white"><Check className="h-4 w-4" /> Thanks. Your report is with ShipItHQ.</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">An admin reviews it, usually within a few days. You&apos;ll hear either way; an approved report earns 10 credits. Follow it under My rounds.</p>
                <Button size="sm" variant="outline" onClick={onDone}>Done</Button>
            </div>
        )
    }

    return (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) void submit() }}>
            <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Company</p>
                {company ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                        <span className="text-neutral-900 dark:text-white">{company.name}{company.companyRequestId && <span className="text-neutral-500"> (under review)</span>}</span>
                        {!prefill?.company && <Button type="button" variant="ghost" size="sm" onClick={() => setCompany(null)}>Change</Button>}
                    </div>
                ) : (
                    <CompanySearch onPick={setCompany} />
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="rep-role" className="text-sm font-medium text-neutral-900 dark:text-white">Role</label>
                    <Input id="rep-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="e.g. SDE 1, Backend" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="rep-month" className="text-sm font-medium text-neutral-900 dark:text-white">When</label>
                    <Input id="rep-month" type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Kind of role</p>
                    <Select value={family} onValueChange={(v) => setFamily(v as ReportRoleFamily)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose one" /></SelectTrigger>
                        <SelectContent>{REPORT_ROLE_FAMILIES.map((f) => <SelectItem key={f} value={f}>{REPORT_ROLE_FAMILY_LABEL[f]}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Level</p>
                    <Select value={level} onValueChange={(v) => setLevel(v as ReportLevel)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose one" /></SelectTrigger>
                        <SelectContent>{REPORT_LEVELS.map((l) => <SelectItem key={l} value={l}>{REPORT_LEVEL_LABEL[l]}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">How it ended</p>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as ReportOutcome)}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{REPORT_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{REPORT_OUTCOME_LABEL[o]}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Rounds, in order</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">What each round was and what they asked. Leave out names, emails and phone numbers; don&apos;t paste a test the company told you to keep confidential.</p>
                </div>
                <ol className="space-y-3">
                    {rounds.map((r, i) => (
                        <li key={r.key} className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-neutral-500">{i + 1}</span>
                                <Select value={r.type} onValueChange={(v) => setRound(r.key, { type: v as ReportRoundType })}>
                                    <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Kind of round" /></SelectTrigger>
                                    <SelectContent>{REPORT_ROUND_TYPES.map((t) => <SelectItem key={t} value={t}>{REPORT_ROUND_LABEL[t]}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input className="h-8 w-24 text-sm" type="number" min={1} max={600} value={r.minutes} onChange={(e) => setRound(r.key, { minutes: e.target.value })} placeholder="Minutes" aria-label="Minutes" />
                                <span className="ml-auto flex items-center">
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === rounds.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={rounds.length === 1} onClick={() => setRounds((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove round"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </span>
                            </div>
                            <Input className="h-8 text-sm" value={r.title} maxLength={80} onChange={(e) => setRound(r.key, { title: e.target.value })} placeholder="Title, if it had one (optional)" />
                            <div className="space-y-2">
                                {r.questions.map((q) => (
                                    <QuestionRow
                                        key={q.key}
                                        question={q}
                                        linkKind={r.type ? LINKABLE[r.type] : undefined}
                                        onChange={(patch) => setRound(r.key, { questions: r.questions.map((x) => (x.key === q.key ? { ...x, ...patch } : x)) })}
                                        onRemove={() => setRound(r.key, { questions: r.questions.filter((x) => x.key !== q.key) })}
                                    />
                                ))}
                                {r.questions.length < 10 && (
                                    <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setRound(r.key, { questions: [...r.questions, newQuestion()] })}>
                                        <Plus className="h-3.5 w-3.5" /> Add a question
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
                {rounds.length < 8 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setRounds((rs) => [...rs, newRound()])}>
                        <Plus className="h-3.5 w-3.5" /> Add a round
                    </Button>
                )}
            </div>

            <Button type="submit" disabled={!ready || busy} className="gap-1.5">{busy && <InlineLoader size="sm" />} Send the report</Button>
        </form>
    )
}

function QuestionRow({ question: q, linkKind, onChange, onRemove }: { question: Question; linkKind?: "PROBLEM" | "APTITUDE"; onChange: (p: Partial<Question>) => void; onRemove: () => void }) {
    const [linking, setLinking] = useState(false)
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <Input className="h-8 text-sm" value={q.text} maxLength={600} onChange={(e) => onChange({ text: e.target.value })} placeholder="What they asked, in a line" />
                {linkKind && !q.link && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLinking((v) => !v)} aria-label={linkKind === "PROBLEM" ? "Link a coding problem" : "Link an aptitude question"}>
                        <Link2 className="h-3.5 w-3.5" />
                    </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove} aria-label="Remove question"><X className="h-3.5 w-3.5" /></Button>
            </div>
            {q.link && (
                <p className="flex items-center gap-1.5 pl-1 text-xs text-neutral-600 dark:text-neutral-400">
                    <Link2 className="h-3 w-3" /> Same as {q.link.label}
                    <button type="button" className="underline underline-offset-2" onClick={() => onChange({ link: null })}>remove</button>
                </p>
            )}
            {linking && linkKind && !q.link && (
                <LinkSearch kind={linkKind} onPick={(link) => { onChange({ link }); setLinking(false) }} />
            )}
        </div>
    )
}

/** Debounced search, shared by the company and link pickers. */
function useSearch<T>(query: string, run: (q: string) => Promise<{ success: true; data: T[] } | { success: false; error: string }>) {
    const [hits, setHits] = useState<T[]>([])
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) { setHits([]); return }
        let live = true
        setLoading(true)
        const t = setTimeout(async () => {
            const r = await run(q)
            if (!live) return
            setLoading(false)
            setHits(r.success ? r.data : [])
        }, 300)
        return () => { live = false; clearTimeout(t) }
        // `run` is a stable server action reference.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])
    return { hits, loading }
}

function LinkSearch({ kind, onPick }: { kind: "PROBLEM" | "APTITUDE"; onPick: (l: ReportLinkHit) => void }) {
    const [q, setQ] = useState("")
    const { hits, loading } = useSearch(q, (x) => searchReportLinks(kind, x))
    return (
        <div className="space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
            <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-neutral-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="h-7 flex-1 bg-transparent text-sm outline-none" placeholder={kind === "PROBLEM" ? "Find the same problem on ShipItHQ" : "Find the same aptitude question"} />
                {loading && <InlineLoader size="sm" />}
            </div>
            {hits.map((h) => (
                <button key={h.id} type="button" onClick={() => onPick(h)} className="block w-full rounded-md px-2 py-1 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">{h.label}</button>
            ))}
        </div>
    )
}

function CompanySearch({ onPick }: { onPick: (c: Company) => void }) {
    const [q, setQ] = useState("")
    const { hits, loading } = useSearch<ReportCompanyHit>(q, searchReportCompanies)
    return (
        <div className="space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
            <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-neutral-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="h-7 flex-1 bg-transparent text-sm outline-none" placeholder="Search for the company" />
                {loading && <InlineLoader size="sm" />}
            </div>
            {hits.map((h) => (
                <button key={h.companyId ?? h.companyRequestId} type="button" onClick={() => onPick(h)} className="block w-full rounded-md px-2 py-1 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                    {h.name}{h.pending && <span className="text-neutral-500"> (under review)</span>}
                </button>
            ))}
            {q.trim().length >= 2 && !loading && hits.length === 0 && (
                <p className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">Not on ShipItHQ yet. <Link href="/companies/request" className="underline underline-offset-2">Ask for it to be added</Link>, then report your interview from its page.</p>
            )}
        </div>
    )
}
