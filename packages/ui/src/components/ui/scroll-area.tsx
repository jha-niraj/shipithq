"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "../../lib/utils"

const ScrollArea = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
		/** Classes for the inner viewport - the element that actually scrolls.
		 *  Needed for max-height caps (`max-h-56` on a dropdown list), which have
		 *  no effect on the Root. Optional: omit it and nothing changes. */
		viewportClassName?: string
		/** Which axes get a visible scrollbar. Defaults to vertical only, which is what
		 *  every existing call site expects. Pass "both" for horizontally scrolling
		 *  content such as a wide code block or a table. */
		orientation?: "vertical" | "horizontal" | "both"
		/**
		 * Let the content REFLOW to the viewport width instead of sizing to itself.
		 *
		 * ── The Radix behaviour this exists to defeat ──
		 *
		 * Radix wraps children in a div with `style={{ minWidth: "100%", display: "table" }}`,
		 * set INLINE. A `display: table` box shrink-to-fits: it takes its content's intrinsic
		 * width and never goes below it. So a grid inside a ScrollArea lays out at whatever
		 * width it wants, and the viewport clips the overflow rather than the grid reflowing.
		 *
		 * That is what made the app shell's page card look broken when the AI rail opened.
		 * The card DID narrow - the flex maths was right all along - but the content inside
		 * kept its old width and slid under the panel. `layout.tsx` promises the rail is
		 * "a real column, not an overlay. The page narrows to make room for it, so nothing
		 * the user was reading gets covered", and this was the reason it did not hold.
		 *
		 * `min-w-0` as a class cannot fix it: the Radix value is an inline style, and inline
		 * beats a class whatever the specificity. Both properties have to be overridden with
		 * `!important`, which is what this prop does.
		 *
		 * Opt-in rather than default, because a wide code block or table SHOULD keep its
		 * width and scroll - that is the `orientation="both"` case, and it needs the table
		 * box to stay.
		 */
		reflow?: boolean
	}
>(({ className, children, viewportClassName, orientation = "vertical", reflow = false, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn("relative overflow-hidden", className)}
		{...props}
	>
		<ScrollAreaPrimitive.Viewport
			className={cn(
				"h-full w-full rounded-[inherit]",
				// See the `reflow` note above: both of these override an inline style, so
				// both need the `!` escape hatch.
				reflow && "[&>div]:!block [&>div]:!min-w-0",
				viewportClassName,
			)}
		>
			{children}
		</ScrollAreaPrimitive.Viewport>
		{/* `horizontal` alone is for a row that only ever scrolls sideways (StatBand on a
		    phone): no vertical bar to reserve or show. */}
		{orientation !== "horizontal" && <ScrollBar />}
		{/* Horizontal too, opt-in via `orientation`.
		    Radix's Viewport is `overflow: scroll` on BOTH axes with the native bars
		    hidden, so content that overflows sideways scrolls whether or not a bar is
		    rendered - and with no bar, nothing on screen says it can. That is worse than
		    a native scrollbar, because at least the native one is visible. Rendering both
		    means a consumer gets a bar on whichever axis actually overflows; Radix hides
		    the one that does not. */}
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
			"flex touch-none select-none transition-colors",
			orientation === "vertical" &&
			"h-full w-2.5 border-l border-l-transparent p-[1px]",
			orientation === "horizontal" &&
			"h-2.5 flex-col border-t border-t-transparent p-[1px]",
			className
		)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
