"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

/**
 * Sheets are NON-MODAL by default, like Notion's side peek (Niraj, 2026-10-22 - an experiment): no dimmed backdrop and
 * the page behind stays live. Clicking the app's sidebar (`data-sheet-keep-open`) leaves the sheet open; a click anywhere
 * else on the page closes it (a document listener in SheetContent), as do the X and Esc. Pass `modal` for a sheet that must block the page (dimmed backdrop).
 */
const SheetModalContext = React.createContext(false)

/**
 * `onExitComplete` runs once the sheet has finished sliding out (SHEET_EXIT_MS after it closed), and not at all when it
 * is opened again before then. Reset a form, a step or a selection HERE, never in `onOpenChange(false)`: cleared on
 * close, the content changes or collapses while the panel is still on screen sliding away (R11, 2026-10-22).
 */
function Sheet({ modal = false, open, defaultOpen, onOpenChange, onExitComplete, ...props }: React.ComponentProps<typeof SheetPrimitive.Root> & { onExitComplete?: () => void }) {
	// Always controlled underneath, so the exit can be timed for an uncontrolled sheet as well.
	const [ownOpen, setOwnOpen] = React.useState(defaultOpen ?? false)
	const isOpen = open ?? ownOpen
	const handleOpenChange = React.useCallback((next: boolean) => {
		if (open === undefined) setOwnOpen(next)
		onOpenChange?.(next)
	}, [open, onOpenChange])
	const exitRef = React.useRef(onExitComplete)
	exitRef.current = onExitComplete
	const wasOpen = React.useRef(isOpen)
	React.useEffect(() => {
		const closed = wasOpen.current && !isOpen
		wasOpen.current = isOpen
		if (!closed) return
		const t = window.setTimeout(() => exitRef.current?.(), SHEET_EXIT_MS)
		return () => window.clearTimeout(t)
	}, [isOpen])
	return (
		<SheetModalContext.Provider value={modal}>
			<SheetPrimitive.Root modal={modal} open={isOpen} onOpenChange={handleOpenChange} {...props} />
		</SheetModalContext.Provider>
	)
}

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Overlay
		className={cn(
			"fixed inset-0 z-[70] bg-black/40 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className
		)}
		{...props}
		ref={ref}
	/>
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

/**
 * How long the sheet's own exit takes, in ms.
 *
 * Exported because a caller that unmounts the sheet - a route-backed one popping its history entry -
 * has to WAIT for this before navigating, or the exit never plays. Declared here beside the
 * `data-[state=closed]:duration-300` it mirrors, so the two cannot drift: change one and this
 * comment is standing right next to the other.
 */
export const SHEET_EXIT_MS = 300;

const sheetVariants = cva(
	"group/sheet fixed z-[70] overflow-y-auto gap-4 bg-white text-popover-foreground dark:bg-popover p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
	{
		variants: {
			side: {
				top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
				bottom:
					"inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
				// `max-w-[90%]` is the mobile leave-a-strip rule, and it is here rather than
				// in the 100+ consumers for a reason beyond convenience: almost all of them
				// pass `w-full sm:max-w-[...]`, and `w-full` beats the `w-3/4` below in the
				// class merge. A max-width is a DIFFERENT property, so it survives that
				// override and still caps the result - one line does what 100 edits would.
				//
				// Why leave the strip at all: edge to edge, a sheet reads as a navigation to a
				// new page rather than a layer over the current one, and there is no visible
				// hint that anything is behind it. The sliver of dimmed page is the entire
				// affordance. It drops away from `sm`, where the sheet is plainly a panel.
				left: "inset-y-0 left-0 h-full w-3/4 max-w-[90%] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
				right:
					"inset-y-0 right-0 h-full w-3/4 max-w-[90%] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
			},
		},
		defaultVariants: {
			side: "right",
		},
	}
)

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
	VariantProps<typeof sheetVariants> {
	/**
	 * A sheet that must not close on a stray click outside (a long form). The click is ignored, and the
	 * element inside marked `data-sheet-cancel` flashes (`.gk-sheet-flash`, ring + a small shake; ring only
	 * under reduced motion) so the person sees where closing lives. Niraj, 2026-10-20.
	 */
	guardOutside?: boolean
	/**
	 * A left or right sheet can be dragged wider or narrower by its inner edge (from `sm`), starting at its own default
	 * width; a double click on the edge puts it back. On by default; pass `false` for a sheet that must keep its size.
	 * Niraj, 2026-10-22 (an experiment - the width is not remembered between openings).
	 */
	resizable?: boolean
	/**
	 * Kept for shipithq apps. ShipItHQ's sheet put its body in a ScrollArea unless `scroll={false}`. Here the panel
	 * already scrolls (`overflow-y-auto` in the base), so `scroll` (default true) changes nothing, and
	 * `scroll={false}` clips the panel (`overflow-hidden`) for a sheet that builds its own flex column - a pinned
	 * header, a scrolling middle, a pinned footer - exactly as before.
	 */
	scroll?: boolean
}

