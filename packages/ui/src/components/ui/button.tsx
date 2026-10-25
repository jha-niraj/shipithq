import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/*
 * The base radius is `rounded-xl`, and this is the fix for a lot of drift.
 *
 * It was `rounded-md`, while `apps/main/CLAUDE.md` mandates `rounded-xl` on every Button,
 * SelectTrigger, Input and Textarea. Every author who read the rule corrected the default by hand,
 * and the ones who did not read it shipped `rounded-md` - which is how the codebase ended up with
 * 298 hand-written `rounded-full`s across 75 files plus countless `rounded-xl`s. None of that was
 * carelessness at the call site; it was a default nobody agreed with, corrected differently each
 * time.
 *
 * The `sm` and `lg` size variants carried their OWN `rounded-md`, which would have beaten the base
 * and left the fix doing nothing for the commonest case in this product - `apps/main/CLAUDE.md`
 * specifies `size="sm"` for every header button. Their radius is removed so the base decides, which
 * is what a base is for.
 */
const buttonVariants = cva(
	"cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
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
				/* Ported ReUI components (color-picker, signature-pad) use shadcn's small icon size. */
				"icon-sm": "h-8 w-8",
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
//         <button onClick={onClick} className="inline-flex h-10 animate-shimmer items-center justify-center rounded-2xl border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
//             {
//                 content
//             }
//         </button>
//     )
// }

export { Button, buttonVariants }