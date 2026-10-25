import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	/** Kept for shipithq apps: ShipItHQ's textarea sat in a ScrollArea and took classes for its viewport.
	 *  This textarea scrolls natively, so the prop is accepted and ignored. */
	viewportClassName?: string
}

/**
 * THE FOCUS RING HAS NO OFFSET, AND THAT IS THE WHOLE POINT.
 *
 * This used to be `focus:ring-2 focus:ring-ring focus:ring-offset-2`. `ring-offset-2` paints a 2px
 * band of `--tw-ring-offset-color` BETWEEN the control and its ring, and nothing in this repo ever
 * sets that variable - Tailwind's initial value for it is `#fff`. So every focused textarea in the
 * app wore a hard WHITE hairline around it: on a light sheet it read as a focus ring stuck on, and
 * in dark mode it was a glaring white outline on a neutral-900 field. It showed the instant a sheet
 * opened rather than on a deliberate focus, because Radix autofocuses the first tabbable element
 * and in a message sheet that is the textarea.
 *
 * `input.tsx` in this same folder already had it right - a plain `focus-visible:ring-2` at 40%,
 * with the border darkening - so this is the shared control being brought back in line rather than
 * a call site being patched. The two controls sit next to each other in half the forms in the app
 * and used to focus differently.
 *
 * The comments live OUT here, not inside the class template literal. `cn` joins that string
 * verbatim, so anything written between the classes is emitted into the DOM's `class` attribute -
 * and a comment that mentioned `ring-offset-2` would have shipped it as a real class and put the
 * white band straight back.
 *
 * `resize-none sm:resize-y`: the drag-to-resize grabber is a desktop affordance with no touch
 * equivalent - on a phone it is a decoration in the corner that also lets a stray drag reflow the
 * form. Vertical only, from `sm`.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	// `viewportClassName` is pulled out so it never reaches the DOM (kept for shipithq apps).
	({ className, viewportClassName: _viewportClassName, ...props }, ref) => {
		return (
			<textarea
				ref={ref}
				className={cn(
					`
						flex min-h-[96px] w-full
						rounded-xl border
						bg-white dark:bg-neutral-900
						border-gray-200 dark:border-neutral-700
						px-3 py-2 text-sm

						resize-none sm:resize-y

						text-gray-900 dark:text-gray-100
						placeholder:text-gray-400 dark:placeholder:text-neutral-500

						transition-colors
						hover:bg-gray-50 dark:hover:bg-neutral-800

						focus-visible:outline-none
						focus-visible:border-neutral-400 dark:focus-visible:border-neutral-500
						focus-visible:ring-2
						focus-visible:ring-ring/40

						disabled:cursor-not-allowed
						disabled:opacity-50
          			`,
					className
				)}
				{...props}
			/>
		)
	}
)
Textarea.displayName = "Textarea"

export { Textarea }
