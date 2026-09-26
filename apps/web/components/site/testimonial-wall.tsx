import Image from "next/image"
import { Linkedin, Mail } from "lucide-react"
import { FaXTwitter } from "react-icons/fa6"
import { cn } from "@repo/ui/lib/utils"
import { MIN_TESTIMONIALS, type Testimonial } from "@/content/testimonials/types"
import { showDemoTestimonials } from "@/content/testimonials/demo"
import { Section } from "@/components/marketing/primitives"

/**
 * The testimonial wall (plan/web/revamp REV-14), after fanout's "engineers love
 * fanout": post-shaped cards in two rows drifting in opposite directions.
 *
 * Renders NOTHING under MIN_TESTIMONIALS real entries - an empty section is better
 * than a thin or invented one (content/testimonials/types.ts).
 *
 * REV-117 (Niraj, 2026-09-26: "this is good but see what more we can do"): a spotlight
 * quote in large type opens the wall, a factual line counts the voices by source (no
 * ratings, nothing invented), and each card gains a quote mark and a hover lift.
 *
 * Pure CSS: each row is its list twice, translated by -50% on a loop, so the seam is
 * invisible. Hover or focus inside a row pauses it; reduced motion turns the rows
 * into a static, wrapping grid. Server component, no JS shipped.
 */

const SOURCE = {
    x: { Icon: FaXTwitter, label: "X", read: "Read on X" },
    linkedin: { Icon: Linkedin, label: "LinkedIn", read: "Read on LinkedIn" },
    email: { Icon: Mail, label: "Email", read: null },
} as const

const AVATAR_TONES = ["#F2C9C4", "#A8D5BA", "#EFD9A0", "#F4B69C", "#BFE3D0", "#F5E6A8"]

const STYLES = `
@keyframes tw-left { to { transform: translateX(-50%); } }
@keyframes tw-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.tw-row { animation: tw-left var(--tw-dur, 80s) linear infinite; }
.tw-row[data-dir="right"] { animation-name: tw-right; }
.tw-track:hover .tw-row, .tw-track:focus-within .tw-row { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .tw-row { animation: none; flex-wrap: wrap; justify-content: center; width: auto !important; }
  .tw-row [data-dup] { display: none; }
}
`

function formatDate(iso: string) {
    const d = new Date(`${iso}T00:00:00Z`)
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

function Card({ t, duplicate }: { t: Testimonial; duplicate?: boolean }) {
    const s = SOURCE[t.source]
    return (
        <figure
            data-dup={duplicate ? "" : undefined}
            aria-hidden={duplicate || undefined}
            className="group/card flex w-[19rem] shrink-0 flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_16px_32px_-18px_rgba(0,0,0,0.3)] motion-reduce:hover:translate-y-0 sm:w-[21rem]"
        >
            <figcaption className="flex items-start gap-3">
                <Avatar t={t} size={40} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">{t.name}</span>
                    <span className="block truncate text-xs text-neutral-600">
                        {t.handle ? `@${t.handle} · ` : ""}{t.role}
                    </span>
                </span>
                <s.Icon className="size-4 shrink-0 text-neutral-900" aria-label={s.label} />
            </figcaption>
            <blockquote className="relative mt-4 line-clamp-6 flex-1 pl-5 text-[15px] leading-6 text-neutral-800">
                <span aria-hidden className="absolute -top-1 left-0 font-display text-3xl leading-none text-neutral-300 transition-colors group-hover/card:text-neutral-900">&ldquo;</span>
                {t.text}
            </blockquote>
            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                <time dateTime={t.date}>{formatDate(t.date)}</time>
                {t.url && s.read && (
                    <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={duplicate ? -1 : undefined}
                        className="font-medium text-neutral-900 underline-offset-4 hover:underline"
                    >
                        {s.read}
                    </a>
                )}
            </div>
        </figure>
    )
}

/** Initials on a pastel circle, picked from the name so it is stable. */
function Avatar({ t, size }: { t: Testimonial; size: number }) {
    return t.avatar ? (
        <Image src={t.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
        <span
            aria-hidden
            className="flex shrink-0 items-center justify-center rounded-full font-semibold text-neutral-900"
            style={{ width: size, height: size, fontSize: size * 0.34, background: AVATAR_TONES[[...t.name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TONES.length] }}
        >
            {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
    )
}

/** The spotlight: one quote, large, on a pastel panel. */
function Spotlight({ t }: { t: Testimonial }) {
    const s = SOURCE[t.source]
    return (
        <figure className="sh-reveal mb-10 grid gap-8 rounded-3xl bg-[#F5E6A8] p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end lg:p-12">
            <blockquote className="relative font-display text-2xl font-medium leading-snug tracking-tight text-neutral-900 sm:text-[1.75rem] lg:text-[2rem]">
                <span aria-hidden className="mb-3 block text-6xl leading-none text-neutral-900/25">&ldquo;</span>
                {t.text}
            </blockquote>
            <figcaption className="flex items-center gap-3 border-t border-neutral-900/15 pt-5 lg:flex-col lg:items-start lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <Avatar t={t} size={48} />
                <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-neutral-900">{t.name}</span>
                    <span className="block text-[13px] text-neutral-700">{t.handle ? `@${t.handle} · ` : ""}{t.role}</span>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-neutral-700">
                        <s.Icon className="size-3.5" aria-hidden /> {s.label} · <time dateTime={t.date}>{formatDate(t.date)}</time>
                    </span>
                </span>
            </figcaption>
        </figure>
    )
}

/** "12 voices · 6 on X · 4 on LinkedIn · 2 by email", from the list itself. */
function Sources({ items }: { items: Testimonial[] }) {
    const by = (src: Testimonial["source"]) => items.filter((t) => t.source === src).length
    const parts = ([["x", "on X"], ["linkedin", "on LinkedIn"], ["email", "by email"]] as const)
        .map(([k, l]) => ({ k, n: by(k), l }))
        .filter((p) => p.n > 0)
    return (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-neutral-600">
            <span className="font-medium text-neutral-900">{items.length} voices</span>
            {parts.map((p) => {
                const Icon = SOURCE[p.k].Icon
                return <span key={p.k} className="inline-flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden />{p.n} {p.l}</span>
            })}
        </p>
    )
}

function Row({ items, dir, duration }: { items: Testimonial[]; dir: "left" | "right"; duration: number }) {
    return (
        <div className="tw-track overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div
                className="tw-row flex w-max gap-4 py-2"
                data-dir={dir}
                style={{ ["--tw-dur" as string]: `${duration}s` }}
            >
                {items.map((t, i) => <Card key={`a-${i}`} t={t} />)}
                {items.map((t, i) => <Card key={`b-${i}`} t={t} duplicate />)}
            </div>
        </div>
    )
}

export function TestimonialWall({ id, testimonials: real, demo, title, eyebrow = "WHAT PEOPLE SAY", className }: {
    id?: string
    testimonials: Testimonial[]
    /** Demo quotes, used only while `real` is short and the demo gate is open (content/testimonials/demo.ts). */
    demo?: Testimonial[]
    title: React.ReactNode
    eyebrow?: string
    className?: string
}) {
    const isDemo = real.length < MIN_TESTIMONIALS && !!demo && showDemoTestimonials()
    const testimonials = isDemo ? demo! : real
    if (testimonials.length < MIN_TESTIMONIALS) return null

    // The spotlight leaves the rows. The rest split into two rows; each moves at a speed
    // proportional to its length, so a longer row does not race.
    const spot = testimonials.find((t) => t.featured) ?? testimonials[0]!
    const rest = testimonials.filter((t) => t !== spot)
    const mid = Math.ceil(rest.length / 2)
    const top = rest.slice(0, mid)
    const bottom = rest.slice(mid)

    return (
        <Section id={id} eyebrow={isDemo ? `${eyebrow} · Demo content` : eyebrow} title={title} action={<Sources items={testimonials} />} className={cn("overflow-hidden", className)}>
            <style>{STYLES}</style>
            <Spotlight t={spot} />
            <div className="-mx-4 space-y-4 sm:-mx-6">
                <Row items={top} dir="left" duration={top.length * 9} />
                {bottom.length > 0 && <Row items={bottom} dir="right" duration={bottom.length * 9} />}
            </div>
        </Section>
    )
}

export default TestimonialWall
