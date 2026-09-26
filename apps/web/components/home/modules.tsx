import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MODULES } from "@/content/modules"
import { Eyebrow, MetaLine, MONO, Section, TONE, isDark, type Tone } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles, type ArtKind } from "@/components/marketing/card-art"

/**
 * The module cards (plan/web/revamp REV-11, REV-75, REV-76), after fanout's "Choose
 * where to start": tall cards, each with its own animated scene.
 *
 * ── Alignment ──
 * The art sits in a fixed-height box and the text starts right under it, so the
 * eyebrow and title line up across the whole row whatever the bullet lengths; the meta
 * line and the link are pinned to the bottom. (They used to hang from `mt-auto`, which
 * put every title at a different height.)
 *
 * ── Tones ──
 * Dark and pastel alternate (Niraj: "give a black background after one"), so no two
 * neighbours share a tone.
 */

export interface ModuleCardData {
    id: ArtKind
    kind: string
    name: string
    tone: Tone
    bullets: string[]
    meta: string[]
    /** Where the card goes. Omitted: the card is not a link. */
    href?: string
    cta?: string
}

export function ModuleCardGrid({ items, cols = 5 }: { items: ModuleCardData[]; cols?: 4 | 5 }) {
    return (
        <>
            <CardArtStyles />
            <ul className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 xl:mx-0 xl:grid xl:overflow-visible ${cols === 4 ? "xl:grid-cols-4" : "xl:grid-cols-5"} xl:px-0 xl:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
                {items.map((m, i) => {
                    const t = TONE[m.tone]
                    const dark = isDark(m.tone)
                    const className = cn(
                        "group flex h-full min-h-[36rem] flex-col rounded-2xl p-6 transition-[transform,box-shadow] duration-300",
                        m.href && "hover:-translate-y-1.5",
                        t.surface, t.ink,
                        m.tone === "white" && "border border-neutral-200",
                        dark ? "shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]" : cn("shadow-[0_1px_2px_rgba(0,0,0,0.04)]", m.href && "hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)]"),
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
                    )
                    const body = (
                        <>
                            <div className="flex h-44 items-center justify-center">
                                <CardArt kind={m.id} dark={dark} className="max-h-44 transition-transform duration-500 group-hover:scale-[1.04]" />
                            </div>
                            <div className="mt-6">
                                <Eyebrow className={t.muted}>{m.kind}</Eyebrow>
                                <h3 className={cn(MONO, "mt-2.5 text-[1.7rem] font-medium leading-[1.1] tracking-[-0.04em]")}>{m.name}</h3>
                                <ul className="mt-5 space-y-2">
                                    {m.bullets.map((b) => (
                                        <li key={b} className="flex gap-2 text-[14px] leading-5">
                                            <span aria-hidden>+</span>
                                            <span className={dark ? "text-neutral-200" : "text-neutral-800"}>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-auto pt-6">
                                <MetaLine className={t.muted} items={m.meta} />
                                {m.href && (
                                    <span className={cn("mt-5 flex items-center justify-between border-t pt-4 text-sm font-medium", t.rule)}>
                                        {m.cta ?? `Explore ${m.name.toLowerCase()}`}
                                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                                    </span>
                                )}
                            </div>
                        </>
                    )
                    return (
                        <li
                            key={m.id}
                            className="sh-reveal w-[78vw] max-w-[20rem] shrink-0 snap-start xl:w-auto xl:max-w-none"
                            style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}
                        >
                            {m.href ? <Link href={m.href} className={className}>{body}</Link> : <div className={className}>{body}</div>}
                        </li>
                    )
                })}
            </ul>
        </>
    )
}

export function moduleCards(): ModuleCardData[] {
    return MODULES.map((m) => ({
        id: m.id,
        kind: m.kind,
        name: m.name,
        tone: m.tone,
        bullets: m.bullets.map((b) => b.text),
        meta: m.meta.map((x) => x.text),
        href: `/features/${m.id}`,
    }))
}

export function HomeModules() {
    return (
        <Section
            id="modules"
            eyebrow="Pick your module"
            title="Choose where to start"
            sub="Five parts of one product, on one account and one credit balance. Start with whichever you need first."
        >
            <ModuleCardGrid items={moduleCards()} />
        </Section>
    )
}
