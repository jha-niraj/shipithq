"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"
import { ScrollArea } from "./scroll-area"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Overlay
		className={cn(
			"fixed inset-0 z-50 bg-black/80 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className
		)}
		{...props}
		ref={ref}
	/>
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

// `overflow-hidden`, NOT `overflow-y-auto`.
//
// This one class was why every sheet in the product scrolled natively: the base
// carried it, so ~37 call sites inherited an OS scrollbar whether or not they
// asked for one, and the fifteen that also wrote `overflow-y-auto` themselves
// were repeating what they already had. A native scrollbar paints outside the
// sheet's rounded corner on Windows, reserves gutter width on some platforms and
// not others, and cannot be styled to match this surface. See JB-1.
//
// The panel now clips, and the `scroll` prop below puts a real ScrollArea inside
// it.
const sheetVariants = cva(
	"fixed z-50 overflow-hidden gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
	{
		variants: {
			side: {
				top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
				bottom:
					"inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
				left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
				right:
					"inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
			},
		},
		defaultVariants: {
			side: "right",
		},
	}
)

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
	VariantProps<typeof sheetVariants> {
	/**
	 * Put the body in a ScrollArea. On by default, because a sheet that is taller
	 * than the viewport has to scroll somehow and this is the one that matches the
	 * product's chrome.
	 *
	 * Pass `scroll={false}` when the sheet builds its OWN flex column - a pinned
	 * header, a scrolling middle, a pinned footer. Those manage their scroller
	 * themselves, and nesting one inside another gives you two.
	 */
	scroll?: boolean
}

const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	SheetContentProps
>(({ side = "right", className, children, scroll = true, ...props }, ref) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Content
			ref={ref}
			className={cn(
				sheetVariants({ side }),
				// `flex flex-col` only in the scrolling branch. Adding it to the base
				// would activate the base's own `gap-4` on every sheet that lays its
				// children out as blocks, silently changing the spacing of all 37.
				scroll && "flex flex-col",
				className,
			)}
			{...props}
		>
			{/* `min-h-0` because a flex child defaults to `min-height: auto` and
				refuses to shrink below its content - without it the ScrollArea grows
				to fit and the panel never scrolls at all. `reflow` because a grid
				inside would otherwise keep its own width: Radix sizes the content box
				`display: table`, which shrink-to-fits.

				The panel keeps its own padding rather than the scroller taking it
				over. Pulling it inside with negative margins would put the scrollbar
				flush to the panel edge, which looks better - and breaks every sheet
				that passes `p-0`, where the negative margin has no padding to cancel
				and drags the content outside the panel. */}
			{scroll ? (
				<ScrollArea className="min-h-0 min-w-0 flex-1" reflow>
					{children}
				</ScrollArea>
			) : (
				children
			)}
			<SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
				<X className="h-4 w-4" />
				<span className="sr-only">Close</span>
			</SheetPrimitive.Close>
		</SheetPrimitive.Content>
	</SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-4 text-center sm:text-left",
			className
		)}
		{...props}
	/>
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			className
		)}
		{...props}
	/>
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Title
		ref={ref}
		className={cn("text-lg font-semibold text-foreground", className)}
		{...props}
	/>
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Description
		ref={ref}
		className={cn("text-md text-black dark:text-neutral-200", className)}
		{...props}
	/>
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
