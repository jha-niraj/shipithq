"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/ui/command"
import { Input } from "@repo/ui/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { cn } from "@repo/ui/lib/utils"
import type { BrowseFacets } from "@/actions/jobs"
import {
    EXP_BANDS, JOB_TYPES, LABEL, PAY_FLOORS, POSTED_DAYS, SORTS, WORK_TYPES, activeFilterCount,
    type BrowseParams, type BrowseSort, type ExpBand, type PayFloor, type Posted,
} from "@/lib/jobs/browse-params"

/*
 * The Browse filters (plan/jobs-polish JP-23): the search, then one small dropdown per
 * filter in a row (never a sheet), the sort, and Clear all. A set filter shows its value on
 * its button. Every change goes to the URL through `onChange`, which resets to page 1.
 */

type Change = (next: Partial<BrowseParams>) => void

export function BrowseFilters({ params: p, facets, signedIn, onChange }: { params: BrowseParams; facets: BrowseFacets; signedIn: boolean; onChange: Change }) {
    const [q, setQ] = useState(p.q)
    const last = useRef(p.q)
    // The URL changed underneath (back button, Clear all): show what it says.
    useEffect(() => { if (p.q !== last.current) { last.current = p.q; setQ(p.q) } }, [p.q])
    useEffect(() => {
        const next = q.replace(/\s+/g, " ").trim()
        if (next === last.current) return
        const t = setTimeout(() => { last.current = next; onChange({ q: next }) }, 300)
        return () => clearTimeout(t)
    }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
    const count = activeFilterCount(p)
    const companyName = (id: string) => facets.companies.find((c) => c.id === id)?.name ?? "Company"

    return (
        <div className="space-y-3">
            {/* Search and sort on one row; the filters on the next, with Clear at its end. */}
            <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
                <Input
                    type="search"
                    aria-label="Search jobs"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by title, company or skill"
                    className="pl-9"
                    maxLength={80}
                />
            </div>
            <Select value={p.sort} onValueChange={(v) => onChange({ sort: v as BrowseSort })}>
                <SelectTrigger className="w-40 shrink-0" aria-label="Sort by"><SelectValue /></SelectTrigger>
                <SelectContent align="end">
                    {SORTS.filter((s) => s !== "match" || signedIn).map((s) => <SelectItem key={s} value={s}>{LABEL.sort[s]}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Menu label="Work type" summary={summary(p.where.map((v) => LABEL.where[v]))}>
                    {WORK_TYPES.map((v) => <CheckRow key={v} label={LABEL.where[v]} checked={p.where.includes(v)} onToggle={() => onChange({ where: toggle(p.where, v) })} />)}
                </Menu>
                <Menu label="Job type" summary={summary(p.type.map((v) => LABEL.type[v]))}>
                    {JOB_TYPES.map((v) => <CheckRow key={v} label={LABEL.type[v]} checked={p.type.includes(v)} onToggle={() => onChange({ type: toggle(p.type, v) })} />)}
                </Menu>
                <Menu label="Experience" summary={summary(p.exp.map((v) => LABEL.exp[v]))}>
                    {(Object.keys(EXP_BANDS) as ExpBand[]).map((v) => <CheckRow key={v} label={LABEL.exp[v]} checked={p.exp.includes(v)} onToggle={() => onChange({ exp: toggle(p.exp, v) })} />)}
                </Menu>
                <Menu label="Salary" summary={p.pay ? LABEL.pay[p.pay] : null}>
                    <PickRow label="Any" picked={!p.pay} onPick={() => onChange({ pay: null })} />
                    {(Object.keys(PAY_FLOORS) as PayFloor[]).map((v) => <PickRow key={v} label={LABEL.pay[v]} picked={p.pay === v} onPick={() => onChange({ pay: v })} />)}
                    <p className="px-2 pb-1 pt-2 text-xs text-neutral-500 dark:text-neutral-400">Jobs that don&apos;t show a salary are left out.</p>
                </Menu>
                <Menu label="Posted" summary={p.posted ? LABEL.posted[p.posted] : null}>
                    <PickRow label="Any time" picked={!p.posted} onPick={() => onChange({ posted: null })} />
                    {(Object.keys(POSTED_DAYS) as Posted[]).map((v) => <PickRow key={v} label={LABEL.posted[v]} picked={p.posted === v} onPick={() => onChange({ posted: v })} />)}
                </Menu>
                <SearchMenu
                    label="Skills"
                    summary={summary(p.skill)}
                    placeholder="Find a skill"
                    items={facets.skills.map((s) => ({ value: s.value, label: s.value, count: s.count }))}
                    selected={p.skill}
                    onToggle={(v) => onChange({ skill: toggle(p.skill, v) })}
                />
                <SearchMenu
                    label="Company"
                    summary={summary(p.company.map(companyName))}
                    placeholder="Find a company"
                    items={facets.companies.map((c) => ({ value: c.id, label: c.name, count: c.count }))}
                    selected={p.company}
                    onToggle={(v) => onChange({ company: toggle(p.company, v) })}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={p.rounds}
                    onClick={() => onChange({ rounds: !p.rounds })}
                    className={cn("gap-1.5", p.rounds && "border-neutral-900 dark:border-white")}
                >
                    {p.rounds && <Check className="h-3.5 w-3.5" />} Has practice rounds
                </Button>

                {count > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => onChange({ where: [], type: [], exp: [], pay: null, posted: null, rounds: false, skill: [], company: [] })}
                        >
                            <X className="h-3.5 w-3.5" /> Clear {count === 1 ? "filter" : `${count} filters`}
                        </Button>
                )}
            </div>
        </div>
    )
}

/** "Remote", "Remote +1", or nothing. */
function summary(values: string[]): string | null {
    if (!values.length) return null
    return values.length === 1 ? values[0]! : `${values[0]} +${values.length - 1}`
}

function Menu({ label, summary, children }: { label: string; summary: string | null; children: React.ReactNode }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={cn("gap-1.5", summary && "border-neutral-900 dark:border-white")}>
                    <span className={cn(summary && "text-neutral-500 dark:text-neutral-400")}>{label}{summary ? ":" : ""}</span>
                    {summary && <span className="max-w-[10rem] truncate">{summary}</span>}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">{children}</PopoverContent>
        </Popover>
    )
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
    return (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">
            <Checkbox checked={checked} onCheckedChange={onToggle} />
            {label}
        </label>
    )
}

function PickRow({ label, picked, onPick }: { label: string; picked: boolean; onPick: () => void }) {
    return (
        <button
            type="button"
            role="menuitemradio"
            aria-checked={picked}
            onClick={onPick}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
            {label}
            {picked && <Check className="h-3.5 w-3.5" />}
        </button>
    )
}

function SearchMenu({ label, summary: sum, placeholder, items, selected, onToggle }: {
    label: string; summary: string | null; placeholder: string
    items: { value: string; label: string; count: number }[]
    selected: string[]; onToggle: (v: string) => void
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={cn("gap-1.5", sum && "border-neutral-900 dark:border-white")}>
                    <span className={cn(sum && "text-neutral-500 dark:text-neutral-400")}>{label}{sum ? ":" : ""}</span>
                    {sum && <span className="max-w-[10rem] truncate">{sum}</span>}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>Nothing matches.</CommandEmpty>
                        <CommandGroup>
                            {items.map((it) => (
                                <CommandItem key={it.value} value={`${it.label} ${it.value}`} onSelect={() => onToggle(it.value)} className="gap-2.5">
                                    <Checkbox checked={selected.includes(it.value)} tabIndex={-1} aria-hidden className="pointer-events-none" />
                                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                                    <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{it.count}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
