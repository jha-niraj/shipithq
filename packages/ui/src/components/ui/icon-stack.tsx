// Title: Icon Stack
// Description: Layered icon illustration container

import { cn } from "../../lib/utils"

type IconStackProps = React.ComponentProps<"div">

function IconStack({ className, children, style, ...props }: IconStackProps) {
  return (
    <div
      data-slot="icon-stack"
      className={cn(
        "text-foreground **:data-[slot=icon-stack-layer]:fill-background relative h-20 w-18",
        className
      )}
      style={
        {
          "--icon-stack-content-x": "71%",
          "--icon-stack-content-y": "58%",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 72 81"
        fill="none"
        className="h-full w-full overflow-visible"
      >
        <ellipse
          cx="36"
          cy="76"
          rx="30"
          ry="7"
          fill="currentColor"
          fillOpacity="0.055"
          className="blur-[4px]"
        />

        <IconStackLayer opacity="0.4" />
        <IconStackLayer opacity="0.6" x={13.65} y={6.04} />
        <IconStackLayer opacity="0.8" x={27.32} y={12.08} active />
      </svg>

      {children ? (
        <div
          data-slot="icon-stack-content"
          className="text-muted-foreground pointer-events-none absolute top-[var(--icon-stack-content-y)] left-[var(--icon-stack-content-x)] flex -translate-x-1/2 -translate-y-1/2 scale-x-90 -skew-y-26 items-center justify-center"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

function IconStackLayer({
  active = false,
  opacity,
  x = 0,
  y = 0,
}: {
  active?: boolean
  opacity: string
  x?: number
  y?: number
}) {
  return (
    <g opacity={opacity} transform={`translate(${x} ${y})`}>
      <path
        data-slot="icon-stack-layer"
        d="M42.2538 2.046C41.4408 1.6325 40.3965 1.6677 39.2612 2.2424L7.9616 18.1934C5.3895 19.5039 3.301 23.1064 3.301 26.2322V64.3226C3.301 66.0677 3.9458 67.2943 4.962 67.8199L1.8363 66.229C0.8201 65.7104 0.1753 64.4771 0.1753 62.732V24.6412C0.1753 21.5085 2.2638 17.913 4.8359 16.6024L36.1355 0.6515C37.2778 0.0698 38.322 0.0416 39.128 0.4551L42.2538 2.046Z"
        stroke="currentColor"
        strokeOpacity={active ? "0.3" : "0.2"}
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        data-slot="icon-stack-layer"
        d="M42.2545 2.0456C43.2707 2.5643 43.9155 3.7979 43.9155 5.543V43.6337C43.9155 46.7665 41.827 50.3616 39.2549 51.6722L7.9554 67.6235C6.813 68.2052 5.7687 68.2331 4.9628 67.8196C3.9465 67.301 3.3018 66.0673 3.3018 64.3222V26.2318C3.3018 23.0991 5.3903 19.5036 7.9624 18.193L39.2619 2.2421C40.4043 1.6604 41.4486 1.6321 42.2545 2.0456Z"
        stroke="currentColor"
        strokeOpacity={active ? "0.35" : "0.25"}
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/*
 * Gurukul additions (plan/repo/ui/reui-components-2026-10-23.md 2.5). The stack above is ReUI's as
 * shipped; these only package the colour and size choices so every screen picks from the same few.
 *
 * Tones follow the house palette: neutral ink by default, amber for a warning or the one accent.
 * There is deliberately no green tone - green is not a surface here (AGENTS.md, Colour), so a
 * success screen says "done" with a check chip on a neutral stack, and its words carry the state.
 */
type IconStackTone = "neutral" | "amber"

/** Classes for the stack itself (tints the tile outlines) - put on `<IconStack className>`. */
const ICON_STACK_TONE: Record<IconStackTone, string> = {
  neutral: "text-neutral-900 dark:text-neutral-100",
  amber: "text-amber-600 dark:text-amber-500",
}

/** Classes for the one icon inside the stack - put on the icon's own `className`. */
const ICON_STACK_ICON_TONE: Record<IconStackTone, string> = {
  neutral: "text-neutral-500 dark:text-neutral-400",
  amber: "text-amber-600 dark:text-amber-400",
}

/**
 * Sizes, keeping ReUI's 72x81 ratio. `chip` sits in a page or sheet header in place of the old
 * h-8 w-8 square; `row` is item-row media; `sm`/`md`/`lg` are for empty and done states.
 */
const ICON_STACK_SIZE = {
  chip: { stack: "h-10 w-9", icon: "size-3" },
  row: { stack: "h-12 w-11", icon: "size-3" },
  sm: { stack: "h-16 w-14", icon: "size-3.5" },
  md: { stack: "h-20 w-18", icon: "size-4" },
  lg: { stack: "h-24 w-22", icon: "size-5" },
} as const

type IconStackSize = keyof typeof ICON_STACK_SIZE

/**
 * The round check chip ReUI's "badge overlay" example puts on the top tile - the stack's child on a
 * success or done screen. Pass it as the one child: `<IconStack><IconStackCheck /></IconStack>`.
 */
function IconStackCheck({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-amber-600 shadow-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-amber-400",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

/**
 * The one-line way to draw a stack around a lucide icon: `<IconStackIcon icon={Users} size="md" />`.
 * The icon is drawn at the size's own glyph size; `tone` tints both the tiles and the glyph.
 */
function IconStackIcon({
  icon: Icon,
  size = "md",
  tone = "neutral",
  className,
  iconClassName,
}: {
  /** A lucide icon component (or any component taking `className`). */
  icon: React.ElementType
  size?: IconStackSize
  tone?: IconStackTone
  className?: string
  iconClassName?: string
}) {
  const s = ICON_STACK_SIZE[size]
  // Rendered through a narrow type: an app whose JSX namespace is widened (e.g. @react-three/fiber) turns the props of
  // a bare `React.ElementType` into `never`.
  const Glyph = Icon as React.ComponentType<{ className?: string }>
  return (
    <IconStack aria-hidden="true" className={cn(s.stack, ICON_STACK_TONE[tone], "shrink-0", className)}>
      <Glyph className={cn(s.icon, ICON_STACK_ICON_TONE[tone], iconClassName)} />
    </IconStack>
  )
}

export {
  IconStack,
  IconStackCheck,
  IconStackIcon,
  ICON_STACK_TONE,
  ICON_STACK_ICON_TONE,
  ICON_STACK_SIZE,
  type IconStackProps,
  type IconStackTone,
  type IconStackSize,
}