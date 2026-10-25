import * as React from "react"
import { cn } from "@repo/ui/lib/utils"

/**
 * A button label that collapses to icon-only on small screens.
 *
 * ## Why not `hidden sm:inline`
 *
 * `hidden` is `display: none`, which removes the text from the ACCESSIBILITY TREE as well as the
 * screen - so an icon-only button becomes an unlabelled button for anyone using a screen reader,
 * and the only fix is remembering an `aria-label` on every single call site. One forgotten and the
 * control is unusable.
 *
 * `sr-only` keeps the text in the tree while hiding it visually, and `sm:not-sr-only` restores it
 * as normal text from the `sm` breakpoint up. So the button is always labelled, and the label is
 * visible exactly when there is room for it. Nothing to remember per call site.
 *
 * ## Usage
 *
 * The icon must supply its own spacing via `gap-*` on the Button, NOT `mr-*` on the icon - a right
 * margin on the icon leaves a phantom gap once the label is hidden, which is what made the first
 * pass at this look subtly off-centre.
 *
 *     <Button size="sm" className="gap-1.5" title="Transfer Certificate">
 *         <FileText className="h-4 w-4" />
 *         <ActionLabel>Transfer Certificate</ActionLabel>
 *     </Button>
 *
 * Pass `from="md"` when the label is long enough that `sm` is still too tight.
 */
export function ActionLabel({
	children,
	from = "sm",
	className,
}: {
	children: React.ReactNode
	/** Breakpoint at which the text becomes visible. Defaults to `sm`. */
	from?: "sm" | "md" | "lg"
	className?: string
}) {
	const shown = {
		sm: "sm:not-sr-only sm:inline",
		md: "md:not-sr-only md:inline",
		lg: "lg:not-sr-only lg:inline",
	}[from]

	return <span className={cn("sr-only", shown, className)}>{children}</span>
}
