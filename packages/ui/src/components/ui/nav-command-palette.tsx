"use client"

import * as React from "react"
import { Clock, SearchX, X } from "lucide-react"
import {
	Command,
	CommandInput,
	CommandList,
	CommandGroup,
	CommandItem,
} from "@repo/ui/components/ui/command"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/ui/dialog"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { Kbd, KbdGroup } from "@repo/ui/components/ui/kbd"
import { fuzzyScore } from "../../lib/fuzzy-search"
import { cn } from "../../lib/utils"
import { useRecentPicks, type RecentPick } from "../../hooks/use-recent-picks"

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
	/**
	 * A small uppercase tag after the label - "New", "Beta". From the nav item's own metadata only;
	 * never a marketing label. "new" reads amber, "beta" orange, anything else neutral.
	 */
	badge?: string
	/** Muted text after the label (a person's student id or employee id). */
	description?: string
	/** Right-aligned meta (a class, a job, a count). In search results the section stands in when unset. */
	meta?: string
	/** Right-aligned key hint, one entry per key (e.g. ["G", "H"]). Only for shortcuts that really exist. */
	shortcut?: string[]
}

/** A group of items the consumer found itself (e.g. people from a server search). */
export type NavCommandGroup = {
	heading: string
	items: NavCommandItem[]
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

/** Best score of `q` across `fields`, falling back to the synonym clusters at a reduced weight. */
function bestFieldScore(fields: string[], q: string): number {
	let best = 0
	for (const f of fields) best = Math.max(best, fuzzyScore(f, q))
	if (best === 0) {
		for (const term of expandSynonyms(q)) {
			for (const f of fields) {
				const s = fuzzyScore(f, term)
				if (s > 0) best = Math.max(best, s * SYN_WEIGHT)
			}
		}
	}
	return best
}

/** "/billing/setup/payments?tab=x" -> ["configure", "payments"]: a page is findable by its address too. */
function pathWords(href: string): string[] {
	return (href.split("?")[0] ?? "").split("/").filter((w) => w.length >= 3)
}

/**
 * Score an item for the flat, globally sorted results list (manual-pass R10-4, Niraj: "payments" found nothing).
 *
 * Ranking tiers, each well above the next: the label equal to the query, then the label containing it (prefix and word
 * starts score higher - that is the shared fuzzyScore's substring tier), then a section / keyword / address hit, then
 * subsequence and one-or-two-typo near misses, then synonyms. A query of several words also matches when EVERY word
 * lands somewhere on the item ("configure pay", "fee summary"), so spaces never stop a hit.
 */
export function scoreNavCommandItem(item: NavCommandItem, q: string): number {
	const query = q.toLowerCase().replace(/\s+/g, " ").trim()
	const label = item.label.toLowerCase()
	const others = [item.section ?? "", ...(item.keywords ?? []), ...pathWords(item.href)].filter(Boolean)
	if (label === query) return 10_000
	const whole = Math.max(fuzzyScore(label, query) * 3, bestFieldScore(others, query))
	const words = query.split(" ").filter(Boolean)
	if (words.length < 2) return whole
	let sum = 0
	for (const w of words) {
		const s = Math.max(fuzzyScore(label, w) * 3, bestFieldScore(others, w))
		if (s === 0) return whole
		sum += s
	}
	return Math.max(whole, sum / words.length)
}

// Command styling: group headings, the tall search field and roomy rows (reui.io site-search look).
const COMMAND_CLASS =
	"[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 " +
	// Tall, prominent search field with a larger magnifier - the field is the whole point of
	// the palette, so it gets the visual weight rather than sharing it with a title bar.
	"[&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]]:pr-12 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input-wrapper]_svg]:opacity-60 [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-base " +
	"[&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5"

/** Recent picks are keyed by the item's id, else its href - the same identity cmdk uses for the row. */
const itemKey = (item: NavCommandItem) => item.id ?? item.href

/** Badge tone by meaning: amber for New, orange for Beta, neutral for the rest. Never a green fill. */
function badgeTone(badge: string): string {
	const b = badge.toLowerCase()
	if (b === "new") return "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
	if (b === "beta") return "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300"
	return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
}

function NavBadge({ children }: { children: string }) {
	return (
		<span className={cn("inline-flex h-5 shrink-0 items-center rounded px-1.5 text-xs font-semibold uppercase leading-none tracking-wide", badgeTone(children))}>
			{children}
		</span>
	)
}

/** The square chip every row's icon sits in. */
function IconChip({ children }: { children: React.ReactNode }) {
	return (
		<span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 [&_svg]:size-4">
			{children}
		</span>
	)
}

/** One keyboard hint in the footer bar. */
function Hint({ keys, children }: { keys: string[]; children: React.ReactNode }) {
	return (
		<span className="flex items-center gap-1.5">
			<KbdGroup>
				{keys.map((k) => (
					<Kbd key={k} className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">{k}</Kbd>
				))}
			</KbdGroup>
			{children}
		</span>
	)
}

/** Placeholder rows while a server search is in flight, shaped like a person row. */
function SkeletonRows({ heading, count = 3 }: { heading: string; count?: number }) {
	return (
		<div className="px-2" aria-hidden>
			<div className="px-2 pb-1.5 pt-2 text-xs font-medium text-muted-foreground">{heading}</div>
			{Array.from({ length: count }, (_, i) => (
				<div key={i} className="flex items-center gap-2 px-2 py-1.5">
					<Skeleton className="size-7 shrink-0 rounded-md" />
					<Skeleton className="h-3.5 w-40 max-w-[50%]" />
					<Skeleton className="ml-auto h-3 w-16" />
				</div>
			))}
		</div>
	)
}

/** Group heading with a right-aligned count. */
function GroupHeading({ label, count }: { label: string; count?: number }) {
	return (
		<span className="flex items-center justify-between gap-2">
			<span className="truncate">{label}</span>
			{count !== undefined ? <span className="shrink-0 tabular-nums">{count}</span> : null}
		</span>
	)
}

/**
 * Shared Cmd+K command palette for sidebar search, laid out after reui.io's site search: a tall
 * input with a close X, a Recent section (removable, per app, in localStorage), Browse groups with
 * icon chips, badges, meta and key hints, and a footer of Kbd hints. Matching is our own fuzzy +
 * synonym scoring (cmdk's filter is off). Framework-agnostic: navigation is done by the consumer
 * via `onSelect`; Cmd/Ctrl+Enter (or Cmd/Ctrl+click) opens a destination in a new tab instead.
 *
 * `searchRemote` adds server results (people in main) under their own headings, debounced, with
 * skeleton rows while loading. It must be a stable function (useCallback) - a new one per render
 * would re-run the search on every render.
 */
export function NavCommandPalette({
	open,
	onOpenChange,
	items,
	onSelect,
	placeholder = "Search pages...",
	emptyMessage = "No match",
	recentKey,
	searchRemote,
	remoteHeadings = ["People"],
	remoteMinLength = 2,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	items: NavCommandItem[]
	onSelect: (item: NavCommandItem) => void
	placeholder?: string
	emptyMessage?: string
	/** localStorage key for this app's (and user's) recent picks; omit to turn Recent off. */
	recentKey?: string
	/** Server search for extra groups, called with the trimmed query once it is `remoteMinLength` long. */
	searchRemote?: (query: string) => Promise<NavCommandGroup[]>
	/** Headings for the skeleton shown while `searchRemote` runs. */
	remoteHeadings?: string[]
	remoteMinLength?: number
}) {
	const [query, setQuery] = React.useState("")
	const trimmed = query.trim()
	const recents = useRecentPicks(recentKey)
	const { refresh: refreshRecents } = recents

	// Reset the query each time the palette closes so it always starts fresh; re-read recents on
	// open in case another tab added one.
	React.useEffect(() => {
		if (!open) setQuery("")
		else refreshRecents()
	}, [open, refreshRecents])

	// "Cmd" on a Mac, "Ctrl" elsewhere. Read after mount so the server render matches.
	const [modKey, setModKey] = React.useState("⌘")
	React.useEffect(() => {
		try {
			if (!/mac|iphone|ipad/i.test(navigator.userAgent)) setModKey("Ctrl")
		} catch { /* keep the default */ }
	}, [])

	// ── Server search (debounced; only the latest answer is kept) ──
	const [remote, setRemote] = React.useState<NavCommandGroup[]>([])
	const [remoteLoading, setRemoteLoading] = React.useState(false)
	const seqRef = React.useRef(0)
	const remoteActive = !!searchRemote && open && trimmed.length >= remoteMinLength
	React.useEffect(() => {
		const seq = ++seqRef.current
		if (!searchRemote || !open || trimmed.length < remoteMinLength) {
			setRemote([])
			setRemoteLoading(false)
			return
		}
		setRemoteLoading(true)
		const timer = setTimeout(() => {
			searchRemote(trimmed)
				.then((groups) => {
					if (seq !== seqRef.current) return
					setRemote(groups)
					setRemoteLoading(false)
				})
				.catch(() => {
					if (seq !== seqRef.current) return
					setRemote([])
					setRemoteLoading(false)
				})
		}, 220)
		return () => clearTimeout(timer)
	}, [searchRemote, open, trimmed, remoteMinLength])

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
			.map((it) => ({ it, s: scoreNavCommandItem(it, trimmed) }))
			.filter((x) => x.s > 0)
			.sort((a, b) => b.s - a.s)
			.map((x) => x.it)
	}, [items, trimmed])

	// Recent picks that still resolve: a page must still be in `items` (a lost permission drops it,
	// and the current label wins over the stored one); a person is shown from its stored copy.
	const recentItems = React.useMemo(() => {
		const byKey = new Map(items.map((it) => [itemKey(it), it]))
		const out: NavCommandItem[] = []
		for (const p of recents.picks) {
			if (p.remote) {
				out.push({ id: p.key, label: p.label, href: p.href, section: p.section, meta: p.meta })
				continue
			}
			const live = byKey.get(p.key)
			if (live) out.push(live)
		}
		return out
	}, [items, recents.picks])

	// Cmd/Ctrl held on the Enter or click that picked the row = open in a new tab. cmdk fires the
	// item's onSelect synchronously from the root's keydown / the item's click, so these refs are
	// set just before it reads them.
	const newTabRef = React.useRef(false)
	const remoteKeys = React.useMemo(() => new Set(remote.flatMap((g) => g.items.map(itemKey))), [remote])

	const handleSelect = (item: NavCommandItem) => {
		const newTab = newTabRef.current
		newTabRef.current = false
		const key = itemKey(item)
		const isRemote = remoteKeys.has(key) || recents.picks.some((p) => p.key === key && p.remote)
		const pick: RecentPick = { key, label: item.label, href: item.href, section: item.section, meta: item.meta, remote: isRemote || undefined }
		recents.add(pick)
		onOpenChange(false)
		if (newTab && item.href) {
			window.open(item.href, "_blank", "noopener,noreferrer")
			return
		}
		onSelect(item)
	}

	const renderRow = (item: NavCommandItem, opts: { value: string; icon: React.ReactNode; meta?: string; trailing?: React.ReactNode }) => (
		<CommandItem
			key={opts.value}
			value={opts.value}
			keywords={[item.label, item.section ?? "", ...(item.keywords ?? [])].filter(Boolean)}
			onSelect={() => handleSelect(item)}
			className="group cursor-pointer gap-2.5"
		>
			<IconChip>{opts.icon}</IconChip>
			<span className="flex min-w-0 flex-1 items-center gap-2">
				<span className="min-w-0 truncate">{item.label}</span>
				{item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
				{item.description ? <span className="min-w-0 shrink truncate text-xs text-muted-foreground">{item.description}</span> : null}
			</span>
			{opts.meta ? <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground tabular-nums">{opts.meta}</span> : null}
			{item.shortcut?.length ? (
				<KbdGroup className="shrink-0">{item.shortcut.map((k) => <Kbd key={k}>{k}</Kbd>)}</KbdGroup>
			) : null}
			{opts.trailing}
			{/* The highlighted row says what Enter does. */}
			<Kbd className="hidden shrink-0 group-data-[selected=true]:inline-flex">{"↵"}</Kbd>
		</CommandItem>
	)

	const renderItem = (item: NavCommandItem, inSearch: boolean) =>
		renderRow(item, {
			value: itemKey(item),
			icon: item.icon ?? <Clock />,
			meta: item.meta ?? (inSearch ? item.section : undefined),
		})

	const renderRecent = (item: NavCommandItem) => {
		const key = itemKey(item)
		return renderRow(item, {
			// Its own value, so a recent row and the same page under Browse are two rows to cmdk.
			value: `recent:${key}`,
			icon: <Clock />,
			meta: item.meta ?? item.section,
			trailing: (
				<button
					type="button"
					onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation() }}
					aria-label={`Remove ${item.label} from recent`}
					// The row selects on click; removing must not also open it.
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); recents.remove(key) }}
					className="flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200 [&_svg]:size-3.5"
				>
					<X />
				</button>
			),
		})
	}

	const remoteHits = remote.some((g) => g.items.length > 0)
	const nothingFound = !!results && results.length === 0 && !remoteHits && !(remoteActive && remoteLoading)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Anchored near the TOP rather than vertically centred, so the list can run far down the
			    viewport. `top-*` and `translate-y-*` beat DialogContent's centring via tailwind-merge.
			    The dialog's own close X is hidden; the palette draws its own beside the field. */}
			<DialogContent className="top-[8dvh] w-[calc(100%-2rem)] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:rounded-2xl [&>button]:hidden">
				<DialogTitle className="sr-only">Search</DialogTitle>
				{/* shouldFilter=false: we do our own scoring + global sort so the best name match
				    (e.g. "Fees" for "fees") is always first, instead of cmdk's per-group ordering. */}
				<Command
					shouldFilter={false}
					className={COMMAND_CLASS}
					onKeyDown={(e) => { if (e.key === "Enter") newTabRef.current = e.metaKey || e.ctrlKey }}
					onClickCapture={(e) => { newTabRef.current = e.metaKey || e.ctrlKey }}
				>
					<div className="relative">
						<CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
						<button
							type="button"
							aria-label="Close search"
							// Enter here must press the button, not open the highlighted row (cmdk listens on the root).
							onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation() }}
							onClick={() => onOpenChange(false)}
							className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
						>
							<X className="size-4" />
						</button>
					</div>
					{/* Results in a styled ScrollArea (not the native cmdk scrollbar). CommandList's own
					    max-height/overflow are disabled so the ScrollArea viewport is the single scroll
					    container - cmdk's keyboard scroll-into-view bubbles to it. */}
					<ScrollArea viewportClassName="max-h-[min(64dvh,500px)]">
						<CommandList className="max-h-none overflow-visible py-1">
							{results ? (
								<>
									{results.length > 0 ? (
										<CommandGroup heading={<GroupHeading label="Pages" count={results.length} />}>
											{results.map((it) => renderItem(it, true))}
										</CommandGroup>
									) : null}
									{remoteActive && remoteLoading
										? remoteHeadings.map((h) => <SkeletonRows key={h} heading={h} />)
										: remote.filter((g) => g.items.length > 0).map((g) => (
											<CommandGroup key={g.heading} heading={<GroupHeading label={g.heading} count={g.items.length} />}>
												{g.items.map((it) => renderItem(it, true))}
											</CommandGroup>
										))}
									{nothingFound ? (
										<div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
											<SearchX className="size-5 text-neutral-400" />
											<p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{emptyMessage}</p>
											<p className="max-w-xs truncate text-xs text-muted-foreground">Nothing matches &quot;{trimmed}&quot;.</p>
										</div>
									) : null}
								</>
							) : (
								<>
									{recentItems.length > 0 ? (
										<CommandGroup heading={<GroupHeading label="Recent" />}>
											{recentItems.map(renderRecent)}
										</CommandGroup>
									) : null}
									{groups.map(([section, groupItems], gi) => (
										<CommandGroup
											key={section || `group-${gi}`}
											heading={<GroupHeading label={section || "Browse"} count={groupItems.length} />}
										>
											{groupItems.map((it) => renderItem(it, false))}
										</CommandGroup>
									))}
								</>
							)}
						</CommandList>
					</ScrollArea>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-neutral-200 bg-neutral-50/80 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
						<Hint keys={["↵"]}>Open</Hint>
						<span className="hidden sm:contents"><Hint keys={[modKey, "↵"]}>New tab</Hint></span>
						<Hint keys={["↑", "↓"]}>Navigate</Hint>
						<Hint keys={["esc"]}>Close</Hint>
					</div>
				</Command>
			</DialogContent>
		</Dialog>
	)
}