const SHEET_MIN_W = 320


/** The drag edge of a resizable side sheet, and the width it set (null = the sheet's own default). */
function useSheetResize(side: "top" | "bottom" | "left" | "right", enabled: boolean, contentRef: React.RefObject<HTMLDivElement | null>) {
	const [width, setWidth] = React.useState<number | null>(null)
	const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		const el = contentRef.current
		if (!el || e.button !== 0) return
		e.preventDefault()
		const startX = e.clientX
		const startW = el.getBoundingClientRect().width
		const max = () => Math.round(window.innerWidth * 0.95)
		const move = (ev: PointerEvent) => {
			const dx = side === "right" ? startX - ev.clientX : ev.clientX - startX
			setWidth(Math.min(max(), Math.max(SHEET_MIN_W, Math.round(startW + dx))))
		}
		const up = () => {
			window.removeEventListener("pointermove", move)
			window.removeEventListener("pointerup", up)
			document.body.style.removeProperty("cursor")
			document.body.style.removeProperty("user-select")
		}
		document.body.style.cursor = "col-resize"
		document.body.style.userSelect = "none"
		window.addEventListener("pointermove", move)
		window.addEventListener("pointerup", up)
	}, [side, contentRef])
	const on = enabled && (side === "left" || side === "right")
	return { on, width, onPointerDown, reset: () => setWidth(null) }
}

const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	SheetContentProps
>(({ side = "right", className, children, guardOutside, resizable = true, scroll = true, onPointerDownOutside, onInteractOutside, onOpenAutoFocus, onCloseAutoFocus, style, ...props }, ref) => {
	const innerRef = React.useRef<HTMLDivElement | null>(null)
	const resize = useSheetResize(side ?? "right", resizable, innerRef)
	const modal = React.useContext(SheetModalContext)
	const setRefs = React.useCallback((node: HTMLDivElement | null) => {
		innerRef.current = node
		if (typeof ref === "function") ref(node)
		else if (ref) ref.current = node
	}, [ref])
	const flashCancel = React.useCallback(() => {
		const el = innerRef.current?.querySelector<HTMLElement>("[data-sheet-cancel]")
		if (!el) return
		el.classList.remove("gk-sheet-flash")
		void el.offsetWidth // restart the animation on a repeat click
		el.classList.add("gk-sheet-flash")
		window.setTimeout(() => el.classList.remove("gk-sheet-flash"), 800)
	}, [])
	// Non-modal: a click anywhere on the page outside the sheet closes it - read straight off the document, so it
	// does not hang on how the dialog layer counts "outside" (Niraj, 2026-10-22: it did not close on Invite). Not for
	// the sidebar (`data-sheet-keep-open`), a popover / menu / other dialog opened from the sheet, or a toast; a sheet
	// that guards its contents flashes its Cancel instead.
	//
	// R11 (2026-10-22, "sheets close oddly"):
	// - only a primary press closes (a right click to copy, or a middle click, does not);
	// - a sheet already sliding out ignores further presses (a second close could re-open a toggle-style handler);
	// - a press on the sheet's own trigger is left to the trigger - closing on the press and toggling on the click
	//   re-opened the sheet it was meant to close;
	// - closed by a press elsewhere, focus stays where the person pressed instead of jumping back to the button that
	//   opened the sheet (which scrolled the page and stole focus from the field they had just clicked).
	const closeRef = React.useRef<HTMLButtonElement | null>(null)
	const closedFromOutside = React.useRef(false)
	React.useEffect(() => {
		if (modal) return
		const onDown = (ev: PointerEvent) => {
			const el = innerRef.current
			const target = ev.target
			if (ev.button !== 0 || !el || !el.isConnected || !(target instanceof Element) || el.contains(target)) return
			if (el.dataset.state !== "open") return
			if (target.closest('[data-sheet-keep-open],[data-radix-popper-content-wrapper],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-sonner-toaster]')) return
			if (el.id && target.closest(`[aria-controls="${CSS.escape(el.id)}"]`)) return
			// A menu, select or popover is open (opened from the sheet or anywhere): this press only dismisses it, the
			// way every app behaves - the sheet stays (Niraj, 2026-10-22: the "..." menu's outside click closed both).
			if (document.querySelector('[data-radix-popper-content-wrapper],[role="menu"][data-state="open"],[role="listbox"][data-state="open"]')) return
			if (guardOutside) { flashCancel(); return }
			closedFromOutside.current = true
			closeRef.current?.click()
		}
		document.addEventListener("pointerdown", onDown, true)
		return () => document.removeEventListener("pointerdown", onDown, true)
	}, [modal, guardOutside, flashCancel])
	return (
	<SheetPortal>
		{modal && <SheetOverlay />}
		<SheetPrimitive.Content
			ref={setRefs}
			className={cn(sheetVariants({ side }),
				!scroll && "overflow-hidden",
				className)}
			// A dragged width beats the sheet's own `sm:max-w-*` (inline style), and lifts the cap so it can grow.
			style={resize.width != null ? { ...style, width: resize.width, maxWidth: "none" } : style}
			onPointerDownOutside={(e) => {
				onPointerDownOutside?.(e)
				if (modal && guardOutside) { e.preventDefault(); flashCancel() }
			}}
			onInteractOutside={(e) => {
				onInteractOutside?.(e)
				// Non-modal sheets close through the document listener above; the dialog layer's own outside handling
				// (pointer or focus) never closes them. A modal one keeps the layer's behaviour.
				if (!modal || guardOutside) e.preventDefault()
			}}
			onOpenAutoFocus={(e) => {
				closedFromOutside.current = false
				onOpenAutoFocus?.(e)
			}}
			onCloseAutoFocus={(e) => {
				onCloseAutoFocus?.(e)
				if (closedFromOutside.current) e.preventDefault()
				closedFromOutside.current = false
			}}
			{...props}
		>
			{children}
			{resize.on && (
				<div
					role="separator"
					aria-orientation="vertical"
					aria-label="Drag to resize"
					title="Drag to resize - double click to reset"
					onPointerDown={resize.onPointerDown}
					onDoubleClick={resize.reset}
					className={cn(
						"group absolute inset-y-0 z-10 hidden w-2 cursor-col-resize touch-none sm:block",
						side === "right" ? "-left-1" : "-right-1",
					)}
				>
					<span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-neutral-400 dark:group-hover:bg-neutral-500" />
				</div>
			)}
			<SheetPrimitive.Close ref={closeRef} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
				<X className="h-4 w-4" />
				<span className="sr-only">Close</span>
			</SheetPrimitive.Close>
		</SheetPrimitive.Content>
	</SheetPortal>
	)
})
SheetContent.displayName = SheetPrimitive.Content.displayName

