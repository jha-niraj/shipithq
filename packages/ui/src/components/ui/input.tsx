import * as React from "react"
import { cn } from "../../lib/utils"

/*
 * `rounded-lg`, and it lives HERE (Niraj, 2026-09-23: "keep the rounded-lg in
 * base components itself", after "you can just grab all the input and change it
 * in one as well").
 *
 * It was briefly `rounded-none` with each call site asking for its own radius.
 * That put the decision in hundreds of places and left half of them looking
 * different from the other half - the generate sprint sheet and the Add Task
 * dialog were still square while the generate sheet was not. One value, one
 * file, every app.
 *
 * This comment sits HERE and not inside the template literal below, because
 * `cn()` joins that literal verbatim - a comment written inside it ships as
 * class names in the DOM.
 */
const Input = React.forwardRef<
	HTMLInputElement,
	React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
	return (
		<input
			ref={ref}
			type={type}
			className={cn(
				`
					flex h-11 w-full
					rounded-lg border
					bg-white dark:bg-neutral-900
					border-neutral-200 dark:border-neutral-700
					px-3 text-sm

					text-neutral-900 dark:text-neutral-100
					placeholder:text-neutral-500 dark:placeholder:text-neutral-400

					transition-colors
					hover:bg-neutral-50 dark:hover:bg-neutral-800

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
})
Input.displayName = "Input"

export { Input }