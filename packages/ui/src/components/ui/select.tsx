"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react"
import { cn } from "../../lib/utils"
import { POPPER_MOTION, POPPER_ORIGIN } from "../../lib/motion"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

/**
 * SelectTrigger
 * Matches Tabs visual language
 */
/**
 * `default` is `h-9`, the scale `apps/main/CLAUDE.md` and `apps/admin/CLAUDE.md` both document.
 * `sm` is `h-8`, for a dense filter row sitting among other controls.
 *
 * This prop exists because there were THREE competing scales: the package shipped `h-11`, both app
 * conventions say `h-9`, and the reports filter row passes `h-8` five times in one line. Every one
 * of those call sites was correcting the primitive by hand, differently. Height is now the
 * component's decision and a consumer states intent instead of pixels.
 */
export type SelectTriggerSize = "sm" | "default"

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: SelectTriggerSize }
>(({ className, children, size = "default", ...props }, ref) => (
	/*
	 * The value fills the row and reads from the LEFT.
	 *
	 * This was `[&>span]:line-clamp-1`, which sets `display:-webkit-box` on the value span. A
	 * -webkit-box sized to its content does not sit where a reader expects inside a
	 * `justify-between` row, and a multi-line option (see `description` on SelectItem) stacked its
	 * label and its description inside the trigger and then clipped the pair - which is how a
	 * report type rendered as a centred, ellipsised fragment.
	 *
	 * `flex-1 min-w-0 truncate text-left` is the same "one line, ellipsis when too long" intent,
	 * stated in a way that also fixes where the line starts. `min-w-0` is load-bearing: a flex item
	 * will not shrink below its content width without it, so a long option would push the chevron
	 * out of the box instead of ellipsising.
	 *
	 * The comment sits HERE and not inside the template literal below, because `cn()` joins that
	 * literal verbatim - a comment written inside it ships as class names in the DOM.
	 */
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			`
      flex w-full items-center justify-between
      rounded-xl border
      bg-white dark:bg-neutral-900
      border-gray-200 dark:border-neutral-700
      px-3 font-medium
      text-gray-700 dark:text-gray-200

      transition-colors
      hover:bg-gray-50 dark:hover:bg-neutral-800

      focus-visible:outline-none
      focus-visible:border-neutral-400 dark:focus-visible:border-neutral-500
      focus-visible:ring-2
      focus-visible:ring-ring/40
      data-[state=open]:border-neutral-400 dark:data-[state=open]:border-neutral-500

      disabled:cursor-not-allowed
      disabled:opacity-50
            [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left
      `,
			size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
			className
		)}
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			{/* shrink-0: the value is now flex-1, so without this the chevron is the thing that
			    gets squashed when an option is long. */}
			<ChevronDown className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

/**
 * Scroll buttons
 */
const SelectScrollUpButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cn(
			"flex items-center justify-center py-1 text-gray-500 dark:text-gray-400",
			className
		)}
		{...props}
	>
		<ChevronUp className="h-4 w-4" />
	</SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName =
	SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cn(
			"flex items-center justify-center py-1 text-gray-500 dark:text-gray-400",
			className
		)}
		{...props}
	>
		<ChevronDown className="h-4 w-4" />
	</SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
	SelectPrimitive.ScrollDownButton.displayName

/**
 * Search inside a long Select.
 *
 * Past `SELECT_SEARCH_THRESHOLD` items the BASE SelectContent grows a search field of its own, so
 * every long data-driven list (students, staff, classes) gets search with no call-site change, and
 * a short list (Type, Status) renders exactly as before. `searchable` on SelectContent forces it on
 * or off; `searchPlaceholder` renames the field.
 *
 * Filtering works on the React children, not the DOM: SelectItem / SelectGroup / SelectLabel /
 * SelectSeparator are found by walking children (through fragments, arrays and plain wrappers). An
 * item a call site hides inside its own component cannot be seen, so it is neither counted nor
 * filtered - it simply stays visible.
 *
 * A non-matching item is NOT unmounted. Radix portals the selected item's text into the trigger and
 * mirrors every item into the hidden native <select> for forms, so unmounting the selected item
 * while searching would blank the trigger. It is rendered `hidden` AND `disabled` instead: disabled
 * is what makes Radix's arrow-key navigation and typeahead skip it.
 */
