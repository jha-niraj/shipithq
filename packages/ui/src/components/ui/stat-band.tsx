import * as React from "react"
import Link from "next/link"
import { ScrollArea } from "./scroll-area"
import { Skeleton } from "./skeleton"
import { cn } from "../../lib/utils"

/**
 * StatBand - the ONE way a screen shows its headline numbers.
 *
 * ## What it is
 *
 * A single connected band: one rounded border around every figure, hairline dividers between
 * them, an icon chip beside each label and value. Not a row of cards. Six bordered cards for six
 * numbers spend a full row of card chrome on a glance's worth of information and read as six
 * unrelated things; one band reads as one summary and takes about half the height.
 *
 *     ┌───────────────┬───────────────┬───────────────┬───────────────┐
 *     │ [ic] TOTAL    │ [ic] LIVE NOW │ [ic] ATTEMPTS │ [ic] AVG      │
 *     │      12       │      1        │      44       │      81%      │
 *     └───────────────┴───────────────┴───────────────┴───────────────┘
 *
 * ## How it behaves
 *
 * - **Phone (below `sm`)**: one horizontally scrolling row inside a `ScrollArea`. Each cell keeps
 *   a fixed width and refuses to shrink, so five figures on a 360px screen scroll instead of
 *   crushing or stacking into five rows.
 * - **From `sm`**: a grid at `cols`. Dividers come from a right and bottom border on every cell,
 *   with the grid pulled 1px past the clipped container so the outer edges never double up.
 *   That works for any column count and any partial last row without per-breakpoint classes.
 * - **The value never truncates.** Clipping a label shortens a word; clipping a figure changes
 *   it. The label truncates, the value wraps at a space if it must.
 * - **A `progress` cell draws a thin track under its value.** Only for a figure that IS a
 *   proportion - a count has no full, so a bar under one would be decoration.
 * - **Colour is the datum, never the surface.** The chip and the band are neutral. `tone` tints
 *   the value only, and only when the number itself carries a state (overdue, passed, at risk).
 * - A cell with `href` is a link, one with `onClick` is a button (`active` marks a selected
 *   filter). Both hover like a row, neither changes size.
 *
 * ## Use
 *
 *     <StatBand
 *         items={[
 *             { icon: Users, label: "Students", value: 162 },
 *             { icon: Activity, label: "Present", value: "89%", hint: "144 of 162" },
 *             { icon: AlertCircle, label: "Overdue", value: 7, tone: "rose", href: "/billing?f=overdue" },
 *         ]}
 *     />
 *
 * Pair it with `StatBandSkeleton` using the SAME `count`, `cols` and `size`, or the page shifts
 * when the numbers land.
 *
 * ## ShipItHQ copy
 *
 * Ported from gurukulhq on 2026-09-22 (plan/stat-band). One change: the tones are cut to
 * `neutral`, `emerald` and `rose`, because this product's palette is monochrome with no
 * orange, yellow or brand gold (CLAUDE.md). See STAT-BAND.md beside this file.
 *
 * ## Portability
 *
 * Self-contained on purpose so it can be copied into another product: it needs only `ScrollArea`,
 * `Skeleton`, `cn` and `next/link`. No "use client" - a server component may render it, and the
 * icon it passes stays a plain component reference because this file is not a client boundary.
 */

/**
 * `emerald` for a value whose state is good (passed, paid, on track), `rose` for bad
 * (overdue, failed, at risk). Everything else is `neutral`. A warning is not a colour here:
 * the palette has no amber, so the number and its hint say it.
 */
export type StatBandTone = "neutral" | "emerald" | "rose"

export interface StatBandItem {
	/** Stable key. Falls back to the label. */
	key?: string
	/** A lucide icon or any component that accepts `className`. */
	icon: React.ComponentType<{ className?: string }>
	label: string
	/** Already formatted. Numbers are rendered as-is; format currency and percentages yourself. */
	value: React.ReactNode
	/** Small text beside the value - "3 published", "of 162", "+12 this week". */
	hint?: React.ReactNode
	/** Tints the VALUE only. Use when the number itself carries a state, never for decoration. */
	tone?: StatBandTone
	/** Makes the cell a link. */
	href?: string
	/** Makes the cell a button - a filter, a drill-down. Ignored when `href` is set. */
	onClick?: () => void
	/** For a button cell that is the currently selected filter. */
	active?: boolean
	/** For a button cell that cannot be pressed right now. */
	disabled?: boolean
	/** Accessible name when the label alone is not enough. */
	title?: string
	/**
	 * 0-100. Draws a thin track under the value - for a figure that IS a proportion, where the
	 * bar says at a glance what the percentage states exactly.
	 *
	 * Only for a real ratio. A count has no full, so a bar under one is decoration, and the
	 * rule on this component is that nothing in a cell is decoration. Clamped, so a caller
	 * that computes 104% or divides by zero cannot paint outside the track.
	 */
	progress?: number
}

