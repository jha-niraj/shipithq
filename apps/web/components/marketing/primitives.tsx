import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

/**
 * The parts every marketing page is built from (plan/web/revamp REV-2).
 *
 * Modelled on fanout.sh: most of its calm comes from a handful of parts used the
 * same way everywhere - a mono eyebrow over a plain heading, one raised dark
 * button beside an underlined text link, and cards that change tone rather than
 * colour. Keeping them here means `/`, `/hire` and `/uni` cannot drift apart.
 *
 * ── Tones, not colours ──
 * Five neutral surfaces plus six web-only pastels (REV-71, below). `Surface` sets the background AND the ink
 * together, so no card can end up with dark text on the ink tone. WCAG ratios
 * computed from the hex values (body text / muted text):
 *
 *   paper  neutral-50   neutral-900 17.2:1 / neutral-600 7.5:1
 *   white               neutral-900 17.9:1 / neutral-600 7.8:1
 *   stone  stone-100    stone-900   16.0:1 / stone-600   7.0:1
 *   mist   neutral-100  neutral-900 16.4:1 / neutral-600 7.2:1
 *   ink    neutral-950  white       19.8:1 / neutral-400 7.8:1
 *
 * Eyebrows are neutral-600, not fanout's lighter grey: neutral-500 is 4.35:1 on
 * mist, under the 4.5:1 that 11px text owes.
 *
 * The site is forced light (REV-1), so none of these carry `dark:` variants.
 */

/** The mono font: Geist Mono, loaded by app/layout.tsx. */
export const MONO = "font-[family-name:var(--font-geist-mono)]"

export type Tone = "paper" | "white" | "stone" | "mist" | "ink" | Pastel

/**
 * The web-only pastels (Niraj, 2026-09-25, plan/web/revamp REV-71): fanout's coloured
 * tiles without its blue and purple, and never brown. Dark ink on all of them; muted
 * text is neutral-700, because neutral-600 falls to 4.47:1 on coral. Ratios (ink /
 * muted): blush 11.9/6.9, sage 11.0/6.4, sand 12.9/7.5, coral 10.3/5.9, mint 12.9/7.5,
 * butter 14.3/8.3. The app itself stays monochrome.
 */
export type Pastel = "blush" | "sage" | "sand" | "coral" | "mint" | "butter"

export const PASTEL_HEX: Record<Pastel, string> = {
    blush: "#F2C9C4",
    sage: "#A8D5BA",
    sand: "#EFD9A0",
    coral: "#F4B69C",
    mint: "#BFE3D0",
    butter: "#F5E6A8",
}

const pastel = (bg: string) => ({ surface: bg, ink: "text-neutral-900", muted: "text-neutral-700", rule: "border-neutral-900/15" })

export const TONE: Record<Tone, { surface: string; ink: string; muted: string; rule: string }> = {
    paper: { surface: "bg-neutral-50", ink: "text-neutral-900", muted: "text-neutral-600", rule: "border-neutral-200" },
    white: { surface: "bg-white", ink: "text-neutral-900", muted: "text-neutral-600", rule: "border-neutral-200" },
    stone: { surface: "bg-stone-100", ink: "text-stone-900", muted: "text-stone-600", rule: "border-stone-200" },
    mist: { surface: "bg-neutral-100", ink: "text-neutral-900", muted: "text-neutral-600", rule: "border-neutral-200" },
    ink: { surface: "bg-neutral-950", ink: "text-white", muted: "text-neutral-400", rule: "border-neutral-800" },
    blush: pastel("bg-[#F2C9C4]"),
    sage: pastel("bg-[#A8D5BA]"),
    sand: pastel("bg-[#EFD9A0]"),
    coral: pastel("bg-[#F4B69C]"),
    mint: pastel("bg-[#BFE3D0]"),
    butter: pastel("bg-[#F5E6A8]"),
}

/** True for the one dark tone, where art and buttons flip to light ink. */
export const isDark = (t: Tone) => t === "ink"

/** Small uppercase mono label above a heading: "PICK YOUR MODULE". Pass a tone's `muted` on non-light tones. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn(MONO, "text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-600", className)}>
            {children}
        </p>
    )
}

/** A mono run of facts: "12 TRACKS · 400+ PROBLEMS". Items are joined with a middle dot. */
export function MetaLine({ items, className }: { items: ReactNode[]; className?: string }) {
    return (
        <p className={cn(MONO, "text-[11px] uppercase tracking-[0.14em]", className)}>
            {items.map((item, i) => (
                <span key={i}>
                    {i > 0 && <span aria-hidden className="mx-1.5 opacity-60">·</span>}
                    {item}
                </span>
            ))}
        </p>
    )
}

