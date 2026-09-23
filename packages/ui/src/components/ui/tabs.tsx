"use client"

// From gurukulhq's tabs (2026-09-22), gray mapped to neutral, plus `TabsNav` for route tabs.

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { cn } from "../../lib/utils"

/**
 * The active tab value + a per-instance layoutId, shared down so each TabsTrigger can
 * render the sliding highlight only when it is the active one. Tracking the value here
 * (rather than reading Radix internals) lets the highlight work for BOTH controlled
 * (`value`+`onValueChange`) and uncontrolled (`defaultValue`) consumers.
 */
type TabsContextValue = {
	value: string | undefined
	layoutId: string
	/** Set by TabsList. Triggers read it so a compact list gets compact triggers automatically. */
	size: TabsSize
	/** Set by TabsList. When true, triggers size to their label instead of splitting the row. */
	fit: boolean
	/** Set by TabsList. Decides whether the strip is a bordered card or a bare segmented control. */
	variant: TabsVariant
}
const TabsContext = React.createContext<TabsContextValue | null>(null)

/**
 * `default` is the original 44px-tall row. `sm` is the compact segmented control.
 *
 * Height lives on the TRIGGER, not the list - `min-h-11` there silently beat an `h-10` passed
 * to the list, so pages that thought they had shrunk the strip had not. Setting it in one place,
 * from one prop, removes the trap.
 */
export type TabsSize = "sm" | "default" | "lg"

/**
 * `card` is the original bordered container. `segmented` is the bare strip.
 *
 * The difference is the CONTAINER, not the trigger: `card` draws a border and a surface around the
 * row, `segmented` draws nothing and lets a raised chip mark the active tab. A bordered box says
 * "this is a component"; a bare strip says "these are choices", which is what a filter row wants.
 *
 * This variant exists because the shape was already in the product THREE times and never in here:
 * `reports-layout-client.tsx` hand-rolled it from `<button>` elements, `apps/student` built
 * `TabNav` for it, and the shared component could only do the bordered 44px row that both of them
 * were escaping.
 */
export type TabsVariant = "card" | "segmented"


// ── Shared classes ───────────────────────────────────────────────────────────
// One definition of how a tab strip looks, used by the Radix tabs below AND by
// `TabsNav` (tabs that are links). Two copies of these strings is how the two
// kinds would drift apart.

function tabsListClass(variant: TabsVariant, size: TabsSize, fit: boolean) {
	return cn(
		"flex",
		variant === "card"
			? `
      rounded-xl border
      bg-white dark:bg-neutral-900
      border-neutral-200 dark:border-neutral-700
      overflow-hidden
      `
			// A bare strip: a faint trough so the raised active chip has something to sit in,
			// and no border. `overflow-hidden` is deliberately NOT set here - it would clip
			// the chip's shadow, which is the only thing marking the active tab.
			: "gap-0.5 rounded-xl bg-neutral-100/70 p-0.5 dark:bg-neutral-800/50",
		fit ? "w-fit max-w-full" : "w-full",
		variant === "card" && size === "sm" && "gap-0.5 p-0.5",
	)
}

function tabsTriggerClass(size: TabsSize, fit: boolean, variant: TabsVariant) {
	return cn(
		`
      relative flex min-w-0
      items-center justify-center
      font-semibold
      cursor-pointer
      transition-colors
      text-neutral-600 dark:text-neutral-300

      hover:bg-neutral-200/60 dark:hover:bg-neutral-700/40

      data-[state=active]:text-neutral-900
      dark:data-[state=active]:text-white

      focus-visible:outline-none
      focus-visible:ring-2
      focus-visible:ring-ring/40

      disabled:pointer-events-none
      disabled:opacity-50
      `,
		// `flex-none` in a fit list, so a trigger is as wide as its own label. Without this
		// `flex-1` still splits whatever width the list ends up with.
		fit ? "flex-none" : "flex-1",
		/*
		 * The scale, and why `default` is no longer 44px.
		 *
		 * It was `min-h-11`, and a 44px strip under a dense page header reads as a second
		 * toolbar - which is precisely what drove two separate teams to build their own tab
		 * components rather than use this one. 32px is the working default now; `lg` keeps
		 * the old height for anywhere a tab row genuinely IS the page's primary navigation.
		 */
		size === "sm" && "min-h-7 rounded-lg px-2.5 py-0.5 text-xs [&_[data-tabs-trigger-inner]_svg]:size-3.5",
		size === "default" && "min-h-8 rounded-lg px-3 py-1 text-[13px] [&_[data-tabs-trigger-inner]_svg]:size-3.5",
		size === "lg" && "min-h-11 px-2 py-2.5 text-sm [&_[data-tabs-trigger-inner]_svg]:size-4",
		// A bare strip carries its own weight in the label, not in a container.
		variant === "segmented" && "font-medium",
	)
}

