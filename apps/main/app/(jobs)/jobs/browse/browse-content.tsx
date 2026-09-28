"use client"

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Briefcase, Sparkles } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import {
    Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@repo/ui/components/ui/pagination"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/sonner"
import { toggleSaveJob, type BrowseFacets, type BrowseResult, type FeedJobResult } from "@/actions/jobs"
import { BROWSE_PAGE_SIZE, activeFilterCount, browseQuery, jobMatches, type BrowseParams } from "@/lib/jobs/browse-params"
import { JobCard } from "../components/job-card"
import { JobDetailsSheet } from "../components/job-details-sheet"
import { BrowseFilters } from "./browse-filters"
import { BrowseListSkeleton } from "./loading"

/*
 * Browse all jobs (plan/jobs-polish JP-22): the page is a column the height left under the
 * jobs header. The header and the filters at the top, the list in its own ScrollArea (so no
 * job scrolls up behind the filters), and the count with numbered pages pinned at the bottom.
 * Filters, sort and page are the URL: a change replaces it and the server renders the page.
 */

export function BrowseContent({ params, result, facets, signedIn }: {
    params: BrowseParams
    result: BrowseResult | null
    facets: BrowseFacets
    signedIn: boolean
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    // What the student just chose, shown at once; the URL's params once the server answers (JP-26).
    const [shown, setShown] = useOptimistic(params)
    const [jobs, setJobs] = useState<FeedJobResult[]>(result?.jobs ?? [])
    useEffect(() => { setJobs(result?.jobs ?? []) }, [result])
    // By id, so the sheet's Save follows the list after a toggle.
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selected = jobs.find((j) => j.id === selectedId) ?? null

    const go = useCallback((next: Partial<BrowseParams>, keepPage = false) => {
        const merged = { ...shown, ...next, page: keepPage ? next.page ?? shown.page : 1 }
        startTransition(() => {
            setShown(merged)
            router.replace(`/jobs/browse${browseQuery(merged, signedIn)}`, { scroll: false })
        })
    }, [shown, setShown, router, signedIn])

    const onSave = useCallback(async (jobId: string) => {
        if (!signedIn) { toast.info("Sign in to save jobs"); return }
        const r = await toggleSaveJob(jobId)
        if (!r.success) { toast.error("Couldn't save that job. Try again."); return }
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, isSaved: r.saved ?? false } : j)))
    }, [signedIn])

    const total = result?.total ?? 0
    const page = result?.page ?? 1
    const totalPages = result?.totalPages ?? 1
    const filtered = activeFilterCount(shown) > 0 || !!shown.q
    // While the server works: a filter narrows the jobs already here; a page turn has no rows yet.
    const turningPage = pending && shown.page !== params.page
    const visible = pending ? jobs.filter((j) => jobMatches(j, shown)) : jobs
    const from = total ? (page - 1) * BROWSE_PAGE_SIZE + 1 : 0
    const to = Math.min(page * BROWSE_PAGE_SIZE, total)

    return (
        <div className="page-frame flex h-[calc(var(--page-h,100dvh)-var(--jobs-header-h,56px))] min-h-[32rem] flex-col px-page pt-5">
            <div className="shrink-0 space-y-4">
                <PageHeader
                    title="Browse all jobs"
                    subtitle={filtered ? `${total} ${total === 1 ? "job matches" : "jobs match"} your search` : `${total} open ${total === 1 ? "job" : "jobs"}`}
                    actions={
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link href="/jobs"><Sparkles className="h-3.5 w-3.5" /> Spark picks</Link>
                        </Button>
                    }
                />
                <BrowseFilters params={shown} facets={facets} signedIn={signedIn} onChange={(n) => go(n)} />
            </div>

            <ScrollArea className="mt-4 min-h-0 flex-1" reflow>
                <div className="space-y-3 pb-4" aria-busy={pending}>
                    {turningPage ? (
                        <BrowseListSkeleton />
                    ) : !result ? (
                        <Empty title="Couldn't load jobs" body="Something went wrong on our side. Try again in a moment." />
                    ) : visible.length === 0 ? (
                        pending ? <BrowseListSkeleton count={2} /> :
                        filtered
                            ? <Empty title="No jobs match" body="Try fewer filters or a shorter search." action={<Button variant="outline" size="sm" onClick={() => go({ q: "", where: [], type: [], exp: [], pay: null, posted: null, rounds: false, skill: [], company: [] })}>Clear search and filters</Button>} />
                            : <Empty title="No jobs yet" body="There are no open postings right now. Follow companies to hear when they post." action={<Button asChild variant="outline" size="sm"><Link href="/companies">Explore companies</Link></Button>} />
                    ) : (
                        visible.map((job, i) => (
                            <JobCard key={job.id} job={job} index={i} onSave={onSave} onViewDetails={(j) => setSelectedId(j.id)} showMatchScore={signedIn} />
                        ))
                    )}
                </div>
            </ScrollArea>

            {total > 0 && (
                <footer className="flex shrink-0 flex-col items-center gap-2 border-t border-neutral-200 py-3 sm:flex-row sm:justify-between dark:border-neutral-800">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium tabular-nums text-neutral-900 dark:text-white">{from}-{to}</span> of <span className="tabular-nums">{total}</span>
                    </p>
                    {totalPages > 1 && <Pages page={page} totalPages={totalPages} href={(n) => `/jobs/browse${browseQuery({ ...params, page: n }, signedIn)}`} onGo={(n) => go({ page: n }, true)} />}
                </footer>
            )}

            <JobDetailsSheet job={selected} open={!!selected} onClose={() => setSelectedId(null)} onSave={onSave} />
        </div>
    )
}

/** 1 ... 4 5 6 ... 12: the first, the last, and the pages around this one. */
function pageList(page: number, total: number): (number | "gap")[] {
    const keep = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total))
    const out: (number | "gap")[] = []
    ;[...keep].sort((a, b) => a - b).forEach((n, i, arr) => {
        if (i > 0 && n - arr[i - 1]! > 1) out.push("gap")
        out.push(n)
    })
    return out
}

function Pages({ page, totalPages, href, onGo }: { page: number; totalPages: number; href: (n: number) => string; onGo: (n: number) => void }) {
    // Real links (middle-click opens a page in a new tab); a plain click stays in the app.
    const link = (n: number) => ({
        href: href(n),
        onClick: (e: React.MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); onGo(n) },
    })
    return (
        <Pagination className="mx-0 w-auto">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious {...link(Math.max(1, page - 1))} aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-40" : undefined} />
                </PaginationItem>
                {pageList(page, totalPages).map((n, i) => (
                    <PaginationItem key={`${n}-${i}`}>
                        {n === "gap" ? <PaginationEllipsis /> : <PaginationLink {...link(n)} isActive={n === page}>{n}</PaginationLink>}
                    </PaginationItem>
                ))}
                <PaginationItem>
                    <PaginationNext {...link(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages} className={page === totalPages ? "pointer-events-none opacity-40" : undefined} />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-neutral-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800"><Briefcase className="h-5 w-5 text-neutral-700 dark:text-neutral-300" /></span>
            <p className="mt-3 font-medium text-neutral-900 dark:text-white">{title}</p>
            <p className="mt-1 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}
