"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../../lib/utils"
import { POPPER_MOTION, POPPER_ORIGIN } from "../../lib/motion"

// Manual pass R7-2 (Niraj, 2026-10-20): a tooltip closes the moment the pointer leaves its trigger. Radix's default
// keeps it open while the pointer travels onto the tip ("hoverable content"), which left tips hanging over the next
// control. Both the provider and the root default to closing; a caller can still opt back in.
function TooltipProvider({ disableHoverableContent = true, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider disableHoverableContent={disableHoverableContent} {...props} />
}

// Every Tooltip brings its own provider (the shadcn v4 shape). Without one, a Tooltip on a page whose tree has no
// TooltipProvider threw "`Tooltip` must be used within `TooltipProvider`" and took the whole page down (Niraj hit it
// on /configure/paymentmethods, 2026-10-20). A provider higher up still sets the shared delay for its children.
function Tooltip({ disableHoverableContent = true, delayDuration, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    return (
        <TooltipPrimitive.Provider delayDuration={delayDuration} disableHoverableContent={disableHoverableContent}>
            <TooltipPrimitive.Root disableHoverableContent={disableHoverableContent} delayDuration={delayDuration} {...props} />
        </TooltipPrimitive.Provider>
    )
}

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, side = "top", sideOffset = 4, collisionPadding = 8, ...props }, ref) => (
    // Portaled to <body> (manual-pass R5-6): without it the tooltip is positioned inside whatever ancestor has a
    // transform / will-change / filter (editor question cards, ScrollArea viewports, animated panels), so `fixed`
    // resolved against that box and the tip landed far below its trigger.
    <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        className={cn(
            // z-[90]: above the docked panels (z-[55]), sheets (z-[70]) and popovers (z-[80]) - a tip on a panel's
            // icon used to open UNDER the panel it belonged to.
            "z-[90] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
            POPPER_MOTION,
            POPPER_ORIGIN.tooltip,
            className
        )}
        collisionPadding={collisionPadding}
        {...props}
    />
    </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }