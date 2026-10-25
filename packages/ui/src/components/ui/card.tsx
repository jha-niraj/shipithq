import * as React from "react"

import { cn } from "../../lib/utils"

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			// `h-full` and `justify-between` were BOTH removed from this default, and the pair is
			// worth explaining because each looked harmless on its own.
			//
			// `h-full` did no work in the case it was presumably added for: a Card that is a direct
			// grid or flex child already stretches to the row height, because `align-items: stretch`
			// is the default. Where it DID have an effect was the nested case - a Card inside a
			// column div that is itself a stretched grid item. The column's height is definite, so
			// each Card claimed 100% OF IT; two stacked Cards claimed 200% of the row between them.
			//
			// `justify-between` then turned that extra height into a visible hole: it pins the first
			// child to the top and the last to the bottom and dumps all the slack in the middle. So
			// a "Marking rules" card rendered as a title, a screen of nothing, and its controls far
			// below - which reads as a page that failed to load, not as a tall card.
			//
			// A card that genuinely wants its footer pinned in a grid of equal-height cards should
			// say so on the footer with `mt-auto`. That is precise, it only affects the one element
			// it is written on, and it cannot open a hole in a card that never asked for one.
			"bg-white dark:bg-neutral-900 shadow-2xl rounded-xl flex flex-col text-card-foreground p-4 gap-4",
			className
		)}
		{...props}
	/>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex flex-col space-y-1.5 p-1", className)}
		{...props}
	/>
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn(
			"text-xl font-semibold leading-none tracking-tight",
			className
		)}
		{...props}
	/>
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex items-center p-6 pt-0", className)}
		{...props}
	/>
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
