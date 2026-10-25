import * as React from "react"
import { cn } from "../../lib/utils"

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
					rounded-xl border
					bg-white dark:bg-neutral-900
					border-gray-200 dark:border-neutral-700
					px-3 text-sm

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
})
Input.displayName = "Input"

export { Input }