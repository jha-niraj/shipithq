"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, Globe, Sparkles, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { cn } from "@repo/ui/lib/utils"
import type { CompanyDraftFields } from "@repo/db"
import { getOnboardingScrape, startOnboardingScrape } from "@/actions/auth/onboarding-scrape.action"

/*
 * Onboarding's first step (plan/hiring-ui HU-14, Niraj 2026-09-27: "website first,
 * then confirm"): the owner gives the company site, ShipItHQ reads it, and each
 * thing it found is shown with Keep / Skip. Kept values prefill the next step,
 * where everything stays editable. Skippable at every point.
 */

export interface WebsiteResult {
    website: string
    draftId?: string
    name?: string
    description?: string
    industry?: string
    size?: string
    city?: string
    techStack?: string[]
    benefits?: string[]
    culture?: string
}

type Phase = { kind: "ask" } | { kind: "reading"; draftId: string } | { kind: "review"; draftId: string; fields: CompanyDraftFields } | { kind: "failed"; error: string }

const POLL_MS = 3_000
/** The read takes 45-120 seconds; past this, offer to go on by hand (the draft still finishes). */
const PATIENCE_MS = 4 * 60_000

const LABELS: { key: keyof CompanyDraftFields; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "description", label: "What you do" },
    { key: "industry", label: "Industry" },
    { key: "size", label: "Size" },
    { key: "locations", label: "Locations" },
    { key: "techStack", label: "Tech stack" },
    { key: "benefits", label: "Benefits" },
    { key: "culture", label: "How you work" },
]

const show = (v: string | string[]) => (Array.isArray(v) ? v.join(", ") : v)

export function WebsiteStep({ initialWebsite, onDone }: { initialWebsite: string; onDone: (r: WebsiteResult) => void }) {
    const [website, setWebsite] = useState(initialWebsite)
    const [phase, setPhase] = useState<Phase>({ kind: "ask" })
    const [starting, setStarting] = useState(false)
    const [slow, setSlow] = useState(false)
    const [keep, setKeep] = useState<Record<string, boolean>>({})
    const started = useRef(0)

    useEffect(() => { if (initialWebsite && !website) setWebsite(initialWebsite) }, [initialWebsite, website])

    // Poll while the site is being read.
    useEffect(() => {
        if (phase.kind !== "reading") return
        let live = true
        const tick = async () => {
            const r = await getOnboardingScrape(phase.draftId)
            if (!live) return
            if (!r.success) { setPhase({ kind: "failed", error: r.error }); return }
            if (r.data.status === "ready") {
                const fields = r.data.fields
                setKeep(Object.fromEntries(LABELS.filter((l) => fields[l.key]).map((l) => [l.key, true])))
                setPhase({ kind: "review", draftId: phase.draftId, fields })
            } else if (r.data.status === "failed") {
                setPhase({ kind: "failed", error: r.data.error })
            } else {
                if (Date.now() - started.current > PATIENCE_MS) setSlow(true)
                timer = setTimeout(tick, POLL_MS)
            }
        }
        let timer = setTimeout(tick, 1_500)
        return () => { live = false; clearTimeout(timer) }
    }, [phase])

    const read = async () => {
        setStarting(true)
        const r = await startOnboardingScrape(website)
        setStarting(false)
        if (!r.success) { setPhase({ kind: "failed", error: r.error }); return }
        started.current = Date.now()
        setSlow(false)
        setPhase({ kind: "reading", draftId: r.data.draftId })
    }

    const finish = () => {
        if (phase.kind !== "review") { onDone({ website }); return }
        const f = phase.fields
        const k = (key: keyof CompanyDraftFields) => keep[key] && f[key]
        onDone({
            website,
            draftId: phase.draftId,
            name: k("name") ? f.name!.value : undefined,
            description: k("description") ? f.description!.value : undefined,
            industry: k("industry") ? f.industry!.value : undefined,
            size: k("size") ? f.size!.value : undefined,
            city: k("locations") ? f.locations!.value[0] : undefined,
            techStack: k("techStack") ? f.techStack!.value : undefined,
            benefits: k("benefits") ? f.benefits!.value : undefined,
            culture: k("culture") ? f.culture!.value : undefined,
        })
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                    <Globe className="h-8 w-8 text-neutral-600 dark:text-neutral-400" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">Start with your website</h1>
                <p className="mx-auto max-w-md text-neutral-500">We read it so you don&apos;t have to fill this in. You keep or skip each thing we find, and can change all of it later.</p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                {(phase.kind === "ask" || phase.kind === "failed") && (
                    <form onSubmit={(e) => { e.preventDefault(); void read() }} className="space-y-3">
                        <label htmlFor="ob-website" className="text-sm font-medium text-neutral-900 dark:text-white">Your company&apos;s website</label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input id="ob-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" autoFocus />
                            <Button type="submit" disabled={starting || website.trim().length < 4} className="shrink-0 gap-1.5">
                                {starting ? <InlineLoader size="sm" /> : <Sparkles className="h-4 w-4" />} Read our site
                            </Button>
                        </div>
                        {phase.kind === "failed" && <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">{phase.error}</p>}
                    </form>
                )}

                {phase.kind === "reading" && (
                    <div className="space-y-4" aria-live="polite">
                        <ShimmerStyles />
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                            <InlineLoader size="sm" /> Reading your About, Careers and Team pages. This takes a minute or two.
                        </div>
                        {LABELS.slice(0, 5).map((l, i) => (
                            <div key={l.key} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                                <span className="text-sm text-neutral-500">{l.label}</span>
                                <Shimmer className="h-4 w-full" delay={i * 0.08} />
                            </div>
                        ))}
                        {slow && <p className="text-sm text-neutral-600 dark:text-neutral-400">It&apos;s taking longer than usual. Go on by hand if you like; nothing is lost.</p>}
                    </div>
                )}

                {phase.kind === "review" && (
                    <div className="space-y-3">
                        {LABELS.some((l) => phase.fields[l.key]) ? (
                            <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">Here&apos;s what we found. Keep what&apos;s right; skip the rest.</p>
                                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {LABELS.filter((l) => phase.fields[l.key]).map((l) => {
                                        const on = keep[l.key] ?? false
                                        const value = phase.fields[l.key]!.value
                                        return (
                                            <li key={l.key} className="flex items-start gap-3 py-3">
                                                <span className="w-28 shrink-0 text-sm text-neutral-500 dark:text-neutral-400">{l.label}</span>
                                                <span className={cn("min-w-0 flex-1 text-sm", on ? "text-neutral-900 dark:text-white" : "text-neutral-400 line-through dark:text-neutral-600")}>{show(value)}</span>
                                                <div role="radiogroup" aria-label={l.label} className="inline-flex shrink-0 rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
                                                    {([true, false] as const).map((v) => (
                                                        <button key={String(v)} type="button" role="radio" aria-checked={on === v} onClick={() => setKeep((k) => ({ ...k, [l.key]: v }))}
                                                            className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", on === v ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                                                            {v ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {v ? "Keep" : "Skip"}
                                                        </button>
                                                    ))}
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </>
                        ) : (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">We read your site but found nothing we could use. Fill it in on the next step.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <button type="button" onClick={() => onDone({ website })} className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white">
                    Skip, I&apos;ll fill it in
                </button>
                {(phase.kind === "review" || (phase.kind === "reading" && slow)) && (
                    <Button onClick={finish} className="gap-1.5">Continue <ArrowRight className="h-4 w-4" /></Button>
                )}
            </div>
        </div>
    )
}