const SELECT_SEARCH_THRESHOLD = 8

type SelectChildProps = {
	children?: React.ReactNode
	textValue?: string
	description?: React.ReactNode
	className?: string
	disabled?: boolean
}

type SelectNodeKind = "item" | "group" | "label" | "separator" | "other"

function isSelectChild(node: React.ReactNode): node is React.ReactElement<SelectChildProps> {
	return React.isValidElement(node)
}

function selectNodeKind(element: React.ReactElement<SelectChildProps>): SelectNodeKind {
	// `unknown` first: comparing an element type to a forwardRef component directly is a
	// "no overlap" error under strict types, though it is exactly the identity check wanted.
	const type: unknown = element.type
	if (type === SelectItem || type === SelectPrimitive.Item) return "item"
	if (type === SelectPrimitive.Group) return "group"
	if (type === SelectLabel || type === SelectPrimitive.Label) return "label"
	if (type === SelectSeparator || type === SelectPrimitive.Separator) return "separator"
	return "other"
}

function countSelectItems(children: React.ReactNode): number {
	let count = 0
	React.Children.forEach(children, (child) => {
		if (!isSelectChild(child)) return
		if (selectNodeKind(child) === "item") count += 1
		else count += countSelectItems(child.props.children)
	})
	return count
}

function textOfNode(node: React.ReactNode): string {
	if (typeof node === "string" || typeof node === "number") return String(node)
	if (Array.isArray(node)) return node.map((part: React.ReactNode) => textOfNode(part)).join(" ")
	if (isSelectChild(node)) return textOfNode(node.props.children)
	return ""
}

/** `textValue` wins when present (Radix's own name for an item's plain text); the description is searchable too. */
function textOfItem(item: React.ReactElement<SelectChildProps>): string {
	const label = item.props.textValue ?? textOfNode(item.props.children)
	return `${label} ${textOfNode(item.props.description)}`.toLowerCase()
}

function filterSelectChildren(
	children: React.ReactNode,
	terms: string[],
	inGroup: boolean
): { nodes: React.ReactNode[]; visible: number } {
	const filtering = terms.length > 0
	let visible = 0
	const nodes =
		React.Children.map(children, (child): React.ReactNode => {
			if (!isSelectChild(child)) return child
			const kind = selectNodeKind(child)
			if (kind === "item") {
				const text = textOfItem(child)
				if (terms.every((term) => text.includes(term))) {
					visible += 1
					return child
				}
				return React.cloneElement(child, {
					disabled: true,
					className: cn(child.props.className, "hidden"),
				})
			}
			// While filtering, a loose label or a separator describes rows that may be gone. A label
			// INSIDE a group stays: the group itself is hidden when none of its items match.
			if (kind === "separator" || (kind === "label" && !inGroup)) {
				return filtering ? React.cloneElement(child, { className: cn(child.props.className, "hidden") }) : child
			}
			if (kind === "label" || countSelectItems(child.props.children) === 0) return child
			const inner = filterSelectChildren(child.props.children, terms, inGroup || kind === "group")
			visible += inner.visible
			if (kind === "group" && filtering && inner.visible === 0) {
				return React.cloneElement(child, { className: cn(child.props.className, "hidden"), children: inner.nodes })
			}
			return React.cloneElement(child, { children: inner.nodes })
		}) ?? []
	return { nodes, visible }
}

/** Enabled, visible options in DOM order - the hidden non-matches carry `data-disabled`. */
function visibleOptions(viewport: HTMLElement | null): HTMLElement[] {
	if (!viewport) return []
	return Array.from(viewport.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])'))
}

