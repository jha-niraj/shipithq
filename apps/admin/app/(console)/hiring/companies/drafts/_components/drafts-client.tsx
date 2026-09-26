"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CheckCircle, CircleAlert, FileSearch, Globe, Hourglass, RotateCcw, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@/lib/utils"
import {
    listCompanyDrafts, startCompanyScrape, type DraftRow, type DraftStatus,
} from "@/actions/hiring/company-drafts.action"

/*
 * Hiring > Companies > Drafts (plan/hiring-rounds HR-6). An admin enters a
 * company's website; the worker reads it into a draft; the admin reviews and
 * publishes it as an unclaimed page. The list polls while a scrape is running.
 */

const POLL_MS = 4000
const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL ?? ""

const STATUS_LABEL: Record<DraftStatus, string> = {
    SCRAPING: "Reading site",
    READY: "Ready to review",
    FAILED: "Failed",
    PUBLISHED: "Published",
    DISCARDED: "Discarded",
}

export function DraftsClient({ initialDrafts, initialCounts, loadError }: {
    initialDrafts: DraftRow[]
    initialCounts: Record<DraftStatus, number>
    loadError: string | null
}) {
    const [drafts, setDrafts] = useState(initialDrafts)
    const [counts, setCounts] = useState(initialCounts)
    const [url, setUrl] = useState("")
    const [notice, setNotice] = useState<{ kind: "exists"; name: string; slug: string } | { kind: "error"; message: string } | null>(null)
    const [starting, startTransition] = useTransition()

    const refresh = useCallback(async () => {
        const r = await listCompanyDrafts()
        if (r.success) {
            setDrafts(r.data.drafts)
            setCounts(r.data.counts)
        }
    }, [])

    // Poll only while something is being read.
    const scraping = drafts.some((d) => d.status === "SCRAPING")
    useEffect(() => {
        if (!scraping) return
        const t = window.setInterval(() => void refresh(), POLL_MS)
        return () => window.clearInterval(t)
    }, [scraping, refresh])

    const start = (value: string) => startTransition(async () => {
        setNotice(null)
        const r = await startCompanyScrape(value)
        if (!r.success) { setNotice({ kind: "error", message: r.error }); return }
        if ("existingCompany" in r.data) {
            setNotice({ kind: "exists", name: r.data.existingCompany.name, slug: r.data.existingCompany.slug })
            return
        }
        setUrl("")
        toast.success("Reading the site", { description: "The draft appears below when it's ready, usually within a minute." })
        await refresh()
    })

    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <Link href="/hiring/companies" className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Companies
                </Link>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-3 rounded-full bg-neutral-900 dark:bg-white" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Company drafts</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">
                            Unclaimed company pages, read from each company&apos;s own website and reviewed before they go live.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add from website */}
            <form
                onSubmit={(e) => { e.preventDefault(); if (url.trim()) start(url) }}
                className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
                <label htmlFor="company-url" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">Add from website</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                            id="company-url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="acme.io or https://acme.io"
                            className="pl-9"
                            autoComplete="off"
                            disabled={starting}
                        />
                    </div>
                    <Button type="submit" disabled={starting || !url.trim()} className="gap-2">
                        {starting && <InlineLoader size="sm" />}
                        Read the site
                    </Button>
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    Reads up to 12 of the company&apos;s own pages (about, careers, team). LinkedIn and other social profiles are refused.
                </p>
                {notice?.kind === "error" && (
                    <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-400">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {notice.message}
                    </p>
                )}
                {notice?.kind === "exists" && (
                    <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <span className="font-medium">{notice.name}</span> already has this domain, so no draft was made.{" "}
                        {MAIN_URL && (
                            <a href={`${MAIN_URL}/companies/${notice.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium underline-offset-4 hover:underline">
                                Open its page <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </p>
                )}
            </form>

            <StatBand
                className="mb-6"
                cols={4}
                items={[
                    { icon: Hourglass, label: "Reading", value: counts.SCRAPING },
                    { icon: FileSearch, label: "Ready to review", value: counts.READY },
                    { icon: CheckCircle, label: "Published", value: counts.PUBLISHED, tone: counts.PUBLISHED ? "emerald" : "neutral" },
                    { icon: CircleAlert, label: "Failed", value: counts.FAILED, tone: counts.FAILED ? "rose" : "neutral" },
                ]}
            />

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                            <tr>
                                {["Domain", "Status", "Asked by", "Pages", "Fields", "Started", ""].map((h, i) => (
                                    <th key={i} className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500", i === 6 ? "text-right" : "text-left")}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {loadError ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-rose-700 dark:text-rose-400">{loadError}</td></tr>
                            ) : drafts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                                        <FileSearch className="mx-auto mb-2 h-8 w-8 opacity-30" />
                                        <p>No drafts yet. Add a company from its website above.</p>
                                    </td>
                                </tr>
                            ) : drafts.map((d) => (
                                <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                    <td className="max-w-[22rem] px-4 py-4">
                                        <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-900 hover:underline dark:text-white">
                                            {d.domain}
                                        </a>
                                        {d.status === "FAILED" && d.error && (
                                            <p className="mt-1 line-clamp-2 text-xs text-rose-700 dark:text-rose-400">{d.error}</p>
                                        )}
                                        {d.status === "READY" && d.degraded && (
                                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Partial: some pages could not be read.</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusPill status={d.status} />
                                    </td>
                                    <td className="px-4 py-4 text-sm">
                                        {d.request ? (
                                            <span className="inline-flex items-center gap-1.5 text-neutral-900 dark:text-white" title={`Students asked for ${d.request.name}`}>
                                                <Users className="h-3.5 w-3.5 text-neutral-500" />
                                                <span className="font-mono">{d.request.votes}</span>
                                                <span className="text-neutral-500">{d.request.votes === 1 ? "student" : "students"}</span>
                                            </span>
                                        ) : (
                                            <span className="text-neutral-400">Admin</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-sm text-neutral-900 dark:text-white">{d.status === "SCRAPING" ? "-" : d.pageCount}</td>
                                    <td className="px-4 py-4 font-mono text-sm text-neutral-900 dark:text-white">{d.status === "SCRAPING" ? "-" : d.fieldCount}</td>
                                    <td className="px-4 py-4 text-sm text-neutral-500">
                                        {new Date(d.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <RowAction draft={d} onRetry={() => start(d.domain)} busy={starting} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function StatusPill({ status }: { status: DraftStatus }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
            status === "FAILED" ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                : status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : status === "DISCARDED" ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                        : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100",
        )}>
            {status === "SCRAPING" && <InlineLoader size="sm" />}
            {STATUS_LABEL[status]}
        </span>
    )
}

function RowAction({ draft, onRetry, busy }: { draft: DraftRow; onRetry: () => void; busy: boolean }) {
    if (draft.status === "READY") {
        return <Button asChild size="sm"><Link href={`/hiring/companies/drafts/${draft.id}`}>Review</Link></Button>
    }
    if (draft.status === "FAILED") {
        return (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry} disabled={busy}>
                <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
        )
    }
    if (draft.status === "PUBLISHED" && draft.companySlug && MAIN_URL) {
        return (
            <Button asChild size="sm" variant="ghost" className="gap-1">
                <a href={`${MAIN_URL}/companies/${draft.companySlug}`} target="_blank" rel="noopener noreferrer">View page <ArrowUpRight className="h-3.5 w-3.5" /></a>
            </Button>
        )
    }
    if (draft.status === "SCRAPING") return <span className="text-xs text-neutral-500 dark:text-neutral-400">Usually under a minute</span>
    return <Button asChild size="sm" variant="ghost"><Link href={`/hiring/companies/drafts/${draft.id}`}>Open</Link></Button>
}
