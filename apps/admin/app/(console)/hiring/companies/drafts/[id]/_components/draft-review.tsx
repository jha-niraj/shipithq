"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowUpRight, CircleAlert, FileText, Globe, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Switch } from "@repo/ui/components/ui/switch"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@/lib/utils"
import {
    discardCompanyDraft, getCompanyDraft, publishCompanyDraft,
    type DraftDetail, type PublishInput,
} from "@/actions/hiring/company-drafts.action"

/*
 * One draft, field by field (plan/hiring-rounds HR-6). Every field the worker
 * drafted arrives with the page it came from; the admin edits the value, keeps
 * or drops it, and publishes. Fields the draft lacks are shown empty and can be
 * written by hand; typing into one keeps it. Name and description are required.
 */

const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL ?? ""

type Key = keyof PublishInput
const FIELDS: { key: Key; label: string; kind: "text" | "long" | "list"; required?: boolean; hint?: string }[] = [
    { key: "name", label: "Name", kind: "text", required: true },
    { key: "description", label: "Description", kind: "long", required: true },
    { key: "industry", label: "Industry", kind: "text" },
    { key: "size", label: "Size", kind: "text" },
    { key: "locations", label: "Locations", kind: "list", hint: "One per line. The first is shown as headquarters." },
    { key: "techStack", label: "Tech stack", kind: "list", hint: "One per line." },
    { key: "culture", label: "Culture", kind: "long" },
    { key: "benefits", label: "Benefits", kind: "list", hint: "One per line." },
    { key: "careersUrl", label: "Careers page", kind: "text" },
]

const REASON: Record<string, string> = {
    not_cited: "cited a page that was not read",
    not_on_page: "not found on the page it cited",
    personal_data: "contained an email or phone number",
    not_a_careers_page: "not a careers page",
    not_an_employer_page: "came from a customer-facing page",
    empty: "empty",
}

type Row = { value: string; keep: boolean; source: string | null }

function initialRows(draft: DraftDetail): Record<Key, Row> {
    const f = draft.fields
    const one = (k: keyof typeof f) => {
        const x = f[k] as { value: string | string[]; sourceUrl: string } | undefined
        if (!x) return { value: "", keep: false, source: null }
        return { value: Array.isArray(x.value) ? x.value.join("\n") : x.value, keep: true, source: x.sourceUrl }
    }
    const rows = Object.fromEntries(FIELDS.map((d) => [d.key, one(d.key as keyof typeof f)])) as Record<Key, Row>
    // Required fields are always kept; a missing name falls back to the domain.
    if (!rows.name.value) rows.name = { value: draft.domain.split(".")[0]!.replace(/^./, (c) => c.toUpperCase()), keep: true, source: null }
    rows.name.keep = true
    rows.description.keep = true
    return rows
}

const shortUrl = (url: string, domain: string) => {
    try {
        const u = new URL(url)
        const host = u.hostname.replace(/^www\./, "")
        const path = u.pathname.replace(/\/$/, "") || "/"
        return host === domain ? path : `${host.replace(`.${domain}`, "")}${path === "/" ? "" : path}`
    } catch {
        return url
    }
}

