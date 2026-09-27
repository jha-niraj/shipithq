"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import { cn } from "../../lib/utils"

/*
 * Chips from a suggestion list or typed (plan/hiring-ui HU-2). Keyboard throughout:
 * ArrowUp and ArrowDown move through the suggestions, Enter adds the highlighted one
 * (or what was typed), Backspace in an empty field removes the last chip, Escape
 * closes the list. A typed value that isn't a suggestion is kept as typed; the
 * caller's action records it in the shared dataset.
 */

export interface TagInputProps {
    values: string[]
    onChange: (values: string[]) => void
    suggestions?: readonly string[]
    placeholder?: string
    max?: number
    id?: string
    className?: string
    disabled?: boolean
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 60)

export function TagInput({ values, onChange, suggestions = [], placeholder = "Type and press Enter", max = 30, id, className, disabled }: TagInputProps) {
    const [query, setQuery] = React.useState("")
    const [open, setOpen] = React.useState(false)
    const [active, setActive] = React.useState(0)
    const listId = React.useId()

    const have = new Set(values.map((v) => v.toLowerCase()))
    const q = query.trim().toLowerCase()
    const matches = suggestions.filter((s) => !have.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q))).slice(0, 8)
    const typed = clean(query)
    const offerTyped = typed.length >= 2 && !have.has(typed.toLowerCase()) && !matches.some((m) => m.toLowerCase() === typed.toLowerCase())
    const items = offerTyped ? [...matches, typed] : matches
    const full = values.length >= max

    const add = (v: string) => {
        const c = clean(v)
        if (!c || have.has(c.toLowerCase()) || full) return
        onChange([...values, c])
        setQuery("")
        setActive(0)
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => (items.length ? (i + 1) % items.length : 0)) }
        else if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0)) }
        else if (e.key === "Enter") {
            e.preventDefault()
            if (open && items[active]) add(items[active]!)
            else if (typed) add(typed)
        } else if (e.key === "Escape") setOpen(false)
        else if (e.key === "Backspace" && !query && values.length) onChange(values.slice(0, -1))
        else if (e.key === ",") { e.preventDefault(); if (typed) add(typed) }
    }

    return (
        <div className={cn("relative", className)}>
            <div className={cn(
                "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-950",
                "focus-within:ring-2 focus-within:ring-neutral-400",
                disabled && "opacity-50",
            )}>
                {values.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                        {v}
                        <button type="button" disabled={disabled} onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <input
                    id={id}
                    value={query}
                    disabled={disabled || full}
                    role="combobox"
                    aria-expanded={open && items.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
                    placeholder={full ? `Up to ${max}` : values.length ? "" : placeholder}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onKeyDown={onKeyDown}
                    className="h-7 min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />
            </div>
            {open && items.length > 0 && (
                <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-md dark:border-neutral-800 dark:bg-neutral-950">
                    {items.map((s, i) => (
                        <li
                            key={s}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === active}
                            // mousedown, not click: the input's blur would close the list first.
                            onMouseDown={(e) => { e.preventDefault(); add(s) }}
                            onMouseEnter={() => setActive(i)}
                            className={cn("flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm", i === active ? "bg-neutral-100 dark:bg-neutral-800" : "")}
                        >
                            {offerTyped && i === items.length - 1 ? <><Plus className="h-3.5 w-3.5" /> Add &quot;{s}&quot;</> : s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
