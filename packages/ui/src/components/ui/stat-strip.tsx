import * as React from "react"
import { ScrollArea } from "./scroll-area"
import { cn } from "../../lib/utils"

/**
 * A row of quick-link / action tiles: ONE horizontally-scrolling row on a phone, a grid from `sm`.
 *
 * **Not for figures.** Headline numbers are a `StatBand` (`./stat-band`) - one connected band,
 * never a row of cards. This wrapper remains for tiles that are links or actions rather than
 * stats. See the root CLAUDE.md, "STATS ARE ONE BAND".
 *
 * ## Why this is a component and not a convention
 *
 * Every page in this app opens with a strip of stat cards or quick links, and the obvious
 * markup for it - `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` - READS as correctly responsive
 * while being the most expensive mobile layout available. Six tiles at 2-up is three rows,
 * about 200px; at 1-up it is six rows, about 400px. On a bounded page that comes straight out
 * of the list underneath, and on an unbounded one it pushes the actual content below the fold.
 *
 * The fix is always the same - one scrolling row below `sm` - and it was being rediscovered
 * page by page. This is that fix, once, so a new page gets it by using the component rather
 * than by remembering the rule.
 *
 * ## What it does
 *
 * - Below `sm`: a flex row inside a horizontal `ScrollArea`. Each child is given a fixed width
 *   (`itemWidth`) and `shrink-0`, because a tile in a flex row has no column to fill and would
 *   otherwise collapse to its text.
 * - From `sm`: a plain grid at `cols`. The ScrollArea renders no bar once its content fits, so
 *   there is nothing to switch off.
 *
 * ## Notes
 *
 * - `min-w-0` on the ScrollArea is not optional. Radix wraps the viewport's children in a
 *   shrink-to-fit `display:table` box, and without it a wide strip widens its ancestors instead
 *   of scrolling inside them.
 * - Children that are the shared `Card` need `h-auto`: `Card` sets `h-full`, which inside a flex
 *   row stretches every tile to the tallest one.
 */
export interface StatStripProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Grid columns from `sm` up. Give the widest count; intermediate steps are derived. */
	cols?: 2 | 3 | 4 | 5 | 6 | 8
	/** Tile width in the scrolling row. Numbers are `rem`-ish Tailwind widths. */
	itemWidth?: "sm" | "md" | "lg"
	/** Set when tiles are links/actions rather than figures - only affects the gap. */
	dense?: boolean
}

const COLS: Record<NonNullable<StatStripProps["cols"]>, string> = {
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-2 lg:grid-cols-3",
	4: "sm:grid-cols-2 lg:grid-cols-4",
	5: "sm:grid-cols-3 lg:grid-cols-5",
	6: "sm:grid-cols-3 lg:grid-cols-6",
	8: "sm:grid-cols-4 lg:grid-cols-8",
}

const WIDTH: Record<NonNullable<StatStripProps["itemWidth"]>, string> = {
	sm: "[&>*]:w-28",
	md: "[&>*]:w-36",
	lg: "[&>*]:w-44",
}

export function StatStrip({
	cols = 4,
	itemWidth = "md",
	dense = false,
	className,
	children,
	...props
}: StatStripProps) {
	return (
		<ScrollArea orientation="horizontal" className="w-full min-w-0 shrink-0">
			<div
				className={cn(
					// phone: one scrolling row
					"flex pb-1",
					dense ? "gap-2" : "gap-3",
					// every direct child gets a width and refuses to shrink
					WIDTH[itemWidth],
					"[&>*]:shrink-0",
					// from sm: the grid, and children go back to filling their column
					"sm:grid sm:pb-0 sm:[&>*]:w-auto",
					COLS[cols],
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</ScrollArea>
	)
}
