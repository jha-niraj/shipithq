"use client"

import * as React from "react"
import { StatBandSkeleton } from "./ui/stat-band"
import { cn } from "../lib/utils"

/**
 * Shared skeleton kit.
 *
 * Every primitive here mirrors a real layout component one-for-one - same grid, same
 * radius, same border, same padding, same internal blocks - so a placeholder occupies
 * exactly the space its content will. Pages compose these in the same order they compose
 * the real thing, which is what stops the layout reflowing the moment data arrives.
 *
 * The shapes follow this codebase's idioms, not generic ones:
 *   - cards are `rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800
 *     dark:bg-neutral-900`
 *   - page headers are an icon tile + title + subtitle on the left, actions on the right
 *   - bounded pages are `flex h-[calc(100dvh-2.5rem)] flex-col gap-4 overflow-hidden` with a
 *     `shrink-0` header and a `flex-1 min-h-0` body
 *
 * Use `BoundedPageSkeleton` for pages whose root is height-bounded and `PageSkeleton` for
 * pages that flow normally, matching whichever the real page uses.
 */

// ─────────────────────────────────────────────────────────────────────────────
// The block
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single placeholder block.
 *
 * Uses the sweeping `gk-shimmer` gradient rather than `animate-pulse`: a whole page of
 * blocks fading in unison reads as a stalled screen, while a sweep reads as work in
 * progress. Pass `delay` so a group ripples instead of blinking as one. `gk-shimmer`
 * collapses to a still block under `prefers-reduced-motion`.
 */
export function Shimmer({
    className,
    style,
    delay,
}: {
    className?: string
    style?: React.CSSProperties
    /** Seconds to offset the sweep by, so a group of blocks ripples instead of pulsing as one. */
    delay?: number
}) {
    return (
        <div
            aria-hidden
            style={delay ? { ...style, animationDelay: `${delay}s` } : style}
            className={cn(
                "gk-shimmer rounded-md bg-neutral-200/80 dark:bg-neutral-800",
                className,
            )}
        />
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shells
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A normally-flowing page root. Deliberately carries NO padding - the app shell already
 * pads every page, and a second layer double-pads and leaves a right-edge gap.
 */
export function PageSkeleton({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("w-full space-y-6", className)} role="status" aria-busy="true">
            <span className="sr-only">Loading</span>
            {children}
        </div>
    )
}

/**
 * The height-bounded page root used by pages that scroll their content internally.
 *
 * The height comes from `--gk-page-h`, which each app's shell publishes because the shell is
 * the only element that knows every term (its own margin, its border or ring, and any padding
 * or mobile header offset it adds). A skeleton that re-derived that sum would drift the moment
 * the shell's chrome changed - and being even 2px over is enough to scroll the shell. The
 * fallback keeps this usable in a surface that has not defined the variable.
 *
 * Do NOT swap this for `h-full`: Radix's ScrollArea wraps its children in a `display: table`
 * element, and percentage heights do not resolve through a table box, so `h-full` computes to
 * `auto` and the skeleton grows unbounded.
 *
 * Put `shrink-0` bands first and end with a `flex-1 min-h-0` region (see `BoundedBody`).
 */
export function BoundedPageSkeleton({
    children,
    className,
    bounded = true,
}: {
    children: React.ReactNode
    className?: string
    /**
     * `true` bounds at every width; `'lg'` bounds only from the `lg` breakpoint up and lets the page
     * flow below it.
     *
     * `'lg'` exists because a family of finance and billing pages carries a deliberate,
     * pixel-measured mobile fix - `lg:h-[var(--gk-page-h)] lg:overflow-hidden` - after their
     * fixed-height roots were found clipping real content on a phone (Salaries: 1120px of content
     * against a 536px bound). This component had only an all-or-nothing bound, so every page that
     * got that fix silently desynced from its own skeleton the moment it landed: below `lg` the
     * skeleton was a short clipped box and the real page snapped open to full height on load. That
     * is the exact jump a skeleton exists to prevent, reintroduced by the skeleton itself.
     *
     * **Match whatever the client does, breakpoint included.** A bound at a different breakpoint is
     * not a smaller mistake than no bound at all.
     */
    bounded?: boolean | 'lg'
}) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn(
                "flex flex-col gap-4",
                bounded === 'lg'
                    ? "lg:h-[var(--gk-page-h,calc(100dvh-2.5rem))] lg:overflow-hidden"
                    : bounded
                        ? "h-[var(--gk-page-h,calc(100dvh-2.5rem))] overflow-hidden"
                        : "",
                className,
            )}
        >
            <span className="sr-only">Loading</span>
            {children}
        </div>
    )
}

