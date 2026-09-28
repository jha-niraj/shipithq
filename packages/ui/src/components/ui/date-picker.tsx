"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/**
 * A single-day picker: the shared Calendar in a Popover, in place of `<input type="date">`.
 *
 * The native input renders the operating system's picker, which no styling reaches (on macOS
 * Chrome it is the one blue thing in a monochrome product), and its text box reads
 * `dd/mm/yyyy` or `mm/dd/yyyy` depending on the machine. This one reads "Sep 28, 2026"
 * everywhere (plan/jobs-polish JP-3, overview point 11).
 *
 * The value is the same `YYYY-MM-DD` string the native input produced, so a caller swaps the
 * control and keeps its state.
 *
 * The timezone trap: `new Date("2026-09-28")` parses as UTC midnight, which is the 27th for
 * anyone west of Greenwich. Both directions are built from LOCAL parts here, and
 * `toISOString()` is never used to format.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `YYYY-MM-DD` (anything after it is ignored) -> a LOCAL Date at midnight, or undefined. */
export function parseLocalDate(value: string | undefined | null): Date | undefined {
    if (!value) return undefined
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!m) return undefined
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    const day = Number(m[3])
    if (month < 0 || month > 11 || day < 1 || day > 31) return undefined
    const d = new Date(year, month, day)
    // 2026-02-31 rolls over into March; that is not the date that was written.
    if (d.getMonth() !== month) return undefined
    return d
}

/** A local Date -> `YYYY-MM-DD`, from local parts. */
export function formatLocalDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** "Sep 28, 2026". */
function label(d: Date): string {
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/**
 * The trigger look every picker in this family shares: the height and border of a form field,
 * so a picker sits in a row beside an `Input` or a `Select` without looking like a button.
 */
export const pickerTriggerClass = cn(
    "flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-left text-sm",
    "border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
    "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800",
    "focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:focus-visible:border-neutral-500",
    "data-[state=open]:border-neutral-400 dark:data-[state=open]:border-neutral-500",
    "disabled:cursor-not-allowed disabled:opacity-50",
)

export interface DatePickerProps {
    /** `YYYY-MM-DD`. Anything after the date (a time, a zone) is ignored. */
    value?: string | null
    /** Emits `YYYY-MM-DD`, or `undefined` when cleared. */
    onChange: (value: string | undefined) => void
    /** Earliest selectable day, `YYYY-MM-DD`. */
    min?: string
    /** Latest selectable day, `YYYY-MM-DD`. */
    max?: string
    placeholder?: string
    disabled?: boolean
    className?: string
    /** Shows a clear button once there is a value. */
    clearable?: boolean
    id?: string
    "aria-label"?: string
}

export function DatePicker({
    value,
    onChange,
    min,
    max,
    placeholder = "Pick a date",
    disabled,
    className,
    clearable = false,
    id,
    "aria-label": ariaLabel,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const selected = parseLocalDate(value)
    const minDate = parseLocalDate(min)
    const maxDate = parseLocalDate(max)

    // The dropdowns span the allowed range when there is one, else a wide default: a hundred
    // years back (birthdays, graduations) and ten forward (deadlines).
    const thisYear = new Date().getFullYear()
    const startMonth = minDate ?? new Date(thisYear - 100, 0)
    const endMonth = maxDate ?? new Date(thisYear + 10, 11)

    const disabledDays = [
        ...(minDate ? [{ before: minDate }] : []),
        ...(maxDate ? [{ after: maxDate }] : []),
    ]

    // Open on the selected month, else on today clamped into the range.
    const today = new Date()
    const openMonth =
        selected ??
        (minDate && today < minDate ? minDate : maxDate && today > maxDate ? maxDate : today)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    id={id}
                    disabled={disabled}
                    aria-label={ariaLabel ?? placeholder}
                    className={cn(pickerTriggerClass, className)}
                >
                    <CalendarIcon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    <span
                        className={cn(
                            "min-w-0 flex-1 truncate",
                            !selected && "text-neutral-500 dark:text-neutral-400",
                        )}
                    >
                        {selected ? label(selected) : placeholder}
                    </span>
                    {clearable && selected && !disabled && (
                        // A span, not a nested button: a button inside a button is invalid HTML.
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Clear date"
                            className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
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
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    defaultMonth={openMonth}
                    captionLayout="dropdown"
                    startMonth={startMonth}
                    endMonth={endMonth}
                    disabled={disabledDays}
                    onSelect={(d) => {
                        // Clicking the selected day again deselects it in single mode; that
                        // means "keep it", not "clear it" (clearing is the X on the trigger).
                        if (d) onChange(formatLocalDate(d))
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
