"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "../../lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

/**
 * A time of day as a list of slots, in place of `<input type="time">` (plan/jobs-polish JP-3).
 *
 * The native input is the operating system's control: a 24-hour spinner on one machine, a
 * 12-hour one with an AM/PM field on the next, and unstyleable on both. Nobody booking a
 * stand-up needs 9:07, so this is the shared Select with one row per `step` minutes,
 * labelled "9:30 am".
 *
 * The value is the `HH:mm` string the native input produced. A stored value that is not on
 * the grid (an old "09:07") is shown as its own row rather than silently dropped, so opening
 * the form and saving it again never changes the time.
 */

/** `HH:mm` -> minutes since midnight, or undefined when it is not a time. */
function toMinutes(value: string | undefined | null): number | undefined {
    if (!value) return undefined
    const m = /^(\d{1,2}):(\d{2})/.exec(value)
    if (!m) return undefined
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return undefined
    return h * 60 + min
}

function toValue(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

/** "9:30 am", "12:00 pm", "12:15 am". */
export function formatTimeLabel(value: string): string {
    const total = toMinutes(value)
    if (total === undefined) return value
    const h = Math.floor(total / 60)
    const m = total % 60
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`
}

export interface TimePickerProps {
    /** `HH:mm`, 24-hour. */
    value?: string | null
    /** Emits `HH:mm`. */
    onChange: (value: string) => void
    /** Minutes between slots. */
    step?: number
    /** Earliest selectable slot, `HH:mm`. Earlier slots are listed but disabled. */
    min?: string
    /** Latest selectable slot, `HH:mm`. Later slots are listed but disabled. */
    max?: string
    placeholder?: string
    disabled?: boolean
    className?: string
    id?: string
    "aria-label"?: string
}

export function TimePicker({
    value,
    onChange,
    step = 15,
    min,
    max,
    placeholder = "Pick a time",
    disabled,
    className,
    id,
    "aria-label": ariaLabel,
}: TimePickerProps) {
    const current = toMinutes(value)
    const minM = toMinutes(min)
    const maxM = toMinutes(max)
    const safeStep = Number.isFinite(step) && step >= 1 && step <= 720 ? Math.floor(step) : 15

    const slots = React.useMemo(() => {
        const list: number[] = []
        for (let t = 0; t < 24 * 60; t += safeStep) list.push(t)
        // An off-grid stored value keeps its own row, in order.
        if (current !== undefined && !list.includes(current)) {
            list.push(current)
            list.sort((a, b) => a - b)
        }
        return list
    }, [safeStep, current])

    return (
        <Select
            value={current === undefined ? "" : toValue(current)}
            onValueChange={(v) => {
                if (v) onChange(v)
            }}
            disabled={disabled}
        >
            <SelectTrigger
                id={id}
                aria-label={ariaLabel ?? placeholder}
                className={cn("h-10 gap-2 font-normal", className)}
            >
                <Clock className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <SelectValue placeholder={placeholder}>
                    {current === undefined ? undefined : formatTimeLabel(toValue(current))}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
                {slots.map((t) => (
                    <SelectItem
                        key={t}
                        value={toValue(t)}
                        disabled={(minM !== undefined && t < minM) || (maxM !== undefined && t > maxM)}
                    >
                        {formatTimeLabel(toValue(t))}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
