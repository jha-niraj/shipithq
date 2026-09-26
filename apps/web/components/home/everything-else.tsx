import Link from "next/link"
import { ArrowRight, BookOpen, Compass, Lightbulb, Scale, Sparkles, Coins, IdCard, Info } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { SIGNUP_GRANT_CREDITS } from "@repo/pricing"
import { APP_URL } from "@/lib/site"
import { MONO, Section, TONE, type Tone } from "@/components/marketing/primitives"

/**
 * "Everything else on ShipItHQ" (plan/web/revamp REV-13), after fanout's numbered
 * tiles. Only surfaces that exist: three in the app, five on this site. App tiles
 * are plain <a> to the app origin (apps/web/CLAUDE.md, the separation rule); a
 * signed-out visitor is sent through sign-in and back.
 *
 * Sources: Pathfinder apps/main/app/(main)/pathfinder; public profile
 * apps/main/app/(public)/profile/[username]; credits packages/pricing.
 */

type Motion = "spin" | "bob" | "tilt" | "pulse" | "sway"
type Tile = { label: string; title: string; sub: string; href: string; Icon: typeof BookOpen; tone: Tone; motion: Motion; app?: boolean }

/** Each icon moves its own way (REV-78); reduced motion holds them still. */
const MOTION = `
@keyframes ee-spin { 0%,100% { transform: rotate(-12deg); } 50% { transform: rotate(18deg); } }
@keyframes ee-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes ee-tilt { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes ee-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes ee-sway { 0%,100% { transform: translateX(-5px); } 50% { transform: translateX(5px); } }
.ee-spin { animation: ee-spin 5s ease-in-out infinite; }
.ee-bob { animation: ee-bob 3.2s ease-in-out infinite; }
.ee-tilt { animation: ee-tilt 3.6s ease-in-out infinite; transform-origin: 50% 20%; }
.ee-pulse { animation: ee-pulse 2.6s ease-in-out infinite; }
.ee-sway { animation: ee-sway 3.4s ease-in-out infinite; }
.group:hover .ee-icon { animation-duration: 1.4s; }
@media (prefers-reduced-motion: reduce) { .ee-icon { animation: none !important; } }
`

const TILES: Tile[] = [
    { label: "Goals", title: "Pathfinder", sub: "Goals and interview prep from a job post", href: `${APP_URL}/pathfinder`, Icon: Compass, tone: "blush", motion: "spin", app: true },
    { label: "Your page", title: "Public profile", sub: "One link with your projects and resume", href: `${APP_URL}/profile`, Icon: IdCard, tone: "sage", motion: "bob", app: true },
    { label: "Pay as you go", title: "Credits", sub: `${SIGNUP_GRANT_CREDITS} free to start, no subscription`, href: "/pricing", Icon: Coins, tone: "sand", motion: "pulse" },
    { label: "Reading", title: "Guides", sub: "Interview prep, DSA, career", href: "/blogs", Icon: BookOpen, tone: "ink", motion: "bob" },
    { label: "Honest", title: "Compare", sub: "Against LeetCode, bootcamps and more", href: "/compare", Icon: Scale, tone: "coral", motion: "tilt" },
    { label: "Your say", title: "Ideas", sub: "Ask for features and content", href: "/ideas", Icon: Lightbulb, tone: "white", motion: "pulse" },
    { label: "Shipped", title: "What's new", sub: "Every month's changes", href: "/changelog", Icon: Sparkles, tone: "mint", motion: "spin" },
    { label: "Who we are", title: "About", sub: "The people building it", href: "/aboutus", Icon: Info, tone: "butter", motion: "sway" },
]

export function EverythingElse() {
    return (
        <Section eyebrow="And the rest" title="Everything else on ShipItHQ">
            <style>{MOTION}</style>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {TILES.map((tile, i) => {
                    const t = TONE[tile.tone]
                    const className = cn(
                        "group relative flex aspect-[4/5] h-full flex-col rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:aspect-[4/4.4] sm:p-5",
                        t.surface, t.ink,
                        tile.tone === "white" && "border border-neutral-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
                    )
                    const body = (
                        <>
                            <div className="flex items-start justify-between">
                                <span className={cn(MONO, "text-[10px] uppercase tracking-[0.14em]", t.muted)}>{tile.label}</span>
                                <span className={cn(MONO, "text-3xl font-medium leading-none tracking-tight sm:text-4xl")}>{String(i + 1).padStart(2, "0")}</span>
                            </div>
                            <div className="flex flex-1 items-center justify-center py-4">
                                <tile.Icon aria-hidden strokeWidth={1} className={cn("ee-icon size-20 sm:size-24", `ee-${tile.motion}`)} />
                            </div>
                            <div className="flex items-end justify-between gap-2">
                                <span>
                                    <span className="block text-lg font-semibold tracking-tight sm:text-xl">{tile.title}</span>
                                    <span className={cn("mt-0.5 block text-[12px] leading-4 sm:text-[13px]", t.muted)}>{tile.sub}</span>
                                </span>
                                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:translate-x-0.5", t.rule)}>
                                    <ArrowRight className="size-4" aria-hidden />
                                </span>
                            </div>
                        </>
                    )
                    return (
                        <li key={tile.title} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${(i % 4) * 0.06}s` }}>
                            {tile.app
                                ? <a href={tile.href} className={className}>{body}</a>
                                : <Link href={tile.href} className={className}>{body}</Link>}
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}