function SelectSearchField({
	inputRef,
	value,
	onValueChange,
	placeholder,
	onOpened,
}: {
	inputRef: React.RefObject<HTMLInputElement | null>
	value: string
	onValueChange: (value: string) => void
	placeholder: string
	/** Must be stable (a `useCallback`): it is an effect dependency. */
	onOpened: () => void
}) {
	// Radix renders the content's children twice over a select's life: into a detached
	// DocumentFragment while closed (so the trigger and native <select> know the items), and into
	// the real popover while open. Only the open copy is connected to the document.
	React.useEffect(() => {
		if (inputRef.current?.isConnected) onOpened()
	}, [inputRef, onOpened])
	return (
		<div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 dark:border-neutral-800">
			<Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
			{/* `w-0 flex-1`: the field takes the width the list already has and never widens the
			    popover by its own intrinsic size. */}
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				autoComplete="off"
				autoCorrect="off"
				spellCheck={false}
				className="h-9 w-0 min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
			/>
		</div>
	)
}

/**
 * SelectContent
 * Matches Tabs container feel
 */
type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
	/**
	 * Message shown when the dropdown has no items (e.g. an empty `data.map(...)`).
	 * Prevents the "thin empty box" - pass a context-specific message where useful
	 * (e.g. "No subjects yet"). Defaults to a generic fallback.
	 */
	emptyMessage?: string
	/**
	 * Search field at the top of the list. Left unset, it appears on its own once the list has
	 * more than 8 items. `true` forces it on, `false` forces it off.
	 */
	searchable?: boolean
	/** Placeholder (and accessible name) of the search field. */
	searchPlaceholder?: string
}

