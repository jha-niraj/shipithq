"use client"

import { Check, Lock } from "lucide-react"

import { cn } from "../lib/utils"
import { GlowCard, GlowCardGrid, type GlowCardGridProps } from "./glow-card-grid"

/*
 * A badge, the base every badge on ShipItHQ is drawn with (plan/ui-pass UI-20, plan/
 * badges). Earned: the medal lit, the card glowing where the pointer is, "Earned" and the
 * date. Locked: the same card flat with a dashed outline, the medal as an outline, and
 * a progress bar where the rule has one ("2 of 3 days"). Only earned badges glow, so
 * earning one visibly changes it (Niraj, 2026-09-28).
 *
 * The art is a `BadgeMedal` with a glyph, or anything else; a module brings its own
 * glyphs and keeps its rules. Put cards in a `BadgeGrid` so the glow follows the pointer.
 */

// ─── The medal ───────────────────────────────────────────────────────────────

const MEDAL_MOTION = `
.bm * { transform-box: fill-box; }
@keyframes bm-ring { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 0; } }
@keyframes bm-glyph { 0% { transform: scale(.6) rotate(-12deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
@keyframes bm-sweep { 0%, 55% { transform: translateX(-90px) rotate(20deg); } 100% { transform: translateX(110px) rotate(20deg); } }
@keyframes bm-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.bm-anim .bm-ring { stroke-dasharray: 260; animation: bm-ring 1.4s cubic-bezier(.2,.7,.2,1) both; }
.bm-anim .bm-glyph { transform-origin: center; animation: bm-glyph .7s .5s cubic-bezier(.3,1.4,.5,1) both; }
.bm-anim .bm-sweep { animation: bm-sweep 3.6s ease-in-out infinite; }
.bm-anim .bm-float { animation: bm-float 4s ease-in-out infinite; }
.group:hover .bm-anim .bm-float { animation-duration: 1.6s; }
@media (prefers-reduced-motion: reduce) { .bm * { animation: none !important; } }
`

/** The medal's keyframes; render once on a page that shows medals. */
export function BadgeMedalStyles() {
  return <style>{MEDAL_MOTION}</style>
}

const HEX = "M60 8 L105 34 L105 86 L60 112 L15 86 L15 34 Z"

export type BadgeMedalProps = {
  /** SVG strokes drawn around (0, 0) in a 120 box: about 30 across reads best. */
  glyph: React.ReactNode
  earned: boolean
  /** The ring drawing itself, the glyph settling, the light sweep. Off for the glow copy. */
  animate?: boolean
  /** Unique per medal on a page (the sweep's clip path). */
  id: string
  className?: string
}

/**
 * An ink hexagon medal (plan/incidents INC-12, moved here for every module). Earned: filled,
 * ringed, glyph in the opposite ink, a light sweep. Locked: a dashed outline, still.
 */
export function BadgeMedal({ glyph, earned, animate = true, id, className }: BadgeMedalProps) {
  const clip = `bm-clip-${id}`
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("bm", animate && "bm-anim", className)}>
      <defs>
        <clipPath id={clip}><path d={HEX} /></clipPath>
      </defs>
      <g className={earned ? "bm-float" : undefined}>
        {earned ? (
          <>
            <path d={HEX} className="fill-neutral-900 dark:fill-white" />
            <path d={HEX} fill="none" strokeWidth={3} className="bm-ring stroke-neutral-400" />
            {animate && (
              <g clipPath={`url(#${clip})`}>
                <rect className="bm-sweep" x={20} y={-20} width={26} height={160} fill="white" opacity={0.18} />
              </g>
            )}
            {/* The translate and the pop-in on separate groups: the animation's CSS
                transform would otherwise replace the SVG translate and pin the glyph to
                the medal's top-left corner. */}
            <g transform="translate(60 60)">
              <g className="bm-glyph">
                <g fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="stroke-white dark:stroke-neutral-900">{glyph}</g>
              </g>
            </g>
          </>
        ) : (
          <>
            <path d={HEX} fill="none" strokeWidth={1.8} strokeDasharray="5 5" className="stroke-neutral-300 dark:stroke-neutral-700" />
            <g transform="translate(60 60)" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-neutral-300 dark:stroke-neutral-700">{glyph}</g>
          </>
        )}
      </g>
    </svg>
  )
}

// ─── The grid and the card ───────────────────────────────────────────────────

/**
 * A grid of badges with the glow tuned for ink and white art: a bright, colourless light
 * in dark mode; in light mode, where a brightened border would vanish into white, a
 * darker, higher-contrast shade. Pass any `GlowCardGrid` prop to override.
 */
export function BadgeGrid({ className, ...props }: GlowCardGridProps) {
  return (
    <GlowCardGrid
      cardRadius={18}
      iconSaturate={1}
      borderSaturate={1}
      className={cn(
        "grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
        // Light mode: darken where the ink art passes; dark mode keeps the brightening defaults.
        "[--card-border-brightness:0.8] [--card-border-contrast:1.6] [--card-icon-opacity:0.22]",
        "dark:[--card-border-brightness:2.5] dark:[--card-border-contrast:2.5] dark:[--card-icon-opacity:0.35]",
        className
      )}
      {...props}
    />
  )
}

export type BadgeCardProps = {
  /** Stable and unique on the page. */
  id: string
  /** The medal's glyph (see `BadgeMedal`). */
  glyph: React.ReactNode
  title: string
  /** How it is earned, one sentence. */
  description: string
  earned: boolean
  /** When it was earned; shown as a date under "Earned". */
  earnedAt?: Date | string | null
  /** Where a locked badge stands, e.g. { value: 2, max: 3, label: "2 of 3 days" }. */
  progress?: { value: number; max: number; label?: string } | null
  /** A small line above the title: the module, a tier. */
  eyebrow?: string
  className?: string
}

export function BadgeCard({ id, glyph, title, description, earned, earnedAt, progress, eyebrow, className }: BadgeCardProps) {
  const pct = progress && progress.max > 0 ? Math.max(0, Math.min(100, (progress.value / progress.max) * 100)) : null
  const date = earnedAt ? new Date(earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null
  return (
    <GlowCard
      glow={earned}
      art={<BadgeMedal id={`${id}-glow`} glyph={glyph} earned animate={false} className="size-full" />}
      role="group"
      aria-label={`${title}: ${earned ? `earned${date ? ` ${date}` : ""}` : "not earned yet"}. ${description}`}
      className={cn(
        "group h-full",
        earned ? "bg-white dark:bg-neutral-950" : "bg-transparent ring-0 outline-1 -outline-offset-1 outline-dashed outline-neutral-300 dark:outline-neutral-700",
        className
      )}
    >
      <div className="flex flex-1 flex-col items-center px-4 pt-5 pb-4 text-center">
        <BadgeMedal id={id} glyph={glyph} earned={earned} className="size-20 shrink-0" />
        {eyebrow && <p className="mt-3 font-mono text-[10px] tracking-wider text-neutral-500 uppercase">{eyebrow}</p>}
        <p className={cn("text-[14px] font-semibold leading-snug", eyebrow ? "mt-1" : "mt-3", earned ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400")}>
          {title}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-neutral-500 dark:text-neutral-400">{description}</p>
        <div className="mt-auto w-full pt-3">
          {earned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 font-mono text-[10.5px] text-white dark:bg-white dark:text-neutral-900">
              <Check className="size-3" aria-hidden /> Earned{date ? ` ${date}` : ""}
            </span>
          ) : pct !== null ? (
            <div className="mx-auto w-full max-w-36">
              <div className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${Math.max(3, pct)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 tabular-nums">{progress!.label ?? `${progress!.value} of ${progress!.max}`}</p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500"><Lock className="size-3" aria-hidden /> Not earned yet</span>
          )}
        </div>
      </div>
    </GlowCard>
  )
}
