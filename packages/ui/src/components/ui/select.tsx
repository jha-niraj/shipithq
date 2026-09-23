"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "../../lib/utils"
import { POPPER_MOTION, POPPER_ORIGIN } from "../../lib/motion"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

/**
 * SelectTrigger
 * Matches Tabs visual language
 */
/**
 * `default` is `h-9`, the scale `apps/main/CLAUDE.md` and `apps/admin/CLAUDE.md` both document.
 * `sm` is `h-8`, for a dense filter row sitting among other controls.
 *
 * This prop exists because there were THREE competing scales: the package shipped `h-11`, both app
 * conventions say `h-9`, and the reports filter row passes `h-8` five times in one line. Every one
 * of those call sites was correcting the primitive by hand, differently. Height is now the
 * component's decision and a consumer states intent instead of pixels.
 */
export type SelectTriggerSize = "sm" | "default"

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: SelectTriggerSize }
>(({ className, children, size = "default", ...props }, ref) => (
	/*
	 * The value fills the row and reads from the LEFT.
	 *
	 * This was `[&>span]:line-clamp-1`, which sets `display:-webkit-box` on the value span. A
	 * -webkit-box sized to its content does not sit where a reader expects inside a
	 * `justify-between` row, and a multi-line option (see `description` on SelectItem) stacked its
	 * label and its description inside the trigger and then clipped the pair - which is how a
	 * report type rendered as a centred, ellipsised fragment.
	 *
	 * `flex-1 min-w-0 truncate text-left` is the same "one line, ellipsis when too long" intent,
	 * stated in a way that also fixes where the line starts. `min-w-0` is load-bearing: a flex item
	 * will not shrink below its content width without it, so a long option would push the chevron
	 * out of the box instead of ellipsising.
	 *
	 * The comment sits HERE and not inside the template literal below, because `cn()` joins that
	 * literal verbatim - a comment written inside it ships as class names in the DOM.
	 *
	 * `rounded-lg`, like `Input` and `Textarea` (Niraj, 2026-09-23): a trigger is a form control
	 * and sits in rows beside them, so they share one radius, set in one place.
	 */
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			`
      flex w-full items-center justify-between
      rounded-lg border
      bg-white dark:bg-neutral-900
      border-neutral-200 dark:border-neutral-700
      px-3 font-medium
      text-neutral-700 dark:text-neutral-200

      transition-colors
      hover:bg-neutral-50 dark:hover:bg-neutral-800

      focus-visible:outline-none
      focus-visible:border-neutral-400 dark:focus-visible:border-neutral-500
      focus-visible:ring-2
      focus-visible:ring-ring/40
      data-[state=open]:border-neutral-400 dark:data-[state=open]:border-neutral-500

      disabled:cursor-not-allowed
      disabled:opacity-50
            [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left
      `,
			size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
			className
		)}
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			{/* shrink-0: the value is now flex-1, so without this the chevron is the thing that
			    gets squashed when an option is long. */}
			<ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

/**
 * Scroll buttons
 */
const SelectScrollUpButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cn(
			"flex items-center justify-center py-1 text-neutral-500 dark:text-neutral-400",
			className
		)}
		{...props}
	>
		<ChevronUp className="h-4 w-4" />
	</SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName =
	SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cn(
			"flex items-center justify-center py-1 text-neutral-500 dark:text-neutral-400",
			className
		)}
		{...props}
	>
		<ChevronDown className="h-4 w-4" />
	</SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
	SelectPrimitive.ScrollDownButton.displayName

/**
 * SelectContent
 * Matches Tabs container feel
 */
type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
	/**
	 * Message shown when the dropdown has no items (e.g. an empty `data.map(...)`).
	 * Prevents the "thin empty box" - pass a context-specific message where useful
	 * (e.g. "No subjects yet"). Defaults to a generic fallback.
	 */
	emptyMessage?: string
}