const SelectContent = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	SelectContentProps
>(({
	className,
	children,
	position = "popper",
	emptyMessage = "No options available",
	searchable,
	searchPlaceholder = "Search...",
	onKeyDownCapture,
	onFocusCapture,
	onEscapeKeyDown,
	onCloseAutoFocus,
	...props
}, ref) => {
	// Empty when there are no rendered item children - e.g. `{items.map(...)}` with
	// an empty array yields zero children. A hardcoded/sentinel item (like "All")
	// counts as content, so those selects never show this fallback.
	const isEmpty = React.Children.toArray(children).length === 0
	const isSearchable = !isEmpty && (searchable ?? countSelectItems(children) > SELECT_SEARCH_THRESHOLD)

	const [query, setQuery] = React.useState("")
	const inputRef = React.useRef<HTMLInputElement>(null)
	const viewportRef = React.useRef<HTMLDivElement>(null)
	const autoFocusPendingRef = React.useRef(false)
	const autoFocusTimerRef = React.useRef<number | undefined>(undefined)

	React.useEffect(() => () => window.clearTimeout(autoFocusTimerRef.current), [])

	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
	const filtered = isSearchable ? filterSelectChildren(children, terms, false) : null
	const noMatch = filtered !== null && terms.length > 0 && filtered.visible === 0

	/*
	 * Opening focuses the search field - on a fine pointer only, because on a phone a focused field
	 * throws the keyboard up over half the list the moment the select opens.
	 *
	 * It cannot simply focus on mount: once the popover is positioned Radix focuses the selected item
	 * (or the content) itself, after our effects. So we arm a flag and take the focus back on that
	 * first Radix focus (see `onFocusCapture`), and disarm it shortly after so a later hover - Radix
	 * also focuses an item under the mouse - is never pulled back to the field.
	 */
	const handleOpened = React.useCallback(() => {
		const finePointer = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches
		if (!finePointer) return
		autoFocusPendingRef.current = true
		window.clearTimeout(autoFocusTimerRef.current)
		autoFocusTimerRef.current = window.setTimeout(() => {
			if (!autoFocusPendingRef.current) return
			autoFocusPendingRef.current = false
			inputRef.current?.focus({ preventScroll: true })
		}, 300)
	}, [])

	const handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
		onFocusCapture?.(event)
		const input = inputRef.current
		if (!autoFocusPendingRef.current || !input || event.target === input) return
		autoFocusPendingRef.current = false
		window.clearTimeout(autoFocusTimerRef.current)
		input.focus({ preventScroll: true })
	}

	/*
	 * Keys. Radix's content-level keydown runs typeahead on any printable key (it jumps focus to the
	 * first item starting with that letter) and claims Home/End and the arrows. In a searchable list:
	 * - in the field, everything except Tab, Escape and ArrowDown stops here, so typing edits the
	 *   query and Home/End move the caret. ArrowDown is left to Radix: the field is not one of its
	 *   items, so it focuses the first enabled (= first visible) item. Enter picks the first match.
	 * - in the list, a printable key or Backspace moves focus to the field first, so the character
	 *   lands in the query instead of driving typeahead. Space still selects while the query is empty.
	 *   ArrowUp on the first visible item returns to the field.
	 * Escape is handled in `onEscapeKeyDown`: Radix listens for it on the document in the capture
	 * phase, before any of this runs.
	 */
	const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
		onKeyDownCapture?.(event)
		const input = inputRef.current
		if (!isSearchable || !input || event.defaultPrevented) return
		const modifier = event.ctrlKey || event.metaKey || event.altKey

		if (event.target === input) {
			if (event.key === "Tab" || event.key === "Escape" || event.key === "ArrowDown") return
			if (event.key === "Enter" && terms.length > 0) {
				event.preventDefault()
				const first = visibleOptions(viewportRef.current)[0]
				if (first) {
					first.focus()
					// Radix's item selects on Enter keydown. Dispatched on the next task so it is not a
					// nested event inside this one. `click()` is not used: Radix ignores clicks once the
					// mouse has moved over the list (it selects on pointerup for a mouse instead).
					window.setTimeout(() => {
						first.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
					})
				}
			}
			event.stopPropagation()
			return
		}

		if (event.key === "ArrowUp" && !modifier) {
			const first = visibleOptions(viewportRef.current)[0]
			if (first && event.target === first) {
				event.preventDefault()
				event.stopPropagation()
				input.focus({ preventScroll: true })
			}
			return
		}

		const printable = event.key.length === 1 && (event.key !== " " || query !== "")
		if (!modifier && (printable || event.key === "Backspace")) {
			// Moving focus during keydown sends the character (or the deletion) to the field.
			event.stopPropagation()
			input.focus({ preventScroll: true })
		}
	}

	const handleEscapeKeyDown = (event: KeyboardEvent) => {
		onEscapeKeyDown?.(event)
		if (event.defaultPrevented || !isSearchable || query === "") return
		// First Escape clears the query, the next one closes.
		event.preventDefault()
		setQuery("")
		inputRef.current?.focus({ preventScroll: true })
	}

	const handleCloseAutoFocus = (event: Event) => {
		onCloseAutoFocus?.(event)
		autoFocusPendingRef.current = false
		window.clearTimeout(autoFocusTimerRef.current)
		setQuery("")
	}

	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				ref={ref}
				position={position}
				className={cn(
					`
        z-[80] max-h-96 overflow-hidden
        rounded-xl border
        bg-white dark:bg-popover
        border-gray-200 dark:border-neutral-800
        shadow-xl
        `,
					// The menu now arrives instead of appearing. POPPER_MOTION carries the exit
					// half too, which is what Radix waits on before unmounting - without it the
					// list vanished on a frame boundary.
					POPPER_MOTION,
					// Grow out of the trigger rather than the panel's own centre.
					POPPER_ORIGIN.select,
					position === "popper" &&
					"data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
					className
				)}
				onKeyDownCapture={handleKeyDownCapture}
				onFocusCapture={handleFocusCapture}
				onEscapeKeyDown={handleEscapeKeyDown}
				onCloseAutoFocus={handleCloseAutoFocus}
				{...props}
			>
				{/* Above the viewport, not inside it: the viewport is the scroller, so the field
				    stays put while the list scrolls under it. */}
				{isSearchable ? (
					<SelectSearchField
						inputRef={inputRef}
						value={query}
						onValueChange={setQuery}
						placeholder={searchPlaceholder}
						onOpened={handleOpened}
					/>
				) : null}
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					ref={viewportRef}
					className={cn(
						"p-1",
						position === "popper" &&
						"min-w-[var(--radix-select-trigger-width)]"
					)}
				>
					{isEmpty ? (
						// `max-w` is the fix here, not `min-w` (the viewport already sets that above).
						// With no upper bound, the popper's own `width: max-content` sizing stretches to
						// fit `emptyMessage` on one unwrapped line - fine for a short trigger paired with
						// a short message, but a real problem the moment either is longer: on a phone the
						// box can run past the edge of whatever it is inside (a sheet, the viewport
						// itself). Capping the width lets normal text wrapping do its job.
						<div className="w-[min(20rem,calc(100vw-4rem))] select-none whitespace-normal px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
							{emptyMessage}
						</div>
					) : filtered ? (
						<>
							{filtered.nodes}
							{noMatch ? (
								<div className="select-none px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
									No match
								</div>
							) : null}
						</>
					) : (
						children
					)}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	)
})
SelectContent.displayName = SelectPrimitive.Content.displayName

