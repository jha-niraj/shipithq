import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { COMPARISONS } from "@/app/(home)/compare/_components/comparisons"
import { getLandingNumbers } from "@/lib/landing-numbers"
import { GhostCta, MONO, PrimaryCta, Section, TONE, isDark, type Tone } from "./primitives"
import { CardArt, CardArtStyles, type ArtKind } from "./card-art"
import { CountUp } from "./count-up"

/**
 * The landing sections shared by `/` and `/hire` (plan/web/revamp REV-79, REV-84):
 * how it works, the numbers band, the compare strip and the closing band. The
 * product tour is its own client file (product-tour.tsx).
 */

// ── How it works ───────────────────────────────────────────────────────────────

export interface Step {
    title: string
    body: string
    art: ArtKind
}

const STEP_TONES: Tone[] = ["blush", "ink", "mint", "sand"]

export function HowItWorks({ id = "how-it-works", eyebrow = "How it works", title, steps }: {
    id?: string
    eyebrow?: string
    title: string
    steps: Step[]
}) {
    return (
        <Section id={id} eyebrow={eyebrow} title={title}>
            <CardArtStyles />
            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {steps.map((s, i) => {
                    const tone = STEP_TONES[i % STEP_TONES.length]!
                    const t = TONE[tone]
                    const dark = isDark(tone)
                    return (
                        <li
                            key={s.title}
                            className={cn("sh-reveal flex flex-col rounded-2xl p-6", t.surface, t.ink)}
                            style={{ ["--sh-reveal-delay" as string]: `${i * 0.08}s` }}
                        >
                            <div className="flex items-center justify-between">
                                <span className={cn(MONO, "text-3xl font-medium tracking-tight")}>{String(i + 1).padStart(2, "0")}</span>
                                {i < steps.length - 1 && <ArrowRight aria-hidden className={cn("hidden size-5 xl:block", t.muted)} />}
                            </div>
                            <div className="my-6 flex h-32 items-center justify-center">
                                <CardArt kind={s.art} dark={dark} className="max-h-32" />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                            <p className={cn("mt-2 text-[15px] leading-6", dark ? "text-neutral-300" : "text-neutral-800")}>{s.body}</p>
                        </li>
                    )
                })}
            </ol>
        </Section>
    )
}

// ── Numbers band ───────────────────────────────────────────────────────────────

export type NumberKey = "developers" | "projects" | "tasksApproved" | "mocks" | "activeJobs" | "companies"

const NUMBER_LABEL: Record<NumberKey, string> = {
    developers: "Developers signed up",
    projects: "Projects started",
    tasksApproved: "Tasks approved",
    mocks: "Mock interviews taken",
    activeJobs: "Jobs open now",
    companies: "Companies on the platform",
}

/**
 * Live counts, cached for an hour (lib/landing-numbers.ts). Hidden when the database
 * cannot be read or every count is zero: no number here is ever made up.
 */