function tabsHighlightClass(variant: TabsVariant) {
	return cn(
		"absolute inset-0 z-0 rounded-[inherit]",
		// `card` fills with a flat grey. `segmented` RAISES a white chip instead - the shadow is
		// what separates it from the trough, and it is the whole reason the borderless strip
		// reads as a control rather than as text.
		// In dark mode the chip has to be LIGHTER than the trough it sits in. It was
		// `dark:bg-neutral-900`, darker than the `neutral-800/50` strip and darker than a
		// hovered tab, so the selected tab read as the one you were not on (Niraj,
		// 2026-09-22: "it was like showing really not visible").
		variant === "card"
			? "bg-neutral-200 dark:bg-neutral-700"
			: "bg-white shadow-sm ring-1 ring-neutral-900/5 dark:bg-neutral-700 dark:shadow-none dark:ring-white/10",
	)
}

const HIGHLIGHT_SPRING = { type: "spring", stiffness: 420, damping: 34 } as const

/**
 * Tabs root. Thin wrapper over Radix Root that mirrors the active value into context so the
 * animated highlight can find the active trigger. An uncontrolled consumer (defaultValue) is
 * transparently promoted to controlled internally - Radix keyboard nav + a11y are unchanged.
 */
function Tabs({
	value: valueProp,
	defaultValue,
	onValueChange,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
	const isControlled = valueProp !== undefined
	const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
	const value = isControlled ? valueProp : internal
	const layoutId = React.useId()

	const handleValueChange = React.useCallback(
		(next: string) => {
			if (!isControlled) setInternal(next)
			onValueChange?.(next)
		},
		[isControlled, onValueChange]
	)

	return (
		<TabsContext.Provider value={{ value, layoutId, size: "default", fit: false, variant: "card" }}>
			<TabsPrimitive.Root value={value} onValueChange={handleValueChange} {...props}>
				{children}
			</TabsPrimitive.Root>
		</TabsContext.Provider>
	)
}

export type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
	/**
	 * `sm` for a compact segmented control - shorter, tighter, smaller label.
	 *
	 * Reach for it whenever the list is a SWITCH between two or three views rather than
	 * navigation across many. Two tabs stretched across a 1000px header read as a page-wide
	 * banner, which is what the Team & Access strip had become.
	 */
	size?: TabsSize
	/**
	 * Size the list to its labels instead of filling the row.
	 *
	 * The default is `w-full` with `flex-1` triggers, which is right for 4+ tabs and wrong for 2:
	 * a two-tab list becomes two 500px buttons. Six pages had already worked around it by hand
	 * with `w-auto` / `shrink-0` / `self-start` in their own className, each slightly differently -
	 * this is that workaround, named and done once.
	 */
	fit?: boolean
	/**
	 * `card` (default) keeps the bordered container. `segmented` removes it entirely.
	 *
	 * Reach for `segmented` in a header or a filter row, where the tabs sit among other controls
	 * and a second bordered box just adds a frame around a frame.
	 */
	variant?: TabsVariant
}

/**
 * TabsList - rounded container. Full-width by default; pass `fit` to hug the labels, and
 * `size="sm"` for the compact segmented control.
 */
const TabsList = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	TabsListProps
>(({ className, size = "default", fit = false, variant = "card", ...props }, ref) => {
	const parent = React.useContext(TabsContext)
	// The list, not the root, decides size, fit and variant - a page can have two lists with
	// different shapes. Re-providing here rather than threading props down keeps TabsTrigger's
	// API clean.
	const ctx = React.useMemo<TabsContextValue | null>(
		() => (parent ? { ...parent, size, fit, variant } : null),
		[parent, size, fit, variant]
	)
	const list = (
		<TabsPrimitive.List
			ref={ref}
			className={cn(
				tabsListClass(variant, size, fit),
				className
			)}
			{...props}
		/>
	)
	return ctx ? <TabsContext.Provider value={ctx}>{list}</TabsContext.Provider> : list
})
TabsList.displayName = TabsPrimitive.List.displayName

export type TabsTriggerProps = React.ComponentPropsWithoutRef<
	typeof TabsPrimitive.Trigger
> & {
	/** Optional leading icon (lucide, etc.). Spacing and size are handled here. */
	icon?: React.ReactNode
}

/**
 * TabsTrigger - equal-width tabs with optional leading icon.
 * The active background is a single shared element that SLIDES between triggers
 * (framer-motion `layoutId`) instead of a static per-trigger fill. Use `icon` instead of
 * placing icons in children so layout stays consistent.
 */