export interface StatBandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	items: StatBandItem[]
	/**
	 * Grid columns from `sm` up. Defaults to the item count, capped at 6. Give the widest count;
	 * the `sm` step is derived. Pass the same value to the skeleton.
	 */
	cols?: StatBandCols
	/** `md` is the page-level band. `sm` is for a header row or a panel that holds other content. */
	size?: "sm" | "md"
	/** Drops the outer border and background, for a band already inside a bordered card. */
	flush?: boolean
}

export type StatBandCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const COLS: Record<StatBandCols, string> = {
	// A single figure is still a band, not a bare box - it just has one cell.
	1: "sm:grid-cols-1",
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-3",
	4: "sm:grid-cols-2 lg:grid-cols-4",
	5: "sm:grid-cols-3 lg:grid-cols-5",
	6: "sm:grid-cols-3 lg:grid-cols-6",
	7: "sm:grid-cols-4 lg:grid-cols-7",
	8: "sm:grid-cols-4 lg:grid-cols-8",
}

const TONE: Record<StatBandTone, string> = {
	neutral: "text-neutral-900 dark:text-white",
	emerald: "text-emerald-700 dark:text-emerald-400",
	rose: "text-rose-700 dark:text-rose-400",
}

const SIZE = {
	md: {
		cell: "gap-3 px-4 py-2.5",
		width: "[&>*]:w-44",
		chip: "h-8 w-8 rounded-lg",
		icon: "h-4 w-4",
		label: "text-[11px]",
		value: "text-lg",
		hint: "text-xs",
		track: "mt-1.5 h-1",
	},
	sm: {
		cell: "gap-2.5 px-3 py-2",
		width: "[&>*]:w-36",
		chip: "h-7 w-7 rounded-md",
		icon: "h-3.5 w-3.5",
		label: "text-[10px]",
		value: "text-base",
		hint: "text-[11px]",
		track: "mt-1 h-0.5",
	},
} as const

function defaultCols(count: number): StatBandCols {
	if (count <= 1) return 1
	if (count === 2) return 2
	if (count >= 6) return 6
	return count as StatBandCols
}

