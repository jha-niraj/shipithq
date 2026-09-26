"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Check, CircleAlert, Search, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import {
    getMyCompanyRequests, lookupCompany, requestCompany,
    type CompanyCandidate, type MyCompanyRequest,
} from "@/actions/companies/request.action"

/*
 * Request a company (plan/hiring-rounds HR-7). The student types a name or
 * pastes a website, confirms which company they mean, and asks for it. If it
 * is already here they get a link; if someone already asked, their ask becomes
 * a vote. "Your requests" shows where each one is.
 */

const STAGE: Record<MyCompanyRequest["stage"], { label: string; tone: string }> = {
    reading: { label: "Reading its site", tone: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
    in_review: { label: "In review", tone: "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white" },
    live: { label: "Live", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
    not_added: { label: "Not added", tone: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400" },
}

export function RequestCompanyContent({ signedIn, initialQuery, initialRequests }: {
    signedIn: boolean
    initialQuery: string
    initialRequests: MyCompanyRequest[]
}) {
    const [query, setQuery] = useState(initialQuery)
    const [candidates, setCandidates] = useState<CompanyCandidate[] | null>(null)
    const [lookupsLeft, setLookupsLeft] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [searching, startSearch] = useTransition()
    const [asking, setAsking] = useState<string | null>(null)
    const [requests, setRequests] = useState(initialRequests)
    const ran = useRef(false)

    const search = (q: string) => startSearch(async () => {
        setError(null)
        const r = await lookupCompany(q)
        if (!r.success) { setError(r.error); setCandidates(null); return }
        setCandidates(r.data.candidates)
        if (r.data.lookupsLeft !== null) setLookupsLeft(r.data.lookupsLeft)
    })

    // Arriving from an empty search on /companies: look the name up straight away.
    useEffect(() => {
        if (ran.current || !signedIn || initialQuery.trim().length < 2) return
        ran.current = true
        search(initialQuery)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const ask = async (c: CompanyCandidate) => {
        setAsking(c.domain)
        setError(null)
        const r = await requestCompany({ domain: c.domain, name: c.name })
        setAsking(null)
        if (!r.success) { setError(r.error); return }
        const o = r.data
        if (o.kind === "existing") {
            toast.success(`${o.name} is already on ShipItHQ`)
            setCandidates((list) => list?.map((x) => x.domain === c.domain ? { ...x, existing: { slug: o.slug, name: o.name } } : x) ?? null)
        } else if (o.kind === "voted") {
            toast.success(o.alreadyVoted ? "You've already asked for this one" : `Added your vote. ${o.votes} people want ${c.name}.`)
            setCandidates((list) => list?.map((x) => x.domain === c.domain ? { ...x, request: { votes: o.votes, status: x.request?.status ?? "PENDING", youVoted: true } } : x) ?? null)
        } else {
            toast.success(`Asked for ${c.name}`, { description: "We're reading its website now. You'll hear from us when it's live." })
            setCandidates((list) => list?.map((x) => x.domain === c.domain ? { ...x, request: { votes: 1, status: "SCRAPING", youVoted: true } } : x) ?? null)
        }
        const mine = await getMyCompanyRequests()
        if (mine.success) setRequests(mine.data)
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                <ArrowLeft className="h-4 w-4" /> Companies
            </Link>
            <PageHeader
                title="Request a company"
                subtitle="Can't find a company? Ask for it, and we'll build its page from its own website."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0 space-y-4">
                    {!signedIn ? (
                        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">Sign in to ask for a company. We&apos;ll tell you when it&apos;s live.</p>
                            <Button asChild className="mt-4">
                                <Link href={`/signin?callbackUrl=${encodeURIComponent(`/companies/request${initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : ""}`)}`}>Sign in</Link>
                            </Button>
                        </div>
                    ) : (
                        <form
                            onSubmit={(e) => { e.preventDefault(); if (query.trim().length >= 2) search(query) }}
                            className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900"
                        >
                            <label htmlFor="company-query" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
                                Company name or website
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                                    <Input
                                        id="company-query"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Zerodha, or zerodha.com"
                                        className="pl-9"
                                        autoComplete="off"
                                        maxLength={120}
                                    />
                                </div>
                                <Button type="submit" disabled={searching || query.trim().length < 2} className="gap-2">
                                    {searching && <InlineLoader size="sm" />}
                                    Find it
                                </Button>
                            </div>
                            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                A website always works. Name searches: 10 a day{lookupsLeft !== null ? ` (${lookupsLeft} left)` : ""}. New requests: 3 a day.
                            </p>
                        </form>
                    )}

                    {error && (
                        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                        </p>
                    )}

                    {searching ? (
                        <CandidatesSkeleton />
                    ) : candidates && (
                        candidates.length === 0 ? (
                            <p className="rounded-2xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                                Nothing matched. Try the company&apos;s website, like acme.io.
                            </p>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                                <p className="border-b border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-900 dark:border-neutral-800 dark:text-white">
                                    {candidates.length === 1 ? "Is this the company?" : "Which one do you mean?"}
                                </p>
                                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {candidates.map((c) => (
                                        <li key={c.domain} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-neutral-900 dark:text-white">{c.name}</p>
                                                    <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-sm text-neutral-500 hover:underline dark:text-neutral-400">
                                                        <span className="truncate">{c.domain}</span> <ArrowUpRight className="h-3 w-3 shrink-0" />
                                                    </a>
                                                </div>
                                            </div>
                                            <CandidateAction candidate={c} busy={asking === c.domain} disabled={asking !== null} onAsk={() => void ask(c)} />
                                        </li>
                                    ))}
                                </ul>
                                <p className="border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                                    Not listed? Search with the company&apos;s website instead.
                                </p>
                            </div>
                        )
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="border-b border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-900 dark:border-neutral-800 dark:text-white">Your requests</p>
                        {requests.length === 0 ? (
                            <p className="px-4 py-5 text-sm text-neutral-500 dark:text-neutral-400">Companies you ask for, or vote on, show up here.</p>
                        ) : (
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {requests.map((r) => (
                                    <li key={r.id} className="px-4 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{r.name}</p>
                                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{r.domain}</p>
                                            </div>
                                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STAGE[r.stage].tone)}>{STAGE[r.stage].label}</span>
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {r.votes} asking</span>
                                            {r.stage === "live" && r.companySlug && (
                                                <Link href={`/companies/${r.companySlug}`} className="inline-flex items-center gap-0.5 font-medium text-neutral-900 hover:underline dark:text-white">
                                                    Open page <ArrowUpRight className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>
                                        {r.stage === "not_added" && r.rejectReason && (
                                            <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">{r.rejectReason}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="mb-2 font-medium text-neutral-900 dark:text-white">How it works</p>
                        <ol className="list-decimal space-y-1.5 pl-4 text-neutral-600 dark:text-neutral-400">
                            <li>We read the company&apos;s own website (never LinkedIn) into a draft page.</li>
                            <li>Someone at ShipItHQ reviews it before it goes live.</li>
                            <li>You&apos;re told when it&apos;s live, and you follow it automatically.</li>
                        </ol>
                        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                            A page we build is marked &quot;Unclaimed&quot; until the company claims it.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    )
}

function CandidateAction({ candidate: c, busy, disabled, onAsk }: { candidate: CompanyCandidate; busy: boolean; disabled: boolean; onAsk: () => void }) {
    if (c.existing) {
        return (
            <Button asChild variant="outline" size="sm" className="shrink-0 gap-1">
                <Link href={`/companies/${c.existing.slug}`}>Already here: open <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </Button>
        )
    }
    if (c.request?.youVoted) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                <Check className="h-4 w-4" /> You asked · {c.request.votes} asking
            </span>
        )
    }
    if (c.request && c.request.status !== "REJECTED") {
        return (
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={onAsk} disabled={disabled}>
                {busy && <InlineLoader size="sm" />} Add my vote ({c.request.votes})
            </Button>
        )
    }
    return (
        <Button size="sm" className="shrink-0 gap-1.5" onClick={onAsk} disabled={disabled}>
            {busy && <InlineLoader size="sm" />} Request this company
        </Button>
    )
}

function CandidatesSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" aria-busy aria-label="Searching">
            <ShimmerStyles />
            <div className="border-b border-neutral-200 px-5 py-3 dark:border-neutral-800"><Shimmer className="h-4 w-44" /></div>
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 last:border-0 dark:border-neutral-800">
                    <Shimmer className="h-10 w-10 rounded-xl" delay={i * 0.05} />
                    <div className="flex-1 space-y-1.5"><Shimmer className="h-4 w-40" delay={i * 0.05} /><Shimmer className="h-3 w-28" delay={i * 0.05} /></div>
                    <Shimmer className="h-8 w-36 rounded-md" delay={i * 0.05} />
                </div>
            ))}
        </div>
    )
}
