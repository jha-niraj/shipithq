import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { pageMeta } from "@/lib/seo"
import { CHANGELOG, monthName } from "@/content/changelog"
import { PageHero } from "@/components/page-hero"
import { MONO, TONE, type Tone } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles } from "@/components/marketing/card-art"

export const metadata: Metadata = pageMeta({
    title: "What's new",
    description: "Everything that shipped in ShipItHQ, as it ships: projects, practice, the resume tools, Pathfinder and the site itself.",
    path: "/changelog",
})

/**
 * What's new (plan/web/revamp REV-50, REV-85), after fanout.sh/updates: a catalogue
 * of update cards under a wavy month divider. Each card has its own animated scene,
 * a title, what changed for you, a button to the page it is about, and the date it
 * shipped. Everything comes from content/changelog.ts; adding an entry there is the
 * only edit a release needs, and the navbar pill follows it.
 */

const TONES: Tone[] = ["blush", "sage", "butter", "mint", "coral"]

function day(date: string) {
    const d = new Date(`${date}T00:00:00Z`)
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).toUpperCase()
}

function MonthDivider({ label }: { label: string }) {
    const wave = "M0 4 Q 7.5 0 15 4 T 30 4 T 45 4 T 60 4 T 75 4 T 90 4 T 105 4 T 120 4 T 135 4 T 150 4 T 165 4 T 180 4 T 195 4 T 210 4 T 225 4 T 240 4 T 255 4 T 270 4 T 285 4 T 300 4"
    return (
        <div className="flex items-center gap-4">
            <svg aria-hidden viewBox="0 0 300 8" preserveAspectRatio="none" className="h-2 flex-1 text-neutral-300"><path d={wave} fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
            <span className={cn(MONO, "text-[12px] uppercase tracking-[0.18em] text-neutral-600")}>{label}</span>
            <svg aria-hidden viewBox="0 0 300 8" preserveAspectRatio="none" className="h-2 flex-1 text-neutral-300"><path d={wave} fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
        </div>
    )
}

export default function ChangelogPage() {
    let n = 0
    return (
        <main className="bg-neutral-50">
            <CardArtStyles />
            <PageHero
                eyebrow="Release notes"
                title="What's new in ShipItHQ"
                sub="Everything that shipped, as it ships. Only things you can use today."
                tone="butter"
                art="changelog"
            />
            <div className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
                <ol className="space-y-16">
                    {CHANGELOG.map((entry) => (
                        <li key={entry.month} id={entry.month} className="scroll-mt-24">
                            <MonthDivider label={monthName(entry.month, true)} />
                            <p className="mt-6 text-center font-display text-xl font-semibold tracking-tight text-neutral-900">{entry.headline}</p>
                            <ul className="mt-8 space-y-4">
                                {entry.items.map((item) => {
                                    const tone = TONES[n++ % TONES.length]!
                                    const t = TONE[tone]
                                    return (
                                        <li key={item.title} className="sh-reveal">
                                            {/* plan/web/story ST-13: each release as three frames, before / now / where. */}
                                            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
                                                <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
                                                    <div className={cn("flex size-16 shrink-0 items-center justify-center rounded-xl p-1.5", t.surface)}>
                                                        <CardArt kind={item.art} className="max-h-14" />
                                                    </div>
                                                    <h2 className="min-w-0 flex-1 font-display text-xl font-semibold leading-snug tracking-tight text-neutral-900 md:text-2xl">{item.title}</h2>
                                                    <time dateTime={item.date} className={cn(MONO, "rounded-md bg-neutral-100 px-2.5 py-1.5 text-[12px] tracking-[0.12em] text-neutral-700")}>
                                                        {day(item.date)}
                                                    </time>
                                                </header>
                                                <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
                                                    <div className="rounded-xl border border-dashed border-neutral-300 p-4">
                                                        <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Before</p>
                                                        <p className="mt-2 text-[14.5px] leading-6 text-neutral-700">{item.before}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-neutral-900 p-4 text-white">
                                                        <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-300")}>Now</p>
                                                        <p className="mt-2 text-[14.5px] leading-6 text-neutral-100">{item.body}</p>
                                                    </div>
                                                    <div className={cn("flex flex-col rounded-xl p-4", t.surface)}>
                                                        <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em]", t.muted)}>Where</p>
                                                        <p className={cn("mt-2 text-[14.5px] leading-6", t.ink)}>{item.where}</p>
                                                        {item.href && item.cta && (
                                                            <div className="mt-auto pt-3">
                                                                <Link href={item.href} className="group inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-neutral-900 ring-1 ring-neutral-900/10 transition-colors hover:bg-white">
                                                                    {item.cta}
                                                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        </li>
                                    )
                                })}
                            </ul>
                        </li>
                    ))}
                </ol>
            </div>
        </main>
    )
}
