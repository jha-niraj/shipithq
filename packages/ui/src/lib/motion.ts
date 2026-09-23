/**
 * Shared motion class strings for the design system.
 *
 * These live in one place because the alternative - pasting the same twelve utilities into every
 * overlay - is how a design system drifts. Before this file, `DropdownMenuSubContent`, `Popover`
 * and `Tooltip` each animated, while `SelectContent` and `DropdownMenuContent` (the two surfaces
 * users actually open dozens of times a day) simply appeared. That is not a decision anyone made;
 * it is what copy-paste does over time.
 *
 * Tailwind scans this file: `packages/ui/src/styles/globals.css` declares `@source "../lib/**\/*.ts"`,
 * so every class named here is generated. If you move this file, move that @source with it.
 *
 * Motion comes from `tw-animate-css` (imported at the top of globals.css), which supplies
 * `animate-in` / `animate-out` and the `fade-*` / `zoom-*` / `slide-*` helpers.
 */

/**
 * Enter/exit for a popper-positioned surface: Select, DropdownMenu, Popover, Tooltip, ComboBox.
 *
 * Three things happen together, and each earns its place:
 *  - `fade` + `zoom-95` reads as the surface arriving rather than being swapped in.
 *  - the `data-[side=*]` slide makes it arrive FROM the trigger. Radix sets `data-side` to where
 *    the content landed after collision detection, so a menu that flipped above its trigger
 *    slides up rather than down - the motion stays truthful to the layout.
 *  - the exit half is not optional. Radix keeps the element mounted until the animation ends
 *    (it reads the computed animation), so omitting `animate-out` means the surface vanishes on
 *    a frame boundary, which is exactly the "it just disappears" complaint.
 *
 * Pair with the matching `origin-*` below so the zoom grows out of the trigger, not the centre.
 */
export const POPPER_MOTION = [
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
    "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
    // Slightly quicker to leave than to arrive - a dismissal that lingers feels unresponsive.
    "duration-200 data-[state=closed]:duration-150 ease-out",
].join(" ")

/**
 * Transform origin for each popper surface, so the zoom appears to grow out of the trigger.
 * Radix computes these per component and they are NOT interchangeable - each primitive exposes
 * its own custom property, and referencing the wrong one silently falls back to centre origin.
 *
 * Note the PARENTHESES, not square brackets. Tailwind v3 accepted a bare custom property inside
 * square brackets and quietly expanded it to a `var()` reference; v4 removed that shorthand, so
 * the square-bracket form now emits the property name as a literal identifier - which is not a
 * variable reference, is invalid CSS, and is dropped by the browser. The parenthesis form is the
 * v4 spelling that still resolves through `var()`. popover.tsx carried the square-bracket
 * version, so its transform-origin had been inert since the v4 upgrade.
 *
 * (Deliberately described rather than written out: Tailwind scans this file, and a literal
 * example would be picked up as a class candidate and emitted as a dead rule.)
 */
export const POPPER_ORIGIN = {
    select: "origin-(--radix-select-content-transform-origin)",
    dropdownMenu: "origin-(--radix-dropdown-menu-content-transform-origin)",
    popover: "origin-(--radix-popover-content-transform-origin)",
    tooltip: "origin-(--radix-tooltip-content-transform-origin)",
    contextMenu: "origin-(--radix-context-menu-content-transform-origin)",
    hoverCard: "origin-(--radix-hover-card-content-transform-origin)",
} as const

/**
 * A modal panel (Dialog, AlertDialog, CommandDialog). Held a touch longer than a popper because
 * it takes the whole screen's attention and a fast modal reads as a jump-cut.
 */
export const MODAL_MOTION = [
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
    "duration-200 data-[state=closed]:duration-150 ease-out",
].join(" ")

/** The scrim behind a modal. Fade only - a scrim that scales draws the eye to itself. */
export const OVERLAY_MOTION = [
    "data-[state=open]:animate-in data-[state=open]:fade-in-0",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
    "duration-200 data-[state=closed]:duration-150",
].join(" ")

/**
 * Height disclosure for Collapsible. Accordion has its own pair of keyframes in globals.css and
 * keeps them; this is the same technique against Radix's collapsible custom property.
 */
export const COLLAPSE_MOTION =
    "overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up"
