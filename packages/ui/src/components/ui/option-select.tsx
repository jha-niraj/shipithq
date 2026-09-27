"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "../../lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/*
 * A select with "Other" (plan/hiring-ui HU-2): pick from the list, or type something
 * new and press Enter. Keyboard throughout (cmdk): arrows move, Enter picks, Escape
 * closes. New values are saved by the caller's action (`recordOptions`), which is
 * what grows the shared dataset.
 */

export interface OptionSelectProps {
    value: string
    onChange: (value: string) => void
    options: readonly string[]
    placeholder?: string
    searchPlaceholder?: string
    /** Allow a value that isn't in the list (default true). */
    allowOther?: boolean
    disabled?: boolean
    id?: string
    className?: string
    "aria-invalid"?: boolean
}

export function OptionSelect({
    value, onChange, options, placeholder = "Choose one", searchPlaceholder = "Search or type your own",
    allowOther = true, disabled, id, className, ...rest
}: OptionSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const typed = query.replace(/\s+/g, " ").trim()
    const exact = options.some((o) => o.toLowerCase() === typed.toLowerCase())
    const pick = (v: string) => { onChange(v); setOpen(false); setQuery("") }

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery("") }}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-invalid={rest["aria-invalid"]}
                    disabled={disabled}
                    className={cn(
                        "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 text-left text-sm dark:border-neutral-800 dark:bg-neutral-950",
                        "focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-neutral-900 dark:aria-[invalid=true]:border-white",
                        !value && "text-neutral-500 dark:text-neutral-400",
                        className,
                    )}
                >
                    <span className="truncate">{value || placeholder}</span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0" align="start">
                <Command>
                    <CommandInput value={query} onValueChange={setQuery} placeholder={allowOther ? searchPlaceholder : "Search"} />
                    <CommandList className="max-h-64">
                        <CommandEmpty>{allowOther ? "Nothing matches. Type it and press Enter." : "Nothing matches."}</CommandEmpty>
                        <CommandGroup>
                            {options.map((o) => (
                                <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                                    <Check className={cn("mr-2 h-4 w-4", value === o ? "opacity-100" : "opacity-0")} />
                                    {o}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {allowOther && typed.length >= 2 && !exact && (
                            <CommandGroup heading="Other">
                                {/* The typed text as its own item, so Enter on it (or a click) uses it. */}
                                <CommandItem value={`__other__${typed}`} onSelect={() => pick(typed)} forceMount>
                                    <Plus className="mr-2 h-4 w-4" /> Use &quot;{typed}&quot;
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
