import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

// Base (cursor-pointer) and size radii aligned with gurukulhq's button (2026-09-22).
// rounded-md since 2026-09-25 (plan/ui-pass UI-18): rounded-xl is 14px here, which on
// a 36px button reads as a pill. Niraj asked for less rounded; 8px matches the
// project workspace's own controls.
const buttonVariants = cva(
	"cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				/**
				 * The primary CTA for a monochrome brand.
				 *
				 * INVERTS with the theme - ink-on-white in light mode, white-on-ink in
				 * dark - so it is always the highest-contrast element on its surface.
				 * A fixed dark button disappears entirely on a dark card, which is
				 * exactly what happened when the orange accent was retired.
				 *
				 * `group` + the ::after sweep give it the sheen: a soft highlight
				 * travels across on hover. `overflow-hidden` clips it to the pill and
				 * `motion-reduce` drops it for anyone who asked for less motion.
				 */
				sheen: [
					"relative overflow-hidden isolate group",
					"bg-neutral-900 text-white hover:bg-neutral-800",
					"dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200",
					"after:absolute after:inset-0 after:-translate-x-full after:content-['']",
					"after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent",
					"dark:after:via-neutral-900/20",
					"hover:after:translate-x-full after:transition-transform after:duration-700",
					"motion-reduce:after:hidden",
				].join(" "),
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 px-3",
				lg: "h-11 px-8",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
)

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
	VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button"
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }), "cursor-pointer")}
				ref={ref}
				{...props}
			/>
		)
	}
)
Button.displayName = "Button";

// interface ButtonProps {
//     content: string;
//     onClick?: () => void
// }

// export default function ShimmerButton({ content, onClick } : ButtonProps) {
//     return (
//         <button onClick={onClick} className="inline-flex h-10 animate-shimmer items-center justify-center rounded-2xl border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#262626,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
//             {
//                 content
//             }
//         </button>
//     )
// }

export { Button, buttonVariants }