function isExternal(href: string) {
    return /^https?:\/\//.test(href)
}

/** A `<Link>` for pages on this site, an `<a>` for the app (apps/web/CLAUDE.md, the separation rule). */
function SmartLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
    return isExternal(href)
        ? <a href={href} className={className}>{children}</a>
        : <Link href={href} className={className}>{children}</Link>
}

/**
 * The one primary action: a dark, slightly raised button with an inset highlight,
 * and an arrow that nudges on hover. `onInk` flips it for use on the ink tone.
 */
export function PrimaryCta({ href, children, size = "md", onInk = false, arrow = true, className }: {
    href: string
    children: ReactNode
    size?: "sm" | "md"
    onInk?: boolean
    /** Off when the label already leads with its own icon ("+ Post an idea"). */
    arrow?: boolean
    className?: string
}) {
    return (
        <SmartLink
            href={href}
            className={cn(
                "group inline-flex items-center gap-2 rounded-lg font-medium transition-[transform,background-color,box-shadow] duration-200 active:translate-y-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                size === "md" ? "h-12 px-5 text-[15px]" : "h-9 px-3.5 text-sm",
                onInk
                    ? "bg-white text-neutral-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] hover:bg-neutral-100 focus-visible:ring-white focus-visible:ring-offset-neutral-950"
                    : "bg-neutral-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_0_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.2),0_6px_16px_-6px_rgba(0,0,0,0.35)] hover:bg-neutral-800 focus-visible:ring-neutral-900",
                className,
            )}
        >
            {children}
            {arrow && <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
        </SmartLink>
    )
}

/** The quiet second action: underlined text, with an optional play mark ("See how it works"). */
export function GhostCta({ href, children, play = false, onInk = false, className }: {
    href: string
    children: ReactNode
    play?: boolean
    onInk?: boolean
    className?: string
}) {
    return (
        <SmartLink
            href={href}
            className={cn(
                "group inline-flex items-center gap-2 text-[15px] font-medium",
                onInk ? "text-white" : "text-neutral-800",
                className,
            )}
        >
            {play && (
                <span className={cn("flex size-6 items-center justify-center rounded-full border", onInk ? "border-white/40" : "border-neutral-300")}>
                    <Play aria-hidden className="size-3 translate-x-px fill-current" />
                </span>
            )}
            <span className={cn("border-b pb-0.5 transition-colors", onInk ? "border-white/40 group-hover:border-white" : "border-neutral-300 group-hover:border-neutral-900")}>
                {children}
            </span>
        </SmartLink>
    )
}

/** A light outline button, as in the navbar's "Sign in". */
export function OutlineCta({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
    return (
        <SmartLink
            href={href}
            className={cn(
                "inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3.5 text-sm font-medium text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.04),inset_0_-1px_0_rgba(0,0,0,0.06)] transition-colors hover:border-neutral-300 hover:bg-neutral-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
                className,
            )}
        >
            {children}
        </SmartLink>
    )
}

/** A card or band on one of the five tones. */
export function Surface({ tone = "white", className, children, as: As = "div" }: {
    tone?: Tone
    className?: string
    children: ReactNode
    as?: "div" | "section" | "article" | "li"
}) {
    const t = TONE[tone]
    return <As className={cn(t.surface, t.ink, className)}>{children}</As>
}

/**
 * A page section: width, vertical rhythm, and an optional eyebrow + heading +
 * sub on the left, with an optional action on the right (fanout's "PLANS ...
 * View full pricing").
 */
export function Section({ id, eyebrow, title, sub, action, children, className, width = "wide" }: {
    id?: string
    eyebrow?: ReactNode
    title?: ReactNode
    sub?: ReactNode
    action?: ReactNode
    children: ReactNode
    className?: string
    width?: "wide" | "narrow"
}) {
    return (
        <section id={id} className={cn("scroll-mt-24 px-4 py-20 sm:px-6 md:py-28", className)}>
            <div className={cn("mx-auto", width === "wide" ? "max-w-7xl" : "max-w-3xl")}>
                {/* sh-reveal: the one site-wide scroll entrance (components/reveal.tsx),
                    CSS only; the heading arrives first, the content just after. */}
                {(eyebrow || title || action) && (
                    <div className="sh-reveal mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-12">
                        <div className="max-w-2xl">
                            {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
                            {title && (
                                <h2 className="font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
                                    {title}
                                </h2>
                            )}
                            {sub && <p className="mt-3 text-base leading-7 text-neutral-600">{sub}</p>}
                        </div>
                        {action}
                    </div>
                )}
                <div className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: "0.08s" }}>{children}</div>
            </div>
        </section>
    )
}
