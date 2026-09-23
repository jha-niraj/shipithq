import { cn } from "../../lib/utils"

/**
 * The in-component skeleton primitive.
 *
 * Uses the same `.sk-shimmer` sweep as the route-level skeleton kit (defined in
 * styles/globals.css) rather than `animate-pulse`. A route's `loading.tsx` and
 * the component's own loading state now animate identically, so the handoff
 * between them is invisible - previously the sweep switched to a pulse partway
 * through the load, which read as a second, slower page.
 */
function Skeleton({
	className,
	delay,
	style,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	/** Seconds to offset the shimmer, so a row of blocks sweeps in sequence. */
	delay?: number
}) {
	return (
		<div
			className={cn("sk-shimmer rounded-md", className)}
			style={delay ? { animationDelay: `${delay}s`, ...style } : style}
			{...props}
		/>
	)
}

export { Skeleton }