/**
 * The sheet's header is a BAND (Niraj, 2026-10-23, the Staff credits person sheet as the reference): full width,
 * a hairline under it, the title with its line right below, room on the right for the close button - not a padded
 * stack with a large gap. One default for every sheet, so the ~130 that render a plain `<SheetHeader>` change here.
 *
 * In the standard sheet (SheetContent's `p-6`) the band bleeds to the edges (`-mx-6 -mt-6`) and pads itself. A
 * header that sets its own padding or margins (a `p-0` sheet that lays out its own band, `sr-only`) keeps that
 * layout and only takes the look. In a flex sheet the content's `gap-4` spaces the body; otherwise `mb-4` does.
 */
const SELF_LAID_OUT = /(^|\s)(sr-only|-?m[xt]?-|p[xytrbl]?-)/
const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => {
	const selfLaidOut = className ? SELF_LAID_OUT.test(className) : false
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				"flex shrink-0 flex-col gap-1 border-b border-neutral-200 text-left dark:border-neutral-800",
				!selfLaidOut && "-mx-6 -mt-6 mb-4 px-6 pb-4 pt-5 pr-14 group-[.flex]/sheet:mb-0",
				className
			)}
			{...props}
		/>
	)
}
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			// `gap-2`, not `sm:space-x-2`: the footer stacks with `flex-col-reverse` below `sm`,
			// and `space-x` only ever spaced the ROW direction - so on every phone two footer
			// buttons rendered edge to edge with a 0px gap between them. Measured at 360x640:
			// "Show results" ended at y=576 and "Clear all" began at y=576. Two adjacent 40px
			// targets touching is a mis-tap, and in a sheet footer one of the pair is usually the
			// destructive or cancelling one. `gap` spaces both directions, so it fixes the stacked
			// case and reproduces the same 8px in the row case.
			"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
			className
		)}
		{...props}
	/>
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Title
		ref={ref}
		className={cn(
			// `text-base`, not the `text-3xl` this used to be. A sheet is a panel OVER a page, so
			// its title must not out-rank the page title behind it - and in `apps/main` that is
			// `text-xl`. This is the CardTitle step from the scale in `apps/main/CLAUDE.md`.
			//
			// It matters here rather than at the call sites because 101 files render a SheetTitle
			// and only 34 pass a size, so 67 sheets were never a decision - they inherited a
			// default nobody chose.
			"text-base font-semibold text-foreground",
			className,
		)}
		{...props}
	/>
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Description
		ref={ref}
		className={cn(
			// Two bugs lived in the one line this replaces. `text-md` is NOT a Tailwind class -
			// the steps are `sm` / `base` / `lg` - so it compiled to nothing and every sheet
			// description rendered at whatever size it inherited. And `text-black` is off-palette
			// (the rule is neutral/zinc) and painted the subtitle at full strength, so it read as
			// loudly as the title it sits under.
			"text-xs text-neutral-500 dark:text-neutral-400",
			className,
		)}
		{...props}
	/>
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