/** The `flex-1 min-h-0` region inside a bounded page that the real ScrollArea occupies. */
export function BoundedBody({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return <div className={cn("min-h-0 flex-1", className)}>{children}</div>
}

/** The card chrome shared by every panel, table, and tile in the app. */
export function SkeletonCard({
    children,
    className,
}: {
    children?: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
                className,
            )}
        >
            {children}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Headers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The page's REAL title in a skeleton (navigation-speed playbook section 2): a title and its
 * static description do not depend on data, and the skeleton is what a click paints - on a slow
 * connection for seconds. Rendered in the real header's own type classes so the text sits exactly
 * where the page's will. Pass a `<Shimmer>` as the subtitle when the real one is data (a date, a
 * count); leave `title` unset only when the title itself is data (a person's name).
 */
export function SkeletonTitle({ title, subtitle, withSubtitle = true }: {
    title?: React.ReactNode
    subtitle?: React.ReactNode
    withSubtitle?: boolean
}) {
    return (
        <div className="min-w-0">
            {title !== undefined ? (
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
            ) : (
                <Shimmer className="h-7 w-48" />
            )}
            {withSubtitle && (
                subtitle !== undefined
                    ? typeof subtitle === "string"
                        ? <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
                        : <div className="mt-0.5">{subtitle}</div>
                    : <Shimmer className="mt-1.5 h-4 w-72 max-w-full" />
            )}
        </div>
    )
}

/**
 * The page header this app uses everywhere: an optional rounded icon tile, the title and
 * subtitle beside it, and action buttons pushed to the right.
 *
 * `actions` should match the real button count so the right edge does not jump. `title` and
 * `subtitle` carry the page's real static text (see `SkeletonTitle`).
 */
export function PageHeaderSkeleton({
    withIcon = true,
    withSubtitle = true,
    actions: actionsProp,
    action,
    title,
    subtitle,
    className,
}: {
    withIcon?: boolean
    withSubtitle?: boolean
    /** Number of action buttons the real header renders. Pass 0 for a header with none. */
    actions?: number
    /** Kept for shipithq apps: `action={false}` is `actions={0}`, `action` alone is one button. */
    action?: boolean
    /** The page's exact title, character for character. Unset only when the title is data. */
    title?: React.ReactNode
    /** The exact static description, or a `<Shimmer>` where it is data. */
    subtitle?: React.ReactNode
    className?: string
}) {
    const actions = actionsProp ?? (action === false ? 0 : 1)
    return (
        <div
            className={cn(
                "flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                {withIcon && <Shimmer className="h-9 w-9 shrink-0 rounded-xl" />}
                <SkeletonTitle title={title} subtitle={subtitle} withSubtitle={withSubtitle} />
            </div>
            {actions > 0 && (
                <div className="flex shrink-0 items-center gap-2">
                    {Array.from({ length: actions }).map((_, i) => (
                        <Shimmer
                            key={i}
                            className={cn("h-10 rounded-xl", i === 0 ? "w-36" : "w-28")}
                            delay={i * 0.06}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

/** The back-link + identity block that opens every detail page. */
export function DetailHeaderSkeleton({
    withBack = true,
    actions = 1,
    badges = 2,
}: {
    withBack?: boolean
    actions?: number
    badges?: number
}) {
    return (
        <div className="shrink-0 space-y-4">
            {withBack && <Shimmer className="h-4 w-28" />}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <Shimmer className="h-12 w-12 shrink-0 rounded-xl" />
                    <div className="min-w-0 space-y-2">
                        <Shimmer className="h-6 w-52" />
                        <Shimmer className="h-4 w-64 max-w-full" />
                        {badges > 0 && (
                            <div className="flex gap-1.5 pt-0.5">
                                {Array.from({ length: badges }).map((_, i) => (
                                    <Shimmer
                                        key={i}
                                        className={cn(
                                            "h-5 rounded-full",
                                            i === 0 ? "w-16" : "w-20",
                                        )}
                                        delay={i * 0.06}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {actions > 0 && (
                    <div className="flex shrink-0 gap-2">
                        {Array.from({ length: actions }).map((_, i) => (
                            <Shimmer
                                key={i}
                                className="h-9 w-32 rounded-xl"
                                delay={i * 0.06}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The stat band's loading shape.
 *
 * Both of these now render `StatBandSkeleton` from `./ui/stat-band`: every screen's headline
 * numbers are ONE connected band (see the root CLAUDE.md, "STATS ARE ONE BAND"), so a skeleton
 * of separate cards was the wrong shape for every page that used it. The names are kept so
 * existing loaders keep compiling; new code imports `StatBandSkeleton` directly and passes the
 * same `count`, `cols` and `size` as its live band.
 */
export function StatRowSkeleton({
    count = 4,
    columns = 4,
    className,
}: {
    count?: number
    columns?: 2 | 3 | 4 | 5 | 6
    /** @deprecated the band always has an icon chip */
    withIcon?: boolean
    /** @deprecated the band has one shape */
    lines?: 2 | 3
    className?: string
}) {
    return <StatBandSkeleton count={count} cols={columns} className={className} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Controls
// ─────────────────────────────────────────────────────────────────────────────

/** A search field with filter selects beside it, in its own card the way the pages do. */
export function FilterBarSkeleton({
    filters = 2,
    inCard = true,
}: {
    filters?: number
    /** Most pages wrap the search row in a bordered card; some render it bare. */
    inCard?: boolean
}) {
    const row = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Shimmer className="h-10 min-w-0 flex-1 rounded-xl" />
            {filters > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: filters }).map((_, i) => (
                        <Shimmer key={i} className="h-10 w-40 rounded-xl" delay={i * 0.05} />
                    ))}
                </div>
            )}
        </div>
    )
    return inCard ? (
        <SkeletonCard className="shrink-0 p-4">{row}</SkeletonCard>
    ) : (
        <div className="shrink-0">{row}</div>
    )
}

/** The tab strip that sits above a table or panel. */
export function TabStripSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="flex shrink-0 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/60">
            {Array.from({ length: count }).map((_, i) => (
                <Shimmer
                    key={i}
                    className="h-8 flex-1 rounded-lg bg-neutral-200/70 dark:bg-neutral-700/60"
                    delay={i * 0.07}
                />
            ))}
        </div>
    )
}

/** A row of filter pills or chips. */
export function ChipRowSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="flex shrink-0 flex-wrap gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <Shimmer key={i} className="h-8 w-24 rounded-full" delay={i * 0.06} />
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables and lists
// ─────────────────────────────────────────────────────────────────────────────

// Varied widths so a row reads as columns of data rather than one long bar.
const CELL_WIDTHS = ["w-40", "w-28", "w-24", "w-32", "w-20", "w-24", "w-16"]

/**
 * Mirrors a data table: the bordered card, a tinted header row, body rows, and an optional
 * pagination bar. `cols` should match the real column count so the placeholder cells land
 * near the loaded ones. Columns past the second hide on small screens, matching how the
 * real tables drop columns down.
 */
export function TableSkeleton({
    rows = 8,
    cols: colsProp,
    columns,
    withAvatar = false,
    withPagination = false,
    withHeader = true,
    className,
}: {
    rows?: number
    cols?: number
    /** Kept for shipithq apps - alias of `cols`. */
    columns?: number
    withAvatar?: boolean
    withPagination?: boolean
    withHeader?: boolean
    className?: string
}) {
    const cols = colsProp ?? columns ?? 5
    return (
        <SkeletonCard className={cn("overflow-hidden", className)}>
            {withHeader && (
                <div className="flex items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
                    {withAvatar && <div className="h-8 w-8 shrink-0" />}
                    {Array.from({ length: cols }).map((_, i) => (
                        <Shimmer
                            key={i}
                            className={cn(
                                "h-3",
                                i === 0 ? "min-w-0 flex-1" : CELL_WIDTHS[i % CELL_WIDTHS.length],
                                i > 1 && "hidden sm:block",
                                i > 3 && "hidden lg:block",
                            )}
                        />
                    ))}
                </div>
            )}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex items-center gap-4 px-5 py-4">
                        {withAvatar && (
                            <Shimmer className="h-9 w-9 shrink-0 rounded-full" delay={r * 0.04} />
                        )}
                        {Array.from({ length: cols }).map((_, c) => (
                            <Shimmer
                                key={c}
                                delay={r * 0.04}
                                className={cn(
                                    "h-4",
                                    c === 0 ? "min-w-0 flex-1" : CELL_WIDTHS[c % CELL_WIDTHS.length],
                                    c > 1 && "hidden sm:block",
                                    c > 3 && "hidden lg:block",
                                )}
                            />
                        ))}
                    </div>
                ))}
            </div>
            {withPagination && (
                <div className="flex items-center justify-between gap-4 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
                    <Shimmer className="h-3 w-40" />
                    <div className="flex gap-2">
                        <Shimmer className="h-8 w-20 rounded-lg" />
                        <Shimmer className="h-8 w-20 rounded-lg" />
                    </div>
                </div>
            )}
        </SkeletonCard>
    )
}

/**
 * A bordered panel with a title/subtitle header and stacked rows - the shape used by every
 * "recent activity" / settings / summary panel in the app.
 */
export function SectionCardSkeleton({
    rows = 4,
    withHeader = true,
    withTrailing = true,
    className,
}: {
    rows?: number
    withHeader?: boolean
    /** The right-hand badge or value most of these rows carry. */
    withTrailing?: boolean
    className?: string
}) {
    return (
        <SkeletonCard className={cn("overflow-hidden", className)}>
            {withHeader && (
                <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                    <Shimmer className="h-4 w-40" />
                    <Shimmer className="mt-2 h-3 w-56" />
                </div>
            )}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Shimmer className="h-3.5 w-1/3" delay={i * 0.05} />
                            <Shimmer className="h-3 w-2/3" delay={i * 0.05} />
                        </div>
                        {withTrailing && (
                            <Shimmer className="h-6 w-20 shrink-0 rounded-full" delay={i * 0.05} />
                        )}
                    </div>
                ))}
            </div>
        </SkeletonCard>
    )
}

/** A stack of standalone cards - the list shape used where rows are cards, not table rows. */
export function CardListSkeleton({
    count = 4,
    withAvatar = false,
    withActions = true,
    lines = 2,
}: {
    count?: number
    withAvatar?: boolean
    withActions?: boolean
    lines?: number
}) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} className="flex items-start gap-3 px-5 py-4">
                    {withAvatar && (
                        <Shimmer className="h-10 w-10 shrink-0 rounded-full" delay={i * 0.06} />
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                        <Shimmer className="h-5 w-48 max-w-full" delay={i * 0.06} />
                        {Array.from({ length: Math.max(0, lines - 1) }).map((_, j) => (
                            <Shimmer
                                key={j}
                                className={cn("h-4 max-w-full", j === 0 ? "w-64" : "w-40")}
                                delay={i * 0.06}
                            />
                        ))}
                    </div>
                    {withActions && (
                        <div className="flex shrink-0 items-center gap-1">
                            <Shimmer className="h-8 w-8 rounded-lg" delay={i * 0.06} />
                            <Shimmer className="h-8 w-8 rounded-lg" delay={i * 0.06} />
                        </div>
                    )}
                </SkeletonCard>
            ))}
        </div>
    )
}

/** A responsive grid of content cards - used by gallery, people, and module grids. */
export function CardGridSkeleton({
    count = 6,
    columns = 3,
    withMedia = false,
    withAvatar = false,
}: {
    count?: number
    columns?: 2 | 3 | 4
    /** Cards that lead with an image or preview block. */
    withMedia?: boolean
    withAvatar?: boolean
}) {
    return (
        <div
            className={cn(
                "grid grid-cols-1 gap-4 sm:grid-cols-2",
                columns === 3 && "lg:grid-cols-3",
                columns === 4 && "lg:grid-cols-4",
            )}
        >
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} className="overflow-hidden">
                    {withMedia && <Shimmer className="h-40 w-full rounded-none" delay={i * 0.06} />}
                    <div className="space-y-3 p-5">
                        <div className="flex items-start gap-3">
                            {withAvatar && (
                                <Shimmer className="h-10 w-10 shrink-0 rounded-full" delay={i * 0.06} />
                            )}
                            <div className="min-w-0 flex-1 space-y-2">
                                <Shimmer className="h-4 w-32" delay={i * 0.06} />
                                <Shimmer className="h-3 w-40 max-w-full" delay={i * 0.06} />
                            </div>
                            <Shimmer className="h-5 w-16 shrink-0 rounded-full" delay={i * 0.06} />
                        </div>
                        <Shimmer className="h-3 w-full" delay={i * 0.06} />
                        <Shimmer className="h-3 w-2/3" delay={i * 0.06} />
                    </div>
                </SkeletonCard>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Charts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The plot area only, with no card chrome. Render this INSIDE a real chart card while that
 * chart's own query is pending, so the card title stays put and only the plot swaps.
 *
 * Without it, a chart whose query resolves late shows the empty state ("No data for this
 * period"), which claims the period is genuinely empty. The bars are staggered so the
 * placeholder reads as a chart rather than a grey slab.
 */
export function ChartLoading({ height = 240 }: { height?: number }) {
    const bars = [52, 74, 41, 88, 63, 96, 58, 79, 47, 84, 68, 92]
    return (
        <div
            aria-hidden
            className="flex w-full items-end gap-1.5 sm:gap-2"
            style={{ height }}
        >
            {bars.map((h, i) => (
                <Shimmer
                    key={i}
                    delay={i * 0.07}
                    className="min-w-0 flex-1 rounded-t-md rounded-b-sm"
                    style={{ height: `${h}%` }}
                />
            ))}
        </div>
    )
}

/** A chart in its card: title and subtitle over the plot area. */
export function ChartCardSkeleton({
    height = 240,
    className,
}: {
    height?: number
    className?: string
    /** Kept for shipithq apps - accepted and ignored (the sweep is shared). */
    delay?: number
}) {
    return (
        <SkeletonCard className={className}>
            <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                <Shimmer className="h-4 w-40" />
                <Shimmer className="mt-2 h-3 w-56" />
            </div>
            <div className="p-5">
                <ChartLoading height={height} />
            </div>
        </SkeletonCard>
    )
}

/** The chart grid pages use: `grid gap-4 lg:grid-cols-N`. */
export function ChartGridSkeleton({
    count = 2,
    columns = 2,
    height = 240,
}: {
    count?: number
    columns?: 1 | 2 | 3
    height?: number
}) {
    return (
        <div
            className={cn(
                "grid gap-4",
                columns === 2 && "lg:grid-cols-2",
                columns === 3 && "lg:grid-cols-3",
            )}
        >
            {Array.from({ length: count }).map((_, i) => (
                <ChartCardSkeleton key={i} height={height} />
            ))}
        </div>
    )
}

/** A key/value fact panel - the detail-page shape of label on the left, value on the right. */
export function FactPanelSkeleton({
    rows = 5,
    withHeader = true,
}: {
    rows?: number
    withHeader?: boolean
}) {
    return (
        <SkeletonCard className="overflow-hidden">
            {withHeader && (
                <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                    <Shimmer className="h-4 w-36" />
                </div>
            )}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                        <Shimmer className="h-3 w-28 shrink-0" delay={i * 0.05} />
                        <Shimmer className="h-4 w-36" delay={i * 0.05} />
                    </div>
                ))}
            </div>
        </SkeletonCard>
    )
}

/** A block of prose - article bodies, descriptions, long text panels. */
export function ProseSkeleton({ lines = 5 }: { lines?: number }) {
    // Ragged widths so it reads as paragraph text rather than a stack of bars.
    const widths = ["w-full", "w-11/12", "w-full", "w-10/12", "w-9/12", "w-full", "w-8/12"]
    return (
        <div className="space-y-2.5">
            {Array.from({ length: lines }).map((_, i) => (
                <Shimmer
                    key={i}
                    className={cn("h-4", widths[i % widths.length])}
                    delay={i * 0.05}
                />
            ))}
        </div>
    )
}

/** The empty-ish centred block used while a whole panel resolves inside a bounded page. */
export function PanelSkeleton({
    className,
    children,
}: {
    className?: string
    children?: React.ReactNode
}) {
    return (
        <SkeletonCard className={cn("h-full overflow-hidden p-5", className)}>
            {children}
        </SkeletonCard>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel and dropdown interiors
//
// Everything above shapes a PAGE. These two shape the insides of a panel, a sheet or a dropdown -
// the places that had been showing a centred spinner because the kit offered nothing their size.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A plain list of rows. No card chrome, no border.
 *
 * `CardListSkeleton` draws each row as a bordered card, which is right on a page and wrong inside a
 * 288px dropdown or a divided panel list - there the real rows have no border of their own, so a
 * stack of bordered blocks is a different shape from the thing it stands in for, and the layout
 * still jumps when the data lands.
 *
 * This is the shape behind the notifications list, the chat history dropdown, a document picker and
 * a student picker: an optional leading mark, a strong line, and an optional weaker one under it.
 */
export function RowListSkeleton({
    count = 5,
    withIcon = true,
    lines = 2,
    divided = false,
    card = false,
    className,
}: {
    count?: number
    withIcon?: boolean
    /** 1 for a picker row, 2 for a title with a meta line, 3 for a title with a body under it. */
    lines?: 1 | 2 | 3
    /** Hairlines between rows, for a list whose real version is divided. */
    divided?: boolean
    /**
     * Each row is a bordered card rather than a bare row.
     *
     * Not cosmetic: a notification IS a bordered card and a history entry is NOT, and a skeleton
     * whose chrome disagrees with the real thing still moves the layout when the data lands - which
     * is the entire reason for preferring a skeleton over a spinner.
     */
    card?: boolean
    className?: string
}) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn(
                card ? "space-y-2" : divided && "divide-y divide-neutral-200 dark:divide-neutral-800",
                className,
            )}
        >
            <span className="sr-only">Loading</span>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "flex gap-3",
                        lines === 3 ? "items-start" : "items-center",
                        card
                            ? "rounded-xl border border-neutral-200 p-3.5 dark:border-neutral-800"
                            : "px-3 py-2.5",
                    )}
                >
                    {withIcon && (
                        <Shimmer
                            className={cn("h-4 w-4 shrink-0 rounded", lines === 3 && "mt-0.5")}
                            delay={i * 0.06}
                        />
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Widths step through the list so it reads as varied content rather than as
                            a bar chart - real titles are not all the same length. */}
                        <Shimmer
                            className={cn("h-3.5 max-w-full", ["w-44", "w-36", "w-52", "w-40", "w-32"][i % 5])}
                            delay={i * 0.06}
                        />
                        {lines >= 2 && (
                            <Shimmer
                                className={cn("h-3 max-w-full", lines === 3 ? "w-full" : "w-24")}
                                delay={i * 0.06}
                            />
                        )}
                        {lines === 3 && <Shimmer className="h-3 w-20 max-w-full" delay={i * 0.06} />}
                    </div>
                </div>
            ))}
        </div>
    )
}

/**
 * A chat transcript being loaded.
 *
 * Alternating sides and varying widths, because that is what a conversation looks like. A centred
 * spinner in a transcript is the worst version of the spinner problem: the region is the tallest
 * thing on the screen, so the jump when the messages arrive is the full height of the panel.
 *
 * Deliberately starts and ends on the ASSISTANT side - a transcript opens with a reply to
 * something you asked before, and the last thing in view is almost always an answer.
 */
export function ChatSkeleton({ count = 4 }: { count?: number }) {
    // Assistant bubbles are wider than the questions that produced them, which is what makes the
    // shape read as a conversation rather than as a list.
    const rows = Array.from({ length: count }).map((_, i) => ({
        mine: i % 2 === 1,
        width: ["w-[70%]", "w-[45%]", "w-[85%]", "w-[38%]", "w-[62%]", "w-[50%]"][i % 6]!,
    }))

    return (
        <div role="status" aria-busy="true" className="flex flex-col gap-3 px-4 py-4">
            <span className="sr-only">Loading this conversation</span>
            {rows.map((r, i) => (
                <div key={i} className={cn("flex w-full gap-2", r.mine ? "justify-end" : "items-start")}>
                    {!r.mine && <Shimmer className="h-6 w-6 shrink-0 rounded-full" delay={i * 0.08} />}
                    <Shimmer
                        className={cn(
                            "h-14 max-w-full",
                            r.width,
                            // Matches the real bubbles: one squared corner on the side it comes from.
                            r.mine ? "rounded-2xl rounded-tr-none" : "rounded-2xl rounded-tl-none",
                        )}
                        delay={i * 0.08}
                    />
                </div>
            ))}
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// Kept for shipithq apps - ShipItHQ's own skeleton kit names (157 files import ShimmerStyles).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kept for shipithq apps. ShipItHQ's kit injected its `sk-shimmer` keyframes with a `<style>` tag; the sweep now
 * lives in globals.css (`gk-shimmer`, with `.sk-shimmer` aliased to it), so this renders nothing.
 */
export function ShimmerStyles(): null {
    return null
}

/** Kept for shipithq apps: the standard page wrapper so every skeleton shares the app's page padding. */
export function SkeletonPage({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)}>{children}</div>
}

/** Kept for shipithq apps: a row of stat tiles - drawn as Gurukul's stat band skeleton. */
export function StatTilesSkeleton({ count = 4 }: { count?: number }) {
    return <StatBandSkeleton count={count} />
}

/** Kept for shipithq apps: a stats column beside a chart - the dashboard "module row". */
export function ModuleRowSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <SkeletonCard className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
                <Shimmer className="h-5 w-40" delay={delay} />
                <Shimmer className="h-4 w-20" delay={delay + 0.04} />
            </div>
            <div className="flex flex-col gap-5 lg:flex-row">
                <div className="grid grid-cols-2 gap-2.5 lg:w-1/3 lg:grid-cols-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 px-3.5 py-2.5 dark:border-neutral-800">
                            <Shimmer className="h-3 w-16" delay={delay + i * 0.05} />
                            <Shimmer className="mt-1.5 h-5 w-12" delay={delay + i * 0.05} />
                        </div>
                    ))}
                </div>
                <div className="lg:w-2/3">
                    <Shimmer className="h-[220px] w-full rounded-lg" delay={delay + 0.1} />
                </div>
            </div>
        </SkeletonCard>
    )
}

/** Kept for shipithq apps: a vertical feed of avatar + two-line rows. */
export function FeedSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-5">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-3">
                    <Shimmer className="h-8 w-8 shrink-0 rounded-full" delay={i * 0.05} />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Shimmer className="h-4 w-2/3" delay={i * 0.05} />
                        <Shimmer className="h-3 w-24" delay={i * 0.05} />
                    </div>
                </div>
            ))}
        </div>
    )
}

/** Kept for shipithq apps: header, stat tiles and a card grid, for a route with no bespoke skeleton yet. */
export function GenericPageSkeleton() {
    return (
        <SkeletonPage>
            <PageHeaderSkeleton />
            <StatTilesSkeleton />
            <CardGridSkeleton />
        </SkeletonPage>
    )
}
