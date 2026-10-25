"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

/**
 * IconPicker - choose one icon out of a supplied set.
 *
 * ## Why the map is INJECTED
 *
 * This package must not know which icons any particular feature offers. School Pulse has its own
 * `ICON_MAP` / `ICON_CHOICES` in the app, the next feature that needs a picker will have a
 * different set, and importing either one here would drag an app module into the design system.
 * So the caller passes `choices` (the names, in the order they should appear) and `resolve` (name
 * -> component). The picker only knows how to lay them out and how to be operated.
 *
 *     <IconPicker
 *         label="Icon"
 *         value={icon}
 *         onChange={setIcon}
 *         choices={ICON_CHOICES}
 *         resolve={resolveIcon}
 *     />
 *
 * ## What it decides, so a caller does not re-decide it
 *
 * - **Selection is legible without colour.** The chosen tile is a filled neutral chip - dark on
 *   light, light on dark - plus a ring. Nothing here is tinted: an icon is an identity, not a
 *   state, and a palette on top of it would read as meaning that is not there.
 * - **`rounded-xl`, not `rounded-full`.** Each tile is a control you press, and the repo's radius
 *   rule puts controls at `rounded-xl` and keeps round shapes for things that genuinely are round.
 * - **One tab stop, arrow keys inside.** The grid is a single stop in the tab order (roving
 *   `tabIndex`), and Arrow / Home / End move between tiles the way a radio group does. Tabbing
 *   through fifty-six buttons to reach the Save button is not keyboard access, it is a trap.
 * - **Every tile reports `aria-pressed`** and carries the icon name as its accessible label, so a
 *   screen reader gets "Calendar X, pressed" rather than fifty-six unlabelled buttons.
 * - The grid is `repeat(auto-fill, minmax(...))` from `columns`, so it reflows on a phone instead
 *   of forcing a horizontal scroll.
 */

export type IconPickerProps = {
    /** The currently chosen icon name. May be a name absent from `choices` - nothing is selected then. */
    value: string
    /** Called with the newly chosen name. */
    onChange: (name: string) => void
    /** Icon names to offer, in display order. */
    choices: string[]
    /** Name -> component. Supplied by the caller so this file imports no icon map. */
    resolve: (name: string) => LucideIcon
    /** Target columns at the default tile size. The grid still reflows narrower. Default 8. */
    columns?: number
    /** Optional visible label above the grid. */
    label?: string
    /** Accessible name for the group when there is no visible `label`. */
    ariaLabel?: string
    className?: string
}

export function IconPicker({
    value, onChange, choices, resolve, columns = 8, label, ariaLabel, className,
}: IconPickerProps) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([])
    const selectedIndex = choices.indexOf(value)
    // Nothing selected yet (an unknown name) still needs exactly one tab stop, so the first tile
    // takes it. Without this the whole grid would be unreachable by keyboard.
    const stopIndex = selectedIndex >= 0 ? selectedIndex : 0

    const focusAndSelect = (index: number) => {
        const next = choices[index]
        if (next === undefined) return
        onChange(next)
        refs.current[index]?.focus()
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = choices.length - 1
        let next: number | null = null
        switch (event.key) {
            case "ArrowRight": next = index >= last ? 0 : index + 1; break
            case "ArrowLeft": next = index <= 0 ? last : index - 1; break
            case "ArrowDown": next = Math.min(last, index + columns); break
            case "ArrowUp": next = Math.max(0, index - columns); break
            case "Home": next = 0; break
            case "End": next = last; break
            default: return
        }
        event.preventDefault()
        focusAndSelect(next)
    }

    return (
        <div className={cn("space-y-1.5", className)}>
            {label && (
                <span className="block text-sm text-neutral-600 dark:text-neutral-300">{label}</span>
            )}
            <div
                role="group"
                aria-label={ariaLabel ?? label ?? "Icon"}
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(28, Math.floor(280 / columns))}px, 1fr))` }}
            >
                {choices.map((name, index) => {
                    const Icon = resolve(name)
                    const isSelected = name === value
                    return (
                        <button
                            key={name}
                            type="button"
                            ref={(el) => { refs.current[index] = el }}
                            onClick={() => onChange(name)}
                            onKeyDown={(e) => onKeyDown(e, index)}
                            tabIndex={index === stopIndex ? 0 : -1}
                            aria-pressed={isSelected}
                            aria-label={name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                            title={name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                            className={cn(
                                "flex aspect-square w-full items-center justify-center rounded-xl border transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950",
                                isSelected
                                    ? "border-transparent bg-neutral-900 text-white ring-2 ring-neutral-900 ring-offset-2 dark:bg-white dark:text-neutral-900 dark:ring-white dark:ring-offset-neutral-950"
                                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white",
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