const TabsTrigger = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	TabsTriggerProps
>(({ className, icon, children, ...props }, ref) => {
	const ctx = React.useContext(TabsContext)
	const isActive = ctx ? ctx.value === props.value : false
	const size = ctx?.size ?? "default"
	const fit = ctx?.fit ?? false
	const variant = ctx?.variant ?? "card"

	return (
		<TabsPrimitive.Trigger
			ref={ref}
			className={cn(
				tabsTriggerClass(size, fit, variant),
				className
			)}
			{...props}
		>
			{isActive && ctx ? (
				<motion.span
					layoutId={ctx.layoutId}
					aria-hidden
					className={tabsHighlightClass(variant)}
					transition={HIGHLIGHT_SPRING}
				/>
			) : null}
			<span
				data-tabs-trigger-inner
				className="relative z-10 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 [&_svg]:inline-block [&_svg]:shrink-0 [&_svg]:size-4"
			>
				{icon != null ? (
					<span className="inline-flex shrink-0" aria-hidden>
						{icon}
					</span>
				) : null}
				<span className="min-w-0 truncate leading-tight">{children}</span>
			</span>
		</TabsPrimitive.Trigger>
	)
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * Fades + slides the newly active panel in. The consumer className lands HERE (not on the
 * Radix Content element) so `space-y-*` / `grid` on the panel still apply to the real content
 * items rather than to a single wrapper child. Respects prefers-reduced-motion.
 */
function TabsContentInner({
	className,
	children,
}: {
	className?: string
	children?: React.ReactNode
}) {
	const reduce = useReducedMotion()
	return (
		<motion.div
			className={cn("mt-2", className)}
			initial={reduce ? false : { opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.22, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	)
}

/**
 * TabsContent - minimal; page-level styling lives in consumers.
 *
 * ## Two className slots, and you need to know which one you want
 *
 * `className` lands on the INNER animated wrapper (see TabsContentInner) so `space-y-*` and `grid`
 * apply to the real content items. That is right for almost every panel and is why it works that
 * way.
 *
 * It is wrong for one case: a FULL-HEIGHT panel. The Radix Content element is the direct child of
 * the `Tabs` flex column, so it is the element that has to carry `flex-1 min-h-0` in order to
 * stretch. Styling only the inner wrapper leaves Content at its natural height, the inner `flex-1`
 * then fills that natural height, and the whole chain below collapses - which is exactly how the
 * Docs page ended up with a letterboxed PDF preview despite every descendant being correct.
 *
 * `contentClassName` is that missing slot. It is additive: every existing caller passes only
 * `className` and is completely unaffected.
 *
 * A full-height panel wants BOTH:
 *   <TabsContent contentClassName="flex flex-1 min-h-0" className="flex flex-1 min-h-0"> ... </TabsContent>
 */
const TabsContent = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
		/** Applied to the Radix Content element itself - use for the flex/height chain. */
		contentClassName?: string
	}
>(({ className, contentClassName, children, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			// No ring offset: its band is white (nothing sets --tw-ring-offset-color), glaring in dark mode.
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
			contentClassName,
		)}
		{...props}
	>
		<TabsContentInner className={className}>{children}</TabsContentInner>
	</TabsPrimitive.Content>
))
TabsContent.displayName = TabsPrimitive.Content.displayName


// ── TabsNav: tabs that are links ─────────────────────────────────────────────

export interface TabsNavItem {
	href: string
	label: React.ReactNode
	/** The caller decides, from its own pathname: nested routes differ per section. */
	active: boolean
	icon?: React.ReactNode
}

/**
 * Tabs for NAVIGATION between routes, drawn exactly like `TabsList` + `TabsTrigger` (same classes,
 * same sliding highlight) but made of `<Link>`s.
 *
 * Radix Tabs cannot do this: its triggers are buttons that swap panels on one page, and wrapping a
 * Link in a trigger with `asChild` fails because the trigger renders its own highlight and label
 * spans inside. Route tabs want real links (middle-click, prefetch, `aria-current`), so this is its
 * own component rather than a trick on the Radix one. Added in ShipItHQ, 2026-09-22.
 */
function TabsNav({
	items,
	size = "sm",
	fit = true,
	variant = "segmented",
	className,
	"aria-label": ariaLabel,
}: {
	items: TabsNavItem[]
	size?: TabsSize
	fit?: boolean
	variant?: TabsVariant
	className?: string
	"aria-label": string
}) {
	const layoutId = React.useId()
	return (
		<nav aria-label={ariaLabel} className={cn("max-w-full overflow-x-auto [scrollbar-width:none]", className)}>
			<div className={tabsListClass(variant, size, fit)}>
				{items.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						aria-current={item.active ? "page" : undefined}
						data-state={item.active ? "active" : "inactive"}
						className={cn(tabsTriggerClass(size, fit, variant), "shrink-0")}
					>
						{item.active ? (
							<motion.span layoutId={layoutId} aria-hidden className={tabsHighlightClass(variant)} transition={HIGHLIGHT_SPRING} />
						) : null}
						<span
							data-tabs-trigger-inner
							className="relative z-10 inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 [&_svg]:inline-block [&_svg]:shrink-0 [&_svg]:size-4"
						>
							{item.icon != null ? <span className="inline-flex shrink-0" aria-hidden>{item.icon}</span> : null}
							<span className="min-w-0 truncate leading-tight">{item.label}</span>
						</span>
					</Link>
				))}
			</div>
		</nav>
	)
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsNav }
