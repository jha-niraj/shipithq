import * as React from "react"

import { cn } from "../../lib/utils"

/**
 * `scroller="parent"`: render the bare `<table>`, with no `overflow-auto` wrapper, for a table that already sits in a
 * `ScrollArea` (the house rule). The wrapper is its own scroll container, so a `sticky` header inside it sticks to a
 * box that never scrolls and rides away with the rows - the /students header did exactly that (Niraj, 2026-10-18).
 * Pair it with `<TableHeader sticky>`.
 */
const Table = React.forwardRef<
	HTMLTableElement,
	React.HTMLAttributes<HTMLTableElement> & { scroller?: "own" | "parent" }
>(({ className, scroller = "own", ...props }, ref) => {
	const table = <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
	if (scroller === "parent") return table
	return <div className="relative w-full overflow-auto">{table}</div>
})
Table.displayName = "Table"

/** `sticky`: the heading row stays at the top of the scrolling parent (needs `<Table scroller="parent">`). A solid
 * background so rows do not show through, and a shadow line in place of the border, which a sticky row drops. */
const TableHeader = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky = false, ...props }, ref) => (
	<thead
		ref={ref}
		className={cn(
			"[&_tr]:border-b",
			sticky && "sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_var(--color-border,#e5e5e5)] dark:bg-neutral-900 dark:shadow-[inset_0_-1px_0_#262626]",
			className,
		)}
		{...props}
	/>
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tbody
		ref={ref}
		className={cn("[&_tr:last-child]:border-0", className)}
		{...props}
	/>
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tfoot
		ref={ref}
		className={cn(
			"border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
			className
		)}
		{...props}
	/>
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
	HTMLTableRowElement,
	React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
	<tr
		ref={ref}
		className={cn(
			"border-b",
			className
		)}
		{...props}
	/>
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
	HTMLTableCellElement,
	React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
	<th
		ref={ref}
		className={cn(
			// Compact by default. This was `h-12 px-4` with `p-4` cells, which made a two-line row
			// about 78px tall - a 35-row roster showed FIVE rows on a 1080px monitor and spent the
			// rest of the screen on padding. Changed here rather than overridden on each of the 27
			// pages that render a table, so density is one decision instead of 27 that drift.
			// A cell whose content is taller than this (a button, an input) still sizes to it.
			"h-9 px-3 text-left align-middle text-xs font-bold text-muted-foreground [&:has([role=checkbox])]:pr-0",
			className
		)}
		{...props}
	/>
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
	HTMLTableCellElement,
	React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
	<td
		ref={ref}
		className={cn("px-3 py-1.5 align-middle [&:has([role=checkbox])]:pr-0", className)}
		{...props}
	/>
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
	HTMLTableCaptionElement,
	React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
	<caption
		ref={ref}
		className={cn("mt-4 text-sm text-muted-foreground", className)}
		{...props}
	/>
))
TableCaption.displayName = "TableCaption"

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
}
