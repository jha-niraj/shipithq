"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { DatePicker, formatLocalDate } from "./date-picker"
import { TimePicker } from "./time-picker"

/**
 * A day and a time side by side, in place of `<input type="datetime-local">`
 * (plan/jobs-polish JP-3).
 *
 * The value is the string `datetime-local` produced, `YYYY-MM-DDTHH:mm` in LOCAL time, so a
 * caller that did `new Date(value)` on submit keeps doing exactly that: a date-time string
 * with no zone parses as local time (only a bare date parses as UTC).
 *
 * The two halves can be set in either order. A time picked before a day is held here and
 * emitted once the day arrives; a day picked before a time takes `defaultTime`.
 */

export interface DateTimePickerProps {
    /** `YYYY-MM-DDTHH:mm`, local time. */
    value?: string | null
    /** Emits `YYYY-MM-DDTHH:mm`, or `undefined` when cleared. */
    onChange: (value: string | undefined) => void
    /**
     * Earliest allowed moment: `YYYY-MM-DD` (days before it are disabled) or
     * `YYYY-MM-DDTHH:mm` (and, on that day, earlier times too).
     */
    min?: string
    /** The time a day takes when it is picked before a time. */
    defaultTime?: string
    /** Minutes between time slots. */
    step?: number
    placeholder?: string
    timePlaceholder?: string
    disabled?: boolean
    className?: string
    /** Shows a clear button on the day once there is a value. */
    clearable?: boolean
    id?: string
    "aria-label"?: string
}

function split(value: string | undefined | null): { date?: string; time?: string } {
    if (!value) return {}
    const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(value)
    if (!m) return {}
    return { date: m[1], time: m[2] }
}

export function DateTimePicker({
    value,
    onChange,
    min,
    defaultTime = "09:00",
    step = 15,
    placeholder = "Pick a date",
    timePlaceholder = "Time",
    disabled,
    className,
    clearable = true,
    id,
    "aria-label": ariaLabel,
}: DateTimePickerProps) {
    const { date, time } = split(value)
    // A time chosen while there is no day yet has nowhere to go in the value.
    const [pendingTime, setPendingTime] = React.useState<string | undefined>(undefined)
    const shownTime = time ?? pendingTime

    const { date: minDate, time: minTime } = split(min)
    // Earlier times are only off-limits on the min day itself.
    const timeMin = minDate && minTime && date === minDate ? minTime : undefined

    return (
        <div className={cn("flex min-w-0 flex-wrap gap-2", className)}>
            <DatePicker
                id={id}
                value={date}
                min={minDate}
                placeholder={placeholder}
                disabled={disabled}
                clearable={clearable}
                aria-label={ariaLabel ? `${ariaLabel}, date` : placeholder}
                className="min-w-[10rem] flex-[2_1_10rem]"
                onChange={(d) => {
                    if (!d) {
                        setPendingTime(undefined)
                        onChange(undefined)
                        return
                    }
                    let t = shownTime ?? defaultTime
                    // Moving onto the min day can put the kept time before the minimum.
                    if (minDate && minTime && d === minDate && t < minTime) t = minTime
                    setPendingTime(undefined)
                    onChange(`${d}T${t}`)
                }}
            />
            <TimePicker
                value={shownTime}
                step={step}
                min={timeMin}
                placeholder={timePlaceholder}
                disabled={disabled}
                aria-label={ariaLabel ? `${ariaLabel}, time` : timePlaceholder}
                className="min-w-[7.5rem] flex-[1_1_7.5rem]"
                onChange={(t) => {
                    if (date) onChange(`${date}T${t}`)
                    else setPendingTime(t)
                }}
            />
        </div>
    )
}

/** Today as `YYYY-MM-DD`, local: the usual `min` for a deadline. */
export function todayLocal(): string {
    return formatLocalDate(new Date())
}
