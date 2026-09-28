"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/**
 * A month + year picker for the app's own calendar.
 *
 * ── Why this exists ──
 *
 * The resume editor and the profile sheets used `<Input type="date">`, which renders the
 * OPERATING SYSTEM's date picker. On macOS Chrome that is a blue-accented calendar with its
 * own type and its own idea of a selected state, and no amount of styling reaches inside it -
 * it is not in the page. In a product whose palette is monochrome black/neutral it was the
 * one blue thing on screen.
 *
 * ── Month, not day ──
 *
 * Every consumer of these dates renders month and year: the resume preview prints
 * "Aug 2026 - Present", and `dd/mm/yyyy` was asking for a precision that is then thrown
 * away. So the value is normalised to the FIRST of the chosen month, and the trigger shows
 * "Aug 2026".
 *
 * ── The timezone trap ──
 *
 * `new Date('2026-08-01')` parses as UTC midnight, which in any negative offset is
 * 31 July local - so a naive round trip walks the date backwards a month at a time for
 * anyone west of Greenwich. Both directions here are built from local Y/M/D parts and
 * formatted by hand, and `Date.parse` is never given a bare date string.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-08-01T00:00:00.000Z` or `2026-08-01` -> a LOCAL Date at the first of that month. */
function parseLocal(iso: string | undefined | null): Date | undefined {
    if (!iso) return undefined
    const m = /^(\d{4})-(\d{2})/.exec(iso)
    if (!m) return undefined
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    if (!Number.isFinite(year) || month < 0 || month > 11) return undefined
    return new Date(year, month, 1)
}

/**
 * A local Date -> `YYYY-MM-01` (or `YYYY-MM`, the shape `<input type="month">` produced).
 * Hand-formatted; `toISOString()` would shift the day.
 */
function formatIso(d: Date, format: MonthPickerFormat): string {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    return format === "YYYY-MM" ? ym : `${ym}-01`
}

/** What the trigger shows. */
function label(d: Date): string {
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export type MonthPickerFormat = "YYYY-MM-01" | "YYYY-MM"

export interface MonthPickerProps {
    /** ISO date string, or `YYYY-MM`. Only the year and month are read. */
    value?: string | null
    /** Emits `YYYY-MM-01` (or `YYYY-MM`, see `format`), or `undefined` when cleared. */
    onChange: (value: string | undefined) => void
    /**
     * The shape `onChange` emits. `YYYY-MM-01` (the default, what the resume and profile
     * store) or `YYYY-MM` (what a replaced `<input type="month">` held).
     */
    format?: MonthPickerFormat
    /** Earliest selectable month, `YYYY-MM` (a full date is accepted; only Y and M are read). */
    min?: string
    /** Latest selectable month, `YYYY-MM` (a full date is accepted; only Y and M are read). */
    max?: string
    placeholder?: string
    disabled?: boolean
    className?: string
    /** Shows a clear button once there is a value. */
    clearable?: boolean
    "aria-label"?: string
}

export function MonthPicker({
    value,
    onChange,
    placeholder = "Select month",
    disabled,
    className,
    clearable = true,
    format = "YYYY-MM-01",
    min,
    max,
    "aria-label": ariaLabel,
}: MonthPickerProps) {
    const [open, setOpen] = React.useState(false)
    const selected = parseLocal(value)
    const minMonth = parseLocal(min)
    const maxMonth = parseLocal(max)
    // The day grid is still a day grid, so the range is stated in days: from the first of
    // the min month to the last of the max month (day 0 of the next month).
    const lastOfMax = maxMonth ? new Date(maxMonth.getFullYear(), maxMonth.getMonth() + 1, 0) : undefined
    const disabledDays = [
        ...(minMonth ? [{ before: minMonth }] : []),
        ...(lastOfMax ? [{ after: lastOfMax }] : []),
    ]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-label={ariaLabel ?? placeholder}
                    className={cn(
                        "w-full cursor-pointer justify-start px-3 text-left font-normal",
                        !selected && "text-neutral-600 dark:text-neutral-500",
                        className,
                    )}
                >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{selected ? label(selected) : placeholder}</span>
                    {clearable && selected && !disabled && (
                        // A span, not a nested button: a button inside a button is invalid
                        // HTML and React will not render it reliably.
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Clear date"
                            className="ml-auto cursor-pointer rounded p-0.5 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onChange(undefined)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onChange(undefined)
                                }
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    defaultMonth={selected ?? (maxMonth && new Date() > maxMonth ? maxMonth : undefined)}
                    // Dropdowns rather than one-month-at-a-time arrows: a resume routinely
                    // reaches back years, and paging there by hand is the thing that makes
                    // a date picker feel broken.
                    captionLayout="dropdown"
                    startMonth={minMonth ?? new Date(1970, 0)}
                    endMonth={maxMonth ?? new Date(new Date().getFullYear() + 10, 11)}
                    disabled={disabledDays}
                    onSelect={(d) => {
                        if (!d) {
                            setOpen(false)
                            return
                        }
                        // Normalised to the first of the month: the day is never displayed,
                        // and storing whichever day happened to be clicked makes two equal
                        // months compare unequal.
                        onChange(formatIso(new Date(d.getFullYear(), d.getMonth(), 1), format))
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