const SelectContent = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	SelectContentProps
>(({ className, children, position = "popper", emptyMessage = "No options available", ...props }, ref) => {
	// Empty when there are no rendered item children - e.g. `{items.map(...)}` with
	// an empty array yields zero children. A hardcoded/sentinel item (like "All")
	// counts as content, so those selects never show this fallback.
	const isEmpty = React.Children.toArray(children).length === 0
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				ref={ref}
				position={position}
				className={cn(
					`
        z-[80] max-h-96 overflow-hidden
        rounded-xl border
        bg-white dark:bg-neutral-900
        border-neutral-200 dark:border-neutral-700
        shadow-xl
        `,
					// The menu now arrives instead of appearing. POPPER_MOTION carries the exit
					// half too, which is what Radix waits on before unmounting - without it the
					// list vanished on a frame boundary.
					POPPER_MOTION,
					// Grow out of the trigger rather than the panel's own centre.
					POPPER_ORIGIN.select,
					position === "popper" &&
					"data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
					className
				)}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
						"min-w-[var(--radix-select-trigger-width)]"
					)}
				>
					{isEmpty ? (
						// `max-w` is the fix here, not `min-w` (the viewport already sets that above).
						// With no upper bound, the popper's own `width: max-content` sizing stretches to
						// fit `emptyMessage` on one unwrapped line - fine for a short trigger paired with
						// a short message, but a real problem the moment either is longer: on a phone the
						// box can run past the edge of whatever it is inside (a sheet, the viewport
						// itself). Capping the width lets normal text wrapping do its job.
						<div className="w-[min(20rem,calc(100vw-4rem))] select-none whitespace-normal px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
							{emptyMessage}
						</div>
					) : (
						children
					)}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	)
})
SelectContent.displayName = SelectPrimitive.Content.displayName

/**
 * SelectLabel
 */
const SelectLabel = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		className={cn(
			"px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400",
			className
		)}
		{...props}
	/>
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

/**
 * SelectItem - clean active + hover states (Tabs-like).
 *
 * A second line for an option - and the reason it is a PROP rather than more children.
 *
 * Radix mirrors an item's `ItemText` into the trigger when that item is selected. Anything passed
 * as children therefore shows up twice: once in the open list, where a description belongs, and
 * once inside the closed trigger, where it does not. A `<div>` with a label `<p>` and a
 * description `<p>` stacked both lines inside a one-line trigger and the pair was then clipped.
 *
 * `description` renders OUTSIDE `ItemText`, so the list shows both lines and the trigger shows the
 * label alone. Call sites that want a hint under an option use this, never a second child.
 *
 * `data-gk-two-line` flips the row to `items-start`: the tick is absolutely positioned from its
 * static position, so on a centred two-line row it floats in the gutter between the label and the
 * description instead of sitting beside the label it confirms.
 */
const SelectItem = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { description?: React.ReactNode }
>(({ className, children, description, ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(
			`
      relative flex w-full cursor-pointer select-none items-center
      data-[gk-two-line=true]:items-start
      rounded-lg py-2 pl-8 pr-2 text-sm
      text-neutral-700 dark:text-neutral-200

      transition-colors duration-150
      focus:bg-neutral-100 dark:focus:bg-neutral-800
      data-[state=checked]:bg-neutral-200
      dark:data-[state=checked]:bg-neutral-700

      data-[disabled]:pointer-events-none
      data-[disabled]:opacity-50
      `,
			className
		)}
		data-gk-two-line={description ? "true" : undefined}
		{...props}
	>
		<span className="absolute left-2 flex h-4 w-4 items-center justify-center">
			{/* Radix only mounts the indicator once an item is selected, so this plays on the
			    tick itself appearing - the row reads as being chosen rather than redrawn. */}
			<SelectPrimitive.ItemIndicator className="animate-in fade-in-0 zoom-in-75 duration-150">
				<Check className="h-4 w-4 text-neutral-900 dark:text-white" />
			</SelectPrimitive.ItemIndicator>
		</span>
		{description ? (
			<span className="flex min-w-0 flex-col">
				<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
				<span className="text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
			</span>
		) : (
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		)}
	</SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

/**
 * Separator
 */
const SelectSeparator = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		className={cn(
			"my-1 h-px bg-neutral-200 dark:bg-neutral-700",
			className
		)}
		{...props}
	/>
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
}