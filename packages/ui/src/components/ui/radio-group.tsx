"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { cn } from "../../lib/utils"

/**
 * The shadcn radio group (plan/repo/ui/shadcn-controls-and-emails-2026-10-20.md): a native
 * `<input type="radio">` renders the operating system's own dot and ignores the app's ink. Same
 * focus ring and sizing as `checkbox.tsx` beside it, so the two read as one family.
 */
const RadioGroup = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
))
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Item
		ref={ref}
		className={cn(
			"peer aspect-square h-4 w-4 shrink-0 rounded-full border border-primary text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
			"transition-[border-color,box-shadow] duration-150 active:scale-95",
			className
		)}
		{...props}
	>
		<RadioGroupPrimitive.Indicator className="flex items-center justify-center animate-in fade-in-0 zoom-in-50 duration-150">
			<span className="h-2 w-2 rounded-full bg-current" />
		</RadioGroupPrimitive.Indicator>
	</RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
