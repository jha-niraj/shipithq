import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center w-fit border border-transparent font-medium whitespace-nowrap outline-none transition-shadow",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border-border bg-transparent dark:bg-input/32",
        secondary: "bg-secondary text-secondary-foreground",
        // Gurukul palette (AGENTS.md "Colour"): ReUI's info/success/warning/
        // focus/invert tokens do not exist here. Info and focus are neutral;
        // success is never a green surface, only emerald words on neutral.
        info: "bg-neutral-700 text-white dark:bg-neutral-300 dark:text-neutral-900",
        success:
          "border-neutral-200 bg-white text-emerald-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-emerald-400",
        warning: "bg-amber-500 text-white",
        destructive: "bg-rose-600 text-white",
        focus: "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900",
        invert: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
        "primary-light":
          "border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-primary",
        "warning-light":
          "border-amber-500/15 bg-amber-500/10 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400",
        "success-light":
          "border-neutral-200 bg-neutral-100 text-emerald-700 dark:border-neutral-800 dark:bg-neutral-800 dark:text-emerald-400",
        "info-light":
          "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        "destructive-light":
          "border-rose-500/15 bg-rose-500/10 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400",
        "invert-light":
          "border-neutral-900/15 bg-neutral-900/10 text-foreground dark:border-neutral-100/25 dark:bg-neutral-100/15 dark:text-neutral-100",
        "focus-light":
          "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        "primary-outline":
          "bg-background border-border text-primary dark:bg-input/30",
        "warning-outline":
          "bg-background border-border text-amber-700 dark:bg-input/30 dark:text-amber-400",
        "success-outline":
          "bg-background border-border text-emerald-700 dark:bg-input/30 dark:text-emerald-400",
        "info-outline":
          "bg-background border-border text-neutral-700 dark:bg-input/30 dark:text-neutral-300",
        "destructive-outline":
          "bg-background border-border text-rose-700 dark:bg-input/30 dark:text-rose-400",
        "invert-outline":
          "bg-background border-border text-foreground dark:bg-input/30",
        "focus-outline":
          "bg-background border-border text-neutral-700 dark:bg-input/30 dark:text-neutral-300",
      },
      size: {
        xs: "px-1 py-0.25 text-[0.6rem] leading-none h-4 min-w-4 gap-1",
        sm: "px-1 py-0.25 text-[0.625rem] leading-none h-4.5 min-w-4.5 gap-1",
        default: "px-1.25 py-0.5 text-xs h-5 min-w-5 gap-1",
        lg: "px-1.5 py-0.5 text-xs h-5.5 min-w-5.5 gap-1",
        xl: "px-2 py-0.75 text-sm h-6 min-w-6 gap-1.5",
      },
      /** `default`: active style radius. `full`: pill radius. */
      radius: {
        default:
          "rounded-sm",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "default",
    },
  }
)

interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant,
  size,
  radius,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, radius, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeProps }