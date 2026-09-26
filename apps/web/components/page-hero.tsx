import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { Eyebrow, GhostCta, MONO, PrimaryCta, TONE, isDark, type Tone } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles, type ArtKind } from "@/components/marketing/card-art"

/**
 * The one hero on every public page (plan/web/revamp REV-80). Niraj, 2026-09-25:
 * "the hero section of this feature should be the hero section of all the things".
 *
 * A rounded panel in one of the site's tones: breadcrumb, eyebrow, title, one
 * paragraph, a primary action beside an underlined second one, and optional facts on
 * the left; an animated scene (or any `aside`) on the right. It replaces the photo
 * hero and its four variants, so every page opens the same way and only the tone,
 * the words and the art change.
 *
 * `variant` is still accepted so existing callers compile, and is ignored: there is
 * one layout now.
 */

export interface PageHeroCta {
    text: string
    href: string
    /** Renders a plain anchor rather than a Next link (app links). */
    external?: boolean
}

export interface PageHeroFact {
    value: string
    label: string
}

export type PageHeroVariant = "statement" | "ledger" | "split" | "versus"

export interface PageHeroProps {
    eyebrow?: string
    title: ReactNode
    sub?: ReactNode
    ctas?: PageHeroCta[]
    /** Accepted for old callers; ignored. */
    variant?: PageHeroVariant
    /** Hard facts under the copy, set in mono. Three or four. */
    facts?: PageHeroFact[]
    /** Anything for the right column. Wins over `art`. */
    aside?: ReactNode
    /** The animated scene on the right. */
    art?: ArtKind
    tone?: Tone
    /** Crumbs above the eyebrow, the last one is the current page. */
    crumbs?: { name: string; href?: string }[]
    /** Tighter padding and gaps, for a page whose real content is below the hero (Ideas). */
    compact?: boolean
}

export function PageHero({ eyebrow, title, sub, ctas = [], facts = [], aside, art, tone = "stone", crumbs, compact = false }: PageHeroProps) {
    const t = TONE[tone]
    const dark = isDark(tone)
    const right = aside ?? (art ? <CardArt kind={art} dark={dark} className={cn("mx-auto", compact ? "max-h-56 max-w-xs" : "max-w-md")} /> : null)

    return (
        <section className="px-4 pt-6 sm:px-6">
            <CardArtStyles />
            <div
                className={cn(
                    "mx-auto max-w-7xl overflow-hidden rounded-3xl",
                    t.surface, t.ink,
                    tone === "white" && "border border-neutral-200",
                )}
            >
                <div className={cn("grid items-center", compact ? "gap-6 p-6 md:p-8 lg:px-12 lg:py-10" : "gap-10 p-8 md:p-12 lg:p-16", right && "lg:grid-cols-[1.1fr_0.9fr]")}>
                    <div className="sh-reveal min-w-0">
                        {crumbs && crumbs.length > 0 && (
                            <nav aria-label="Breadcrumb" className={cn("mb-8 flex flex-wrap items-center gap-1.5 text-[13px]", t.muted)}>
                                {crumbs.map((c, i) => (
                                    <span key={c.name} className="flex items-center gap-1.5">
                                        {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
                                        {c.href ? <Link href={c.href} className="hover:underline">{c.name}</Link> : <span aria-current="page">{c.name}</span>}
                                    </span>
                                ))}
                            </nav>
                        )}
                        {eyebrow && <Eyebrow className={t.muted}>{eyebrow}</Eyebrow>}
                        <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">{title}</h1>
                        {sub && <p className={cn(compact ? "mt-3 max-w-xl text-[17px] leading-7" : "mt-5 max-w-xl text-lg leading-8", dark ? "text-neutral-300" : "text-neutral-800")}>{sub}</p>}
                        {ctas.length > 0 && (
                            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                                {ctas.map((c, i) =>
                                    i === 0
                                        ? <PrimaryCta key={c.href} href={c.href} onInk={dark}>{c.text}</PrimaryCta>
                                        : <GhostCta key={c.href} href={c.href} onInk={dark}>{c.text}</GhostCta>,
                                )}
                            </div>
                        )}
                        {facts.length > 0 && (
                            <dl className={cn(compact ? "mt-6 pt-5" : "mt-10 pt-6", "grid grid-cols-2 gap-x-6 gap-y-5 border-t sm:grid-cols-4", t.rule)}>
                                {facts.map((f) => (
                                    <div key={f.label}>
                                        <dt className="text-2xl font-semibold tabular-nums tracking-tight">{f.value}</dt>
                                        <dd className={cn(MONO, "mt-1 text-[10px] uppercase tracking-[0.14em]", t.muted)}>{f.label}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                    {right && <div className="sh-reveal min-w-0" style={{ ["--sh-reveal-delay" as string]: "0.1s" }}>{right}</div>}
                </div>
            </div>
        </section>
    )
}

export default PageHero

/** The loading shape of PageHero: the same panel, padding and two columns. */
export function PageHeroSkeleton({ facts = 0, compact = false }: { facts?: number; compact?: boolean } = {}) {
    return (
        <section className="px-4 pt-6 sm:px-6" aria-hidden>
            <div className={cn("mx-auto grid max-w-7xl items-center rounded-3xl bg-neutral-100 lg:grid-cols-[1.1fr_0.9fr]", compact ? "gap-6 p-6 md:p-8 lg:px-12 lg:py-10" : "gap-10 p-8 md:p-12 lg:p-16")}>
                <div className="space-y-4">
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
                    <div className="h-12 w-4/5 animate-pulse rounded-lg bg-neutral-200" />
                    <div className="h-5 w-full animate-pulse rounded bg-neutral-200" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-200" />
                    {facts > 0 ? (
                        <div className={cn("grid grid-cols-2 gap-x-6 gap-y-5 border-t border-neutral-200 sm:grid-cols-4", compact ? "mt-4 pt-5" : "mt-6 pt-6")}>
                            {Array.from({ length: facts }, (_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-7 w-12 animate-pulse rounded bg-neutral-200" />
                                    <div className="h-2.5 w-16 animate-pulse rounded bg-neutral-200" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex gap-4 pt-4">
                            <div className="h-12 w-36 animate-pulse rounded-lg bg-neutral-200" />
                            <div className="h-12 w-28 animate-pulse rounded-lg bg-neutral-200" />
                        </div>
                    )}
                </div>
                <div className={cn("mx-auto hidden w-full animate-pulse rounded-2xl bg-neutral-200 lg:block", compact ? "h-56 max-w-xs" : "aspect-[7/5] max-w-md")} />
            </div>
        </section>
    )
}