/**
 * SelectLabel
 */
const SelectLabel = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		className={cn(
			"px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400",
			className
		)}
		{...props}
	/>
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

/**
 * SelectItem - clean active + hover states (Tabs-like).
 *
 * A second line for an option - and the reason it is a PROP rather than more children.
 *
 * Radix mirrors an item's `ItemText` into the trigger when that item is selected. Anything passed
 * as children therefore shows up twice: once in the open list, where a description belongs, and
 * once inside the closed trigger, where it does not. A `<div>` with a label `<p>` and a
 * description `<p>` stacked both lines inside a one-line trigger and the pair was then clipped.
 *
 * `description` renders OUTSIDE `ItemText`, so the list shows both lines and the trigger shows the
 * label alone. Call sites that want a hint under an option use this, never a second child.
 *
 * `data-gk-two-line` flips the row to `items-start`: the tick is absolutely positioned from its
 * static position, so on a centred two-line row it floats in the gutter between the label and the
 * description instead of sitting beside the label it confirms.
 */
const SelectItem = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { description?: React.ReactNode }
>(({ className, children, description, ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(
			`
      relative flex w-full cursor-pointer select-none items-center
      data-[gk-two-line=true]:items-start
      rounded-lg py-2 pl-8 pr-2 text-sm
      text-gray-700 dark:text-gray-200

      transition-colors duration-150
      focus:bg-gray-100 dark:focus:bg-neutral-800
      data-[state=checked]:bg-gray-200
      dark:data-[state=checked]:bg-neutral-700

      data-[disabled]:pointer-events-none
      data-[disabled]:opacity-50
      `,
			className
		)}
		data-gk-two-line={description ? "true" : undefined}
		{...props}
	>
		<span className="absolute left-2 flex h-4 w-4 items-center justify-center">
			{/* Radix only mounts the indicator once an item is selected, so this plays on the
			    tick itself appearing - the row reads as being chosen rather than redrawn. */}
			<SelectPrimitive.ItemIndicator className="animate-in fade-in-0 zoom-in-75 duration-150">
				<Check className="h-4 w-4 text-gray-900 dark:text-white" />
			</SelectPrimitive.ItemIndicator>
		</span>
		{description ? (
			<span className="flex min-w-0 flex-col">
				<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
				<span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
			</span>
		) : (
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		)}
	</SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

/**
 * Separator
 */
const SelectSeparator = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		className={cn(
			"my-1 h-px bg-gray-200 dark:bg-neutral-700",
			className
		)}
		{...props}
	/>
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
}