export async function NumbersBand({ keys, title }: { keys: NumberKey[]; title: string }) {
    const n = await getLandingNumbers()
    if (!n) return null
    const items = keys.map((k) => ({ key: k, value: n[k] })).filter((x) => x.value > 0)
    if (items.length < 2) return null

    return (
        <section className="px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-7xl rounded-3xl bg-neutral-950 px-8 py-12 text-white md:px-12">
                <p className={cn(MONO, "sh-reveal text-[11px] uppercase tracking-[0.18em] text-neutral-400")}>{title}</p>
                <dl className={cn("mt-8 grid gap-8", items.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}>
                    {items.map((x, i) => (
                        <div key={x.key} className="sh-reveal border-l border-neutral-800 pl-5" style={{ ["--sh-reveal-delay" as string]: `${i * 0.08}s` }}>
                            <dt className="font-display text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
                                <CountUp value={x.value} />
                            </dt>
                            <dd className="mt-2 text-sm text-neutral-400">{NUMBER_LABEL[x.key]}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}

// ── Compare strip ──────────────────────────────────────────────────────────────

const STRIP_TONES: Tone[] = ["coral", "sage", "butter", "blush"]

/** The scene on each compare card: what ShipItHQ does that the alternative does not (REV-89). */
const COMPARE_ART: Record<string, ArtKind> = {
    leetcode: "practice",
    bootcamp: "projects",
    chatgpt: "ai",
    "cs-degree": "guides",
    "interviewing-io": "mock",
    pramp: "mock",
    neetcode: "practice",
    "youtube-tutorials": "projects",
    "resume-review-service": "ai",
    "diy-study-plan": "changelog",
}

export function CompareStrip({ slugs = ["leetcode", "bootcamp", "chatgpt", "cs-degree"] }: { slugs?: string[] }) {
    const picked = slugs.map((s) => COMPARISONS.find((c) => c.slug === s)).filter((c): c is (typeof COMPARISONS)[number] => !!c)
    return (
        <Section
            eyebrow="Compare"
            title="Why this, and not the free alternative"
            sub="Every comparison opens with what the other option is genuinely good at."
            action={<Link href="/compare" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">All {COMPARISONS.length} comparisons <ArrowRight className="size-3.5" /></Link>}
        >
            <CardArtStyles />
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {picked.map((c, i) => {
                    const t = TONE[STRIP_TONES[i % STRIP_TONES.length]!]
                    return (
                        <li key={c.slug} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                            <Link href={`/compare/${c.slug}`} className={cn("group flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1", t.surface, t.ink)}>
                                <span className="mb-5 flex h-32 items-center justify-center rounded-xl bg-white/45">
                                    <CardArt kind={COMPARE_ART[c.slug] ?? "compare"} className="max-h-28 transition-transform duration-500 group-hover:scale-[1.05]" />
                                </span>
                                <span className={cn(MONO, "text-[11px] uppercase tracking-[0.16em]", t.muted)}>ShipItHQ vs</span>
                                <span className="mt-2 font-display text-2xl font-semibold tracking-tight">{c.name}</span>
                                <span className={cn("mt-3 flex-1 text-[14px] leading-5", t.muted)}>{c.stance}</span>
                                <span className="mt-6 flex items-center justify-between text-sm font-medium">
                                    Read the comparison
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}

// ── Closing band ───────────────────────────────────────────────────────────────

const CTA_STYLES = `
@keyframes cta-drift { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.15); } 100% { transform: translate(0,0) scale(1); } }
.cta-orb { animation: cta-drift 14s ease-in-out infinite; filter: blur(60px); }
@keyframes cta-marquee { to { transform: translateX(-50%); } }
.cta-marquee { animation: cta-marquee 40s linear infinite; }
@media (prefers-reduced-motion: reduce) { .cta-orb, .cta-marquee { animation: none; } }
`

/**
 * The closing call to action: an ink band with slow pastel light drifting behind the
 * headline and a row of the product's words scrolling underneath.
 */
export function CtaBand({ title, sub, primary, secondary, words }: {
    title: React.ReactNode
    sub: string
    primary: { text: string; href: string }
    secondary?: { text: string; href: string }
    words: string[]
}) {
    return (
        <section className="px-4 py-20 sm:px-6 md:py-28">
            <style>{CTA_STYLES}</style>
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-neutral-950 text-white">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <span className="cta-orb absolute -left-10 top-6 size-72 rounded-full bg-[#F2C9C4] opacity-30" />
                    <span className="cta-orb absolute right-0 top-1/3 size-80 rounded-full bg-[#A8D5BA] opacity-25" style={{ animationDelay: "-5s" }} />
                    <span className="cta-orb absolute bottom-0 left-1/3 size-64 rounded-full bg-[#EFD9A0] opacity-25" style={{ animationDelay: "-9s" }} />
                </div>
                <div className="relative px-8 pb-10 pt-16 text-center md:px-16 md:pt-24">
                    <h2 className="sh-reveal mx-auto max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">{title}</h2>
                    <p className="sh-reveal mx-auto mt-5 max-w-xl text-lg leading-8 text-neutral-300" style={{ ["--sh-reveal-delay" as string]: "0.08s" }}>{sub}</p>
                    <div className="sh-reveal mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-4" style={{ ["--sh-reveal-delay" as string]: "0.14s" }}>
                        <PrimaryCta href={primary.href} onInk>{primary.text}</PrimaryCta>
                        {secondary && <GhostCta href={secondary.href} onInk>{secondary.text}</GhostCta>}
                    </div>
                </div>
                <div aria-hidden className="relative overflow-hidden border-t border-white/10 py-5 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                    <div className="cta-marquee flex w-max gap-10">
                        {[...words, ...words].map((w, i) => (
                            <span key={i} className={cn(MONO, "whitespace-nowrap text-sm uppercase tracking-[0.2em] text-neutral-500")}>{w} <span className="ml-10 text-neutral-700">+</span></span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
