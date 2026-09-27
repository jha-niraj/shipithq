"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

/*
 * A number typed as text (plan/hiring-ui HU-2, Niraj 2026-09-27: no `type="number"`
 * spinners). Digits only (and one decimal point when `decimals`), checked against
 * min and max, and shown with Indian grouping for money (15,00,000). The parent gets
 * a number or null; the message under the field says what's wrong, if anything.
 */

export interface NumberTextInputProps {
    value: number | null
    onChange: (value: number | null) => void
    min?: number
    max?: number
    /** Group digits (en-IN) when not focused, for amounts. */
    grouped?: boolean
    decimals?: boolean
    placeholder?: string
    id?: string
    className?: string
    disabled?: boolean
    /** Shown after the value inside the field ("years", "min", "%"). */
    suffix?: string
    /** Classes for the input itself (the height in a compact row); `className` styles the wrapper. */
    inputClassName?: string
    /** A caller's own error, shown in place of the range message. */
    error?: string | null
    "aria-label"?: string
}

const fmt = (n: number, grouped: boolean) => (grouped ? n.toLocaleString("en-IN") : String(n))

export function NumberTextInput({
    value, onChange, min, max, grouped = false, decimals = false, placeholder, id, className, inputClassName, disabled, suffix, error, ...rest
}: NumberTextInputProps) {
    const [text, setText] = React.useState(value === null ? "" : fmt(value, grouped))
    const [focused, setFocused] = React.useState(false)

    // Follow the parent's value when it changes from outside (a reset, a loaded draft).
    React.useEffect(() => {
        if (!focused) setText(value === null ? "" : fmt(value, grouped))
    }, [value, grouped, focused])

    const range = value === null ? null
        : min !== undefined && value < min ? `At least ${fmt(min, grouped)}`
            : max !== undefined && value > max ? `At most ${fmt(max, grouped)}` : null
    const message = error ?? range

    const onText = (raw: string) => {
        const allowed = decimals ? raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1") : raw.replace(/\D/g, "")
        const clipped = allowed.slice(0, 15)
        setText(clipped)
        onChange(clipped === "" || clipped === "." ? null : Number(clipped))
    }

    return (
        <div className={className}>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    inputMode={decimals ? "decimal" : "numeric"}
                    autoComplete="off"
                    value={text}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-label={rest["aria-label"]}
                    aria-invalid={Boolean(message)}
                    onFocus={() => { setFocused(true); setText(value === null ? "" : String(value)) }}
                    onBlur={() => { setFocused(false); setText(value === null ? "" : fmt(value, grouped)) }}
                    onChange={(e) => onText(e.target.value)}
                    className={cn(
                        "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm tabular-nums dark:border-neutral-800 dark:bg-neutral-950",
                        "placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-50",
                        "aria-[invalid=true]:border-neutral-900 dark:aria-[invalid=true]:border-white",
                        suffix && "pr-16",
                        inputClassName,
                    )}
                />
                {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-500 dark:text-neutral-400">{suffix}</span>}
            </div>
            {message && <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300" role="alert">{message}</p>}
        </div>
    )
}
