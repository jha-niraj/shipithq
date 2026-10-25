"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "../../lib/utils"

const ScrollArea = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
		/** Classes for the inner Viewport - put a `max-h-*` here (not on the Root).
		 *  The Viewport is the actual scroll container; a `max-h-*` on the Root can't
		 *  bound it because the Viewport's `h-full` won't resolve against a max-height-only
		 *  parent, so the Root just clips (no scroll). Constrain the Viewport instead.
		 *
		 *  THIS IS ALSO THE ANSWER INSIDE AN AUTO-HEIGHT BOX, and it took three wrong turns to
		 *  find. In a container with `height: auto` there is nothing for a scroller to resolve a
		 *  height against: `flex-1` computes to ZERO (basis 0%, no free space to grow into), and
		 *  making the Viewport `absolute inset-0` is worse - it takes the content out of flow, so
		 *  the Root measures zero and the panel renders BLANK. A definite `max-h-*` here needs
		 *  nothing resolved, which is why it is the only thing that works. The Deck's panels pass
		 *  `max-h-[var(--gk-scroll-max)]`, a number their frame publishes. */
		viewportClassName?: string
		/** Which scrollbars to render. Defaults to "both", which is what this component has
		 *  always done - so every existing call site is unchanged.
		 *
		 *  Use "horizontal" for a wide table or chip strip that must not also show a vertical
		 *  bar, and "vertical" for a plain list. This is the reason you never hand-roll
		 *  `overflow-x-auto`: the axis is decided here, and the bars are hidden app-wide (M17).
		 *
		 *  NEVER pass `<ScrollBar>` as a child - the bars are rendered here, and a child one
		 *  lands inside the Viewport and scrolls away with the content. */
		orientation?: "vertical" | "horizontal" | "both"
		/** Ref to the Viewport - the element that actually scrolls. The Root does not, so a ref on
		 *  the component (which lands on Root) cannot be used to read or set scrollTop. Needed for
		 *  things like resetting to the top when a paginated list changes page. */
		viewportRef?: React.Ref<HTMLDivElement>
		/** Kept for shipithq apps (47 call sites): the content reflows to the viewport width instead of
		 *  sizing to itself - overrides Radix's inline `display: table; min-width: 100%` wrapper with
		 *  `[&>div]:!block [&>div]:!min-w-0`. */
		reflow?: boolean
	}
>(({ className, children, viewportClassName, orientation = "both", viewportRef, reflow = false, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn("relative overflow-hidden", className)}
		{...props}
	>
		{/* A VERTICAL-ONLY scroller pins its viewport child to `block`.
		    Radix wraps the children in a `min-width:100%; display:table` element, which is
		    shrink-to-fit - it grows to the content's max-content width. That is correct when a
		    horizontal scrollbar exists to reach the overflow. With `orientation="vertical"` no
		    horizontal bar is rendered at all (see below), so the wrapper grows, the viewport
		    clips it, and the overflow becomes UNREACHABLE rather than scrollable - content
		    disappears with no affordance that it is there. A five-column table inside one showed
		    two columns and no scrollbar.
		    A vertical-only scroller must never scroll sideways, so pinning the wrapper is not a
		    workaround, it is the definition. `both`/`horizontal` keep shrink-to-fit, because
		    that is what lets their content be wider than the viewport. */}
		<ScrollAreaPrimitive.Viewport
			ref={viewportRef}
			className={cn(
				"h-full w-full rounded-[inherit]",
				orientation === "vertical" && "[&>div]:!block",
				reflow && "[&>div]:!block [&>div]:!min-w-0",
				viewportClassName,
			)}
		>
			{children}
		</ScrollAreaPrimitive.Viewport>
		{orientation !== "horizontal" && <ScrollBar orientation="vertical" />}
		{orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		ref={ref}
		orientation={orientation}
		className={cn(
			// Invisible everywhere (Niraj, 2026-10-20, manual pass M17: "It should not be visible at all ... scrolling
			// should just work"). The bar stays MOUNTED on purpose: Radix only lets the Viewport scroll on an axis while
			// that axis's Scrollbar exists, so removing it would stop the scroll, not hide a bar. Wheel, trackpad, touch
			// and keyboard all scroll the Viewport itself; nothing needs the thumb.
			"pointer-events-none flex touch-none select-none opacity-0",
			orientation === "vertical" &&
			"h-full w-1.5 border-l border-l-transparent p-px",
			orientation === "horizontal" &&
			"h-1.5 flex-col border-t border-t-transparent p-px",
			className
		)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
