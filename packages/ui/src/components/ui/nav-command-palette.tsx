"use client"

// From gurukulhq (2026-09-22), gray mapped to neutral for ShipItHQ's palette.

import * as React from "react"
import {
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from "@repo/ui/components/ui/command"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/ui/dialog"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"

export type NavCommandItem = {
	/** Visible label. */
	label: string
	/** Route to navigate to when picked. */
	href: string
	/**
	 * Stable identity, when `href` is not unique.
	 *
	 * Most items ARE their route, so this is usually omitted. It exists for an item that runs
	 * something instead of navigating - "Add Student" opens a sheet and shares `/students` with
	 * "All Students", so keying on href alone would collapse the two into one row.
	 *
	 * Safe to make anything: cmdk scores an item by its keywords, deliberately NOT by this
	 * value, so an id like `action:add-student` cannot produce a false search hit.
	 */
	id?: string
	/** Optional group heading + subtitle (e.g. the parent section name). */
	section?: string
	/** Optional leading icon. */
	icon?: React.ReactNode
	/** Extra search terms. */
	keywords?: string[]
}

// ── Fuzzy scorer (self-contained; mirrors apps/main/lib/fuzzy) ───────────────────
function fuzzyScore(text: string, query: string): number {
	if (!query) return 1
	const t = text.toLowerCase()
	const q = query.toLowerCase()
	const idx = t.indexOf(q)
	if (idx !== -1) {
		const boundary = idx === 0 || /[\s/\-_]/.test(t[idx - 1] ?? "")
		return 1000 - idx + (boundary ? 200 : 0)
	}
	// Subsequence match with consecutive + word-boundary bonuses.
	let ti = 0, score = 0, consecutive = 0, prev = -2
	for (let qi = 0; qi < q.length; qi++) {
		const c = q[qi]!
		let found = -1
		for (let k = ti; k < t.length; k++) { if (t[k] === c) { found = k; break } }
		if (found === -1) return 0
		consecutive = found === prev + 1 ? consecutive + 1 : 0
		const boundary = found === 0 || /[\s/\-_]/.test(t[found - 1] ?? "")
		score += 1 + consecutive * 3 + (boundary ? 5 : 0)
		prev = found
		ti = found + 1
	}
	return score
}

// ── Synonym clusters: searching any term surfaces the whole cluster ─────────────
// e.g. "credits" also surfaces Subscriptions / Billing / Plans; "exam" surfaces
// Results / Marks / Grading. Matches are ranked BELOW direct hits (see SYN_WEIGHT).
const SYNONYM_CLUSTERS: string[][] = [
	["credit", "credits", "topup", "wallet", "subscription", "subscriptions", "plan", "plans", "billing", "bill", "payment", "payments", "revenue", "invoice", "fee", "fees", "khalti", "bank", "transaction", "finance", "money", "income", "expense", "salary", "budget"],
	["student", "students", "pupil", "learner", "enroll", "enrollment", "admission", "roll"],
	["staff", "teacher", "teachers", "faculty", "member", "members", "employee", "leave", "appraisal"],
	["exam", "exams", "examination", "test", "result", "results", "marks", "marksheet", "grade", "grades", "grading", "question", "questions", "paper"],
	["attendance", "present", "absent"],
	["message", "messages", "chat", "conversation", "announcement", "announcements", "communication", "communications", "broadcast", "notice", "notices", "update", "updates"],
	["timetable", "schedule", "scheduling", "period", "periods", "routine", "calendar", "planner"],
	["fee", "fees", "billing", "discount", "discounts", "invoice", "receipt"],
	["report", "reports", "analytics", "insight", "insights", "stats", "statistics", "dashboard", "usage"],
	["setting", "settings", "config", "configuration", "preferences", "system"],
	["curriculum", "syllabus", "toc", "lesson", "lessons", "unit", "units", "chapter", "chapters", "subject", "subjects", "grading"],
	["class", "classes", "section", "sections", "room", "rooms", "department", "departments"],
]

const SYN_WEIGHT = 0.4 // synonym matches score 40% of a direct match

/** Expand a query into related synonym terms (excluding the original words). */
function expandSynonyms(query: string): string[] {
	const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
	if (words.length === 0) return []
	const out = new Set<string>()
	for (const w of words) {
		for (const cluster of SYNONYM_CLUSTERS) {
			if (cluster.some((term) => term.includes(w) || w.includes(term))) {
				for (const term of cluster) out.add(term)
			}
		}
	}
	for (const w of words) out.delete(w)
	return [...out]
}

/**
 * cmdk filter: score an item by its keywords (label + section + extras) only -
 * NOT its value (the href), so a path slug never causes a false hit. Direct fuzzy
 * hits rank first; synonym-cluster hits are included at a reduced weight so
 * related pages ("subscriptions" when you type "credits") still show up.
 */
function commandFilter(_value: string, search: string, keywords?: string[]): number {
	const q = search.trim()
	if (!q) return 1
	const ks = keywords ?? []
	if (ks.length === 0) return 0
	let best = 0
	for (const k of ks) best = Math.max(best, fuzzyScore(k, q))
	if (best === 0) {
		for (const term of expandSynonyms(q)) {
			for (const k of ks) {
				const s = fuzzyScore(k, term)
				if (s > 0) best = Math.max(best, s * SYN_WEIGHT)
			}
		}
	}
	return best
}

// Score an item for the flat, globally-sorted results list. The label is weighted well above
// the section/keywords so a literal page-name hit (e.g. "Fees" for "fees") always wins over a
// synonym or section match on another page - the whole point of a search box.
function scoreItem(item: NavCommandItem, q: string): number {
	const label = fuzzyScore(item.label, q)
	const rest = commandFilter("", q, [item.section ?? "", ...(item.keywords ?? [])].filter(Boolean))
	// Label hits get a large multiplier so "Fees" beats "Billing"/"Finance" (synonym matches).
	return Math.max(label * 3, rest)
}

// Command styling (copied from the shared CommandDialog so groups/items look right).
const COMMAND_CLASS =
	"[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 " +
	// Tall, prominent search field with a larger magnifier - the field is the whole point of
	// the palette, so it gets the visual weight rather than sharing it with a title bar.
	"[&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input-wrapper]_svg]:opacity-100 [&_[cmdk-input]]:h-16 [&_[cmdk-input]]:text-base " +
	"[&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"

/** One keyboard hint in the footer bar. */
function Hint({ keys, children }: { keys: string[]; children: React.ReactNode }) {
	return (
		<span className="flex items-center gap-1.5">
			<span className="flex items-center gap-0.5">
				{keys.map((k) => (
					<kbd
						key={k}
						className="flex h-5 min-w-5 items-center justify-center rounded border border-neutral-200 bg-white px-1 font-sans text-[11px] text-neutral-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
					>
						{k}
					</kbd>
				))}
			</span>
			{children}
		</span>
	)
}

/**
 * Shared ⌘K-style command palette for sidebar nav search. Keyboard Up/Down + Enter
 * come from cmdk; results are wrapped in a styled ScrollArea and matched with a
 * fuzzy + synonym-aware filter. Framework-agnostic: navigation is done by the
 * consumer via `onSelect`.
 */
export function NavCommandPalette({
	open,
	onOpenChange,
	items,
	onSelect,
	placeholder = "Search pages...",
	emptyMessage = "No matching pages.",
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	items: NavCommandItem[]
	onSelect: (item: NavCommandItem) => void
	placeholder?: string
	emptyMessage?: string
}) {
	const [query, setQuery] = React.useState("")
	const trimmed = query.trim()

	// Reset the query each time the palette opens so it always starts fresh.
	React.useEffect(() => { if (!open) setQuery("") }, [open])

	// Group by section for BROWSE mode (empty query), preserving first-seen order.
	const groups = React.useMemo(() => {
		const map = new Map<string, NavCommandItem[]>()
		for (const it of items) {
			const key = it.section ?? ""
			if (!map.has(key)) map.set(key, [])
			map.get(key)!.push(it)
		}
		return [...map.entries()]
	}, [items])

	// SEARCH mode: one flat list, globally sorted by score, so the strongest text match is
	// always first (grouping by section previously buried direct hits below synonym matches).
	const results = React.useMemo(() => {
		if (!trimmed) return null
		return items
			.map((it) => ({ it, s: scoreItem(it, trimmed) }))
			.filter((x) => x.s > 0)
			.sort((a, b) => b.s - a.s)
			.map((x) => x.it)
	}, [items, trimmed])

	const handleSelect = (item: NavCommandItem) => {
		onOpenChange(false)
		onSelect(item)
	}

	const renderItem = (item: NavCommandItem) => (
		<CommandItem
			key={item.id ?? item.href}
			value={item.id ?? item.href}
			keywords={[item.label, item.section ?? "", ...(item.keywords ?? [])].filter(Boolean)}
			onSelect={() => handleSelect(item)}
			className="cursor-pointer"
		>
			{item.icon ? (
				<span className="flex h-4 w-4 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400">
					{item.icon}
				</span>
			) : null}
			<span className="min-w-0 truncate">{item.label}</span>
			{item.section ? (
				<span className="ml-auto shrink-0 truncate pl-3 text-xs text-neutral-400 dark:text-neutral-500">
					{item.section}
				</span>
			) : null}
		</CommandItem>
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Anchored near the TOP rather than vertically centred. A centred palette wastes the
			    lower half of the screen and forces a short results list; pinning it high lets the
			    list run far down the viewport. `top-*` and `translate-y-*` here beat DialogContent's
			    centring because cn() runs tailwind-merge, which resolves same-group conflicts.
			    The default close X is hidden - it would sit on top of the search field, and Esc
			    (advertised in the footer) already closes. */}
			<DialogContent className="top-[8dvh] w-[calc(100%-2rem)] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:rounded-2xl [&>button]:hidden">
				<DialogTitle className="sr-only">Search pages</DialogTitle>
				{/* shouldFilter=false: we do our own scoring + global sort so the best name match
				    (e.g. "Fees" for "fees") is always first, instead of cmdk's per-group ordering. */}
				<Command shouldFilter={false} className={COMMAND_CLASS}>
					<CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
					{/* Results in a styled ScrollArea (not the native cmdk scrollbar).
					    CommandList's own max-height/overflow are disabled so the
					    ScrollArea viewport is the single scroll container - cmdk's
					    keyboard scroll-into-view bubbles to it. */}
					<ScrollArea viewportClassName="max-h-[min(68dvh,520px)]">
						<CommandList className="max-h-none overflow-visible">
							{results
								? (results.length === 0
									? <CommandEmpty>{emptyMessage}</CommandEmpty>
									: <CommandGroup heading="Results">{results.map(renderItem)}</CommandGroup>)
								: groups.map(([section, groupItems], gi) => (
									<CommandGroup key={section || `group-${gi}`} heading={section || undefined}>
										{groupItems.map(renderItem)}
									</CommandGroup>
								))}
						</CommandList>
					</ScrollArea>
					<div className="flex items-center gap-4 border-t border-neutral-200 bg-neutral-50/80 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
						<Hint keys={["\u21B5"]}>to select</Hint>
						<Hint keys={["\u2193", "\u2191"]}>to navigate</Hint>
						<Hint keys={["esc"]}>to close</Hint>
					</div>
				</Command>
			</DialogContent>
		</Dialog>
	)
}
