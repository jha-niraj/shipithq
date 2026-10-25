"use client"

import * as React from "react"
import { ChevronDown, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { Input } from "./input"
import { Label } from "./label"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ScrollArea } from "./scroll-area"

/**
 * A checkbox dropdown with the picked items as removable chips under it. Lifted from the Pulse monitor builder's
 * "Limit to classes" picker (2026-10-24) so the exam report's class picker is the same control. It replaced a wrap of
 * toggle pills where a picked and an unpicked item differed only by fill. Empty means "all".
 */
export interface CheckboxMultiSelectOption {
	value: string
	label: string
	/** Indented one step - a section under its class. */
	indent?: boolean
}

export interface CheckboxMultiSelectProps {
	label: string
	/** Adds "(optional)" after the label. */
	optional?: boolean
	options: CheckboxMultiSelectOption[]
	value: string[]
	onChange: (next: string[]) => void
	/** The trigger's text when nothing is picked, e.g. "All classes". */
	allLabel: string
	/** "classes" in "3 classes selected". */
	pluralNoun: string
	searchPlaceholder?: string
	/** The line under the trigger when nothing is picked, e.g. "Every class is watched." */
	emptyHint?: string
	className?: string
}

export function CheckboxMultiSelect({
	label,
	optional,
	options,
	value,
	onChange,
	allLabel,
	pluralNoun,
	searchPlaceholder = "Find",
	emptyHint,
	className,
}: CheckboxMultiSelectProps) {
	const [open, setOpen] = React.useState(false)
	const [query, setQuery] = React.useState("")
	const picked = new Set(value)
	const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v
	const q = query.trim().toLowerCase()
	const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
	const toggle = (v: string) => onChange(picked.has(v) ? value.filter((c) => c !== v) : [...value, v])
	const summary = value.length === 0 ? allLabel : value.length === 1 ? labelOf(value[0]!) : `${value.length} ${pluralNoun} selected`

	return (
		<div className={cn("space-y-1.5", className)}>
			<Label className="text-sm text-neutral-700 dark:text-neutral-200">
				{label}
				{optional && <span className="font-normal text-neutral-600 dark:text-neutral-300"> (optional)</span>}
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-haspopup="listbox"
						aria-expanded={open}
						className="flex h-9 w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-900"
					>
						<span className="truncate">{summary}</span>
						<ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
					</button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-0">
					<div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={searchPlaceholder}
							className="h-8 rounded-xl text-sm"
							aria-label={searchPlaceholder}
						/>
					</div>
					<ScrollArea orientation="vertical" viewportClassName="max-h-64">
						<div className="p-1" role="listbox" aria-multiselectable="true" aria-label={label}>
							{shown.length === 0 && (
								<p className="px-2 py-3 text-xs text-neutral-600 dark:text-neutral-300">Nothing matches.</p>
							)}
							{shown.map((o) => (
								<label
									key={o.value}
									role="option"
									aria-selected={picked.has(o.value)}
									className={cn(
										"flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
										o.indent && "pl-7",
									)}
								>
									<Checkbox checked={picked.has(o.value)} onCheckedChange={() => toggle(o.value)} />
									<span className="truncate">{o.label}</span>
								</label>
							))}
						</div>
					</ScrollArea>
					<div className="flex items-center justify-between gap-2 border-t border-neutral-200 p-2 dark:border-neutral-800">
						<span className="text-xs text-neutral-600 dark:text-neutral-300">
							{value.length ? `${value.length} of ${options.length}` : allLabel}
						</span>
						<div className="flex gap-1">
							<Button type="button" variant="ghost" size="sm" className="h-7 rounded-xl text-xs" onClick={() => onChange([])} disabled={value.length === 0}>
								Clear
							</Button>
							<Button type="button" size="sm" className="h-7 rounded-xl text-xs" onClick={() => setOpen(false)}>
								Done
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
			{value.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{value.map((v) => (
						<span
							key={v}
							className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
						>
							{labelOf(v)}
							<button
								type="button"
								onClick={() => toggle(v)}
								aria-label={`Remove ${labelOf(v)}`}
								className="rounded-full p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					))}
				</div>
			) : emptyHint ? (
				<p className="text-xs text-neutral-600 dark:text-neutral-300">{emptyHint}</p>
			) : null}
		</div>
	)
}