/** The band's outer box. Shared by the live band and its skeleton so the two cannot drift. */
function Frame({
	cols,
	size,
	flush,
	className,
	children,
	...props
}: {
	cols: StatBandCols
	size: "sm" | "md"
	flush: boolean
	className?: string
	children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
	return (
		<div
			className={cn(
				// `overflow-hidden` is not cosmetic and applies to BOTH variants: every cell paints
				// its own right and bottom hairline 1px OUTSIDE itself, so this is what trims the
				// ones on the band's outer edge instead of letting them double the frame border.
				"w-full min-w-0 shrink-0 overflow-hidden",
				!flush && "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
				className,
			)}
			{...props}
		>
			<ScrollArea orientation="horizontal" className="w-full min-w-0">
				<div
					className={cn(
						// phone: one scrolling row, every cell a fixed width that will not shrink
						"flex",
						"[&>*]:shrink-0",
						SIZE[size].width,
						/*
						 * Dividers are a BOX-SHADOW, not a border, and that is the whole trick.
						 *
						 * A right + bottom border on every cell needs the outer ones hidden, and
						 * the obvious way to do that - pull the row 1px past a clipped frame with
						 * `-mr-px` - makes the row exactly 1px wider than the scroll viewport.
						 * Radix then sees `scrollWidth > clientWidth` and shows a horizontal
						 * scrollbar under a band that fits perfectly, on every desktop screen.
						 * That is a real bug that shipped: measured 1055 client against 1056
						 * scroll on a page with nothing to scroll to.
						 *
						 * A box-shadow takes part in no layout, so the outer hairlines are simply
						 * painted past the edge and clipped by the frame, the row stays exactly
						 * as wide as its content, and the scrollbar appears only when the cells
						 * genuinely do not fit. It also needs no per-breakpoint "is this the last
						 * column" rule, which `divide-x` would, and survives a partial last row.
						 */
						"[&>*]:shadow-[1px_1px_0_0_var(--color-neutral-200)]",
						"dark:[&>*]:shadow-[1px_1px_0_0_var(--color-neutral-800)]",
						// from sm: the grid, cells fill their column
						"sm:grid sm:[&>*]:w-auto",
						COLS[cols],
					)}
				>
					{children}
				</div>
			</ScrollArea>
		</div>
	)
}

export function StatBand({ items, cols, size = "md", flush = false, className, ...props }: StatBandProps) {
	const s = SIZE[size]
	const c = cols ?? defaultCols(items.length)
	return (
		<Frame cols={c} size={size} flush={flush} className={className} {...props}>
			{items.map((item) => {
				const Icon = item.icon
				const interactive = Boolean(item.href || item.onClick)
				const body = (
					<>
						<span
							className={cn(
								"flex shrink-0 items-center justify-center bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300",
								s.chip,
							)}
						>
							<Icon className={s.icon} />
						</span>
						<span className="min-w-0 flex-1 text-left">
							<span
								className={cn(
									"block truncate font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400",
									s.label,
								)}
							>
								{item.label}
							</span>
							<span className="flex flex-wrap items-baseline gap-x-1.5">
								<span
									className={cn(
										"font-semibold leading-tight tabular-nums",
										s.value,
										TONE[item.tone ?? "neutral"],
									)}
								>
									{item.value}
								</span>
								{item.hint != null && item.hint !== "" && (
									<span className={cn("font-normal text-neutral-500 dark:text-neutral-400", s.hint)}>
										{item.hint}
									</span>
								)}
							</span>
							{item.progress != null && (
								// `aria-hidden`: the value beside it already states the number, and a
								// progressbar role would have a screen reader announce the same figure twice.
								<span
									aria-hidden
									className={cn(
										"block w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800",
										s.track,
									)}
								>
									<span
										className="block h-full rounded-full bg-neutral-900 transition-[width] duration-500 dark:bg-white"
										style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
									/>
								</span>
							)}
						</span>
					</>
				)
				const cellClass = cn(
					"flex min-w-0 items-center",
					s.cell,
					interactive && "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900",
					item.active && "bg-neutral-50 dark:bg-neutral-900",
					item.disabled && "pointer-events-none opacity-60",
				)
				const key = item.key ?? item.label
				if (item.href) {
					return (
						<Link key={key} href={item.href} title={item.title} className={cellClass}>
							{body}
						</Link>
					)
				}
				if (item.onClick) {
					return (
						<button
							key={key}
							type="button"
							onClick={item.onClick}
							disabled={item.disabled}
							aria-pressed={item.active}
							title={item.title}
							className={cn(cellClass, "w-full")}
						>
							{body}
						</button>
					)
				}
				return (
					<div key={key} title={item.title} className={cellClass}>
						{body}
					</div>
				)
			})}
		</Frame>
	)
}

/**
 * The loading shape of a StatBand. Same frame, same cell size, same column count - pass the
 * `count`, `cols` and `size` the live band will use, or the page shifts when the data lands.
 */
export function StatBandSkeleton({
	count = 4,
	cols,
	size = "md",
	flush = false,
	className,
}: {
	count?: number
	cols?: StatBandCols
	size?: "sm" | "md"
	flush?: boolean
	className?: string
}) {
	const s = SIZE[size]
	const c = cols ?? defaultCols(count)
	return (
		<Frame cols={c} size={size} flush={flush} className={className} aria-hidden>
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className={cn("flex min-w-0 items-center", s.cell)}>
					<Skeleton className={cn("shrink-0", s.chip)} delay={i * 0.06} />
					<div className="min-w-0 flex-1 space-y-1.5">
						<Skeleton className={cn("w-16 rounded", size === "sm" ? "h-2" : "h-2.5")} delay={i * 0.06} />
						<Skeleton className={cn("w-10 rounded", size === "sm" ? "h-4" : "h-5")} delay={i * 0.06} />
					</div>
				</div>
			))}
		</Frame>
	)
}
