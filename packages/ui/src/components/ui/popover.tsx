"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "../../lib/utils"
import { POPPER_MOTION, POPPER_ORIGIN } from "../../lib/motion"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

/**
 * Position a popover against an element WITHOUT making that element the trigger. A trigger toggles
 * on click; an anchor leaves the click to the element itself, which is what a hover-opened flyout
 * beside a button that has its own job needs.
 */
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
	React.ElementRef<typeof PopoverPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
	<PopoverPrimitive.Portal>
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
	</PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