export function DraftReview({ draft: initial }: { draft: DraftDetail }) {
    const router = useRouter()
    const [draft, setDraft] = useState(initial)
    const [rows, setRows] = useState(() => initialRows(initial))
    const [confirmDiscard, setConfirmDiscard] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const editable = draft.status === "READY"

    // A draft still being read refreshes itself until it lands.
    useEffect(() => {
        if (draft.status !== "SCRAPING") return
        const t = window.setInterval(async () => {
            const r = await getCompanyDraft(draft.id)
            if (r.success && r.data.status !== "SCRAPING") {
                setDraft(r.data)
                setRows(initialRows(r.data))
            }
        }, 4000)
        return () => window.clearInterval(t)
    }, [draft.status, draft.id])

    const set = (key: Key, patch: Partial<Row>) => setRows((r) => ({ ...r, [key]: { ...r[key], ...patch } }))
    const keptCount = useMemo(() => FIELDS.filter((f) => rows[f.key].keep && rows[f.key].value.trim()).length, [rows])

    const publish = () => startTransition(async () => {
        setError(null)
        const val = (k: Key) => (rows[k].keep ? rows[k].value.trim() : "")
        const list = (k: Key) => (rows[k].keep ? rows[k].value.split("\n").map((x) => x.trim()).filter(Boolean) : [])
        const r = await publishCompanyDraft(draft.id, {
            name: val("name"),
            description: val("description"),
            industry: val("industry") || undefined,
            size: val("size") || undefined,
            locations: list("locations"),
            techStack: list("techStack"),
            culture: val("culture") || undefined,
            benefits: list("benefits"),
            careersUrl: val("careersUrl") || undefined,
        })
        if (!r.success) { setError(r.error); return }
        toast.success(`${val("name")} is live as an unclaimed page`)
        setDraft((d) => ({ ...d, status: "PUBLISHED", companyId: r.data.companyId, companySlug: r.data.slug }))
    })

    const discard = () => startTransition(async () => {
        const r = await discardCompanyDraft(draft.id, draft.request ? rejectReason : undefined)
        if (!r.success) { setError(r.error); return }
        toast.success(draft.request ? "Request rejected; the students were told why" : "Draft discarded")
        router.push("/hiring/companies/drafts")
    })

    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <Link href="/hiring/companies/drafts" className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <ArrowLeft className="h-4 w-4" /> Back to drafts
                </Link>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-3 rounded-full bg-neutral-900 dark:bg-white" />
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{draft.domain}</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {draft.status === "SCRAPING" ? "Reading the site" : draft.status.charAt(0) + draft.status.slice(1).toLowerCase()}
                                {draft.status !== "SCRAPING" && <> · {draft.pageCount} pages read · {draft.dropped.length} dropped by checks</>}
                                {draft.degraded && " · partial"}
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto">
                        <a href={`https://${draft.domain}`} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Open site</a>
                    </Button>
                </div>
            </div>

            {draft.request && (draft.status === "READY" || draft.status === "FAILED") && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <p>
                        <span className="font-medium text-neutral-900 dark:text-white">{draft.request.votes} {draft.request.votes === 1 ? "student" : "students"}</span> asked for {draft.request.name}.
                        Publishing makes them follow it and tells them by notification and email; discarding tells them why.
                    </p>
                </div>
            )}

            {draft.status === "SCRAPING" && (
                <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    <InlineLoader size="md" /> Reading {draft.domain}. This page updates when the draft is ready.
                </div>
            )}

            {draft.status === "FAILED" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <p className="flex items-start gap-2 text-sm text-rose-800 dark:text-rose-300">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {draft.error ?? "The site could not be read."}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Retry it from the drafts list, or discard it.</p>
                </div>
            )}

            {draft.status === "PUBLISHED" && (
                <div className="mb-6 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <span>Published as an unclaimed page, labelled &quot;Unclaimed - not affiliated with ShipItHQ&quot;.</span>
                    {draft.companySlug && MAIN_URL && (
                        <a href={`${MAIN_URL}/companies/${draft.companySlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
                            View the page <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>
            )}

            {(draft.status === "READY" || draft.status === "PUBLISHED" || draft.status === "DISCARDED") && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="hidden grid-cols-[9rem_minmax(0,1fr)_8rem_3.5rem] gap-4 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500 md:grid dark:bg-neutral-800/50">
                            <span>Field</span><span>Value</span><span>Source</span><span className="text-right">Keep</span>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {FIELDS.map((f) => {
                                const row = rows[f.key]
                                return (
                                    <div key={f.key} className={cn("grid grid-cols-1 gap-2 px-4 py-4 md:grid-cols-[9rem_minmax(0,1fr)_8rem_3.5rem] md:gap-4", !row.keep && "opacity-60")}>
                                        <label htmlFor={`f-${f.key}`} className="pt-2 text-sm font-medium text-neutral-900 dark:text-white">
                                            {f.label}{f.required && <span className="text-neutral-400"> *</span>}
                                        </label>
                                        <div className="min-w-0">
                                            {f.kind === "text" ? (
                                                <Input
                                                    id={`f-${f.key}`}
                                                    value={row.value}
                                                    disabled={!editable}
                                                    onChange={(e) => set(f.key, { value: e.target.value, keep: f.required || row.keep || e.target.value.trim() !== "" })}
                                                />
                                            ) : (
                                                <Textarea
                                                    id={`f-${f.key}`}
                                                    value={row.value}
                                                    disabled={!editable}
                                                    rows={f.kind === "long" ? 4 : Math.min(6, Math.max(2, row.value.split("\n").length))}
                                                    onChange={(e) => set(f.key, { value: e.target.value, keep: f.required || row.keep || e.target.value.trim() !== "" })}
                                                />
                                            )}
                                            {f.hint && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{f.hint}</p>}
                                        </div>
                                        <div className="min-w-0 pt-2 text-sm">
                                            {row.source ? (
                                                <a href={row.source} target="_blank" rel="noopener noreferrer" title={row.source} className="inline-flex max-w-full items-center gap-1 truncate text-neutral-600 hover:underline dark:text-neutral-300">
                                                    <span className="truncate font-mono text-xs">{shortUrl(row.source, draft.domain)}</span>
                                                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-neutral-400">{row.value ? "Written by hand" : "-"}</span>
                                            )}
                                        </div>
                                        <div className="flex items-start pt-1.5 md:justify-end">
                                            <Switch
                                                checked={row.keep}
                                                disabled={!editable || f.required}
                                                onCheckedChange={(v) => set(f.key, { keep: v })}
                                                aria-label={`Keep ${f.label}`}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {draft.dropped.length > 0 && (
                            <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/30">
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500">Dropped by the checks</p>
                                <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                                    {draft.dropped.map((d, i) => (
                                        <li key={i}><span className="font-medium text-neutral-800 dark:text-neutral-200">{d.field}</span>: {REASON[d.reason] ?? d.reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {editable && (
                            <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    {confirmDiscard ? (
                                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                                            {draft.request && (
                                                <Input
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="Why it isn't being added (the students see this)"
                                                    maxLength={300}
                                                    className="sm:w-80"
                                                    aria-label="Reason for not adding"
                                                />
                                            )}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                    onClick={discard}
                                                    disabled={pending || (Boolean(draft.request) && rejectReason.trim().length < 5)}
                                                >
                                                    {draft.request ? "Reject request" : "Discard for good"}
                                                </Button>
                                                <Button variant="ghost" onClick={() => setConfirmDiscard(false)} disabled={pending}>Keep</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="outline" onClick={() => setConfirmDiscard(true)} disabled={pending}>Discard</Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{keptCount} of {FIELDS.length} fields</span>
                                    <Button onClick={publish} disabled={pending || !rows.name.value.trim() || !rows.description.value.trim()} className="gap-2">
                                        {pending && <InlineLoader size="sm" />}
                                        Publish unclaimed page
                                    </Button>
                                </div>
                            </div>
                        )}
                        {error && (
                            <p role="alert" className="flex items-start gap-2 border-t border-neutral-200 px-4 py-3 text-sm text-rose-700 dark:border-neutral-800 dark:text-rose-400">
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                            </p>
                        )}
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Pages read</p>
                            <ul className="space-y-2">
                                {draft.sourcePages.map((p) => (
                                    <li key={p.url} className="min-w-0">
                                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-start gap-2 text-sm">
                                            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                            <span className="min-w-0">
                                                <span className="block truncate text-neutral-900 group-hover:underline dark:text-white">{p.title || shortUrl(p.url, draft.domain)}</span>
                                                <span className="block truncate font-mono text-xs text-neutral-500">{shortUrl(p.url, draft.domain)}</span>
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {(draft.failedUrls.length > 0 || draft.robotsSkipped.length > 0) && (
                            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                                {draft.failedUrls.length > 0 && (
                                    <>
                                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Could not read</p>
                                        <ul className="mb-3 space-y-1">{draft.failedUrls.map((u) => <li key={u} className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{shortUrl(u, draft.domain)}</li>)}</ul>
                                    </>
                                )}
                                {draft.robotsSkipped.length > 0 && (
                                    <>
                                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Skipped for robots.txt</p>
                                        <ul className="space-y-1">{draft.robotsSkipped.map((u) => <li key={u} className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{shortUrl(u, draft.domain)}</li>)}</ul>
                                    </>
                                )}
                            </div>
                        )}
                        <p className="px-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                            Publishing creates a page labelled &quot;Unclaimed - not affiliated with ShipItHQ&quot;, with no logo. Each kept field keeps its source, and the public page cites it.
                        </p>
                    </aside>
                </div>
            )}

            {draft.status === "FAILED" && (
                <div className="mt-4">
                    {confirmDiscard ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            {draft.request && (
                                <Input
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Why it isn't being added (the students see this)"
                                    maxLength={300}
                                    className="sm:w-80"
                                    aria-label="Reason for not adding"
                                />
                            )}
                            <div className="flex gap-2">
                                <Button variant="outline" className="border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-400" onClick={discard} disabled={pending || (Boolean(draft.request) && rejectReason.trim().length < 5)}>
                                    {draft.request ? "Reject request" : "Discard for good"}
                                </Button>
                                <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>Keep</Button>
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setConfirmDiscard(true)}>Discard</Button>
                    )}
                </div>
            )}
        </div>
    )
}
