"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "../../lib/utils"
import { POPPER_MOTION, POPPER_ORIGIN } from "../../lib/motion"

// Motion, origin, radius and layer from gurukulhq's popover (2026-09-22); the
// `portal` option is ShipItHQ's and is kept, see below.

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

/**
 * Position a popover against an element WITHOUT making that element the trigger. A trigger toggles
 * on click; an anchor leaves the click to the element itself.
 */
const PopoverAnchor = PopoverPrimitive.Anchor

/**
 * ── `portal={false}` when this popover lives inside a Dialog ──
 *
 * Radix Dialog wraps its content in `react-remove-scroll` with `shards: [contentRef]` and
 * without `noIsolation`. That library's wheel handler is explicit: for an event whose target
 * is outside the lock AND outside every shard, `shouldStop = !noIsolation`, and it calls
 * `preventDefault()`.
 *
 * A portalled popover renders to `document.body`, which is outside both. So the list inside
 * it paints a scrollbar, reports the right `scrollHeight`, responds to the keyboard - and
 * ignores the wheel completely, because the wheel event is being cancelled before it reaches
 * the element. That is the whole bug behind "the dropdown has a scrollbar but will not
 * scroll", and no amount of `overflow-auto` on the list can fix it.
 *
 * Rendering in place puts the content inside the dialog's subtree, so it falls within the
 * shard and scrolls. The cost is that it is no longer immune to an ancestor's clipping, which
 * is why this is opt-in rather than the default: every popover outside a dialog is better off
 * portalled.
 */
const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { portal?: boolean }
>(({ className, align = "center", sideOffset = 4, portal = true, ...props }, ref) => {
	const content = (
		<PopoverPrimitive.Content
			ref={ref}
			data-slot="popover-content"
			align={align}
			sideOffset={sideOffset}
			className={cn(
				"z-[80] w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-md outline-none",
				POPPER_MOTION,
				POPPER_ORIGIN.popover,
				className
			)}
			{...props}
		/>
	)
	return portal ? <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal> : content
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
