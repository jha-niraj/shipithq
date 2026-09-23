"use client"

// From gurukulhq (2026-09-22), gray mapped to neutral for ShipItHQ's palette.

import * as React from "react"
import { Bell, CheckCheck, Loader2, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Sheet, SheetContent } from "@repo/ui/components/ui/sheet"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Button } from "@repo/ui/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/ui/select"

export type NotificationView = {
	id: string
	title: string
	body: string
	createdAt: Date | string
	readAt: Date | string | null
	/** Module / category label used for the filter dropdown (e.g. "Exams"). */
	module: string
	icon?: React.ReactNode
	href?: string | null
}

type SortKey = "recent" | "oldest"
const ALL_MODULES = "__all__"

// ── Tiny relative-time formatter (no date-fns dep in @repo/ui) ──────────────────
function timeAgo(input: Date | string): string {
	const d = typeof input === "string" ? new Date(input) : input
	const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
	if (s < 45) return "just now"
	const m = Math.floor(s / 60)
	if (m < 60) return `${m}m ago`
	const h = Math.floor(m / 60)
	if (h < 24) return `${h}h ago`
	const days = Math.floor(h / 24)
	if (days < 7) return `${days}d ago`
	const w = Math.floor(days / 7)
	if (w < 5) return `${w}w ago`
	const mo = Math.floor(days / 30)
	if (mo < 12) return `${mo}mo ago`
	return `${Math.floor(days / 365)}y ago`
}

function toTime(v: Date | string): number {
	return (typeof v === "string" ? new Date(v) : v).getTime()
}

// ── Unique animated empty state: a "sonar" that listens for activity ────────────
function EmptyState({ title, body }: { title: string; body: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-5 px-6 py-14 text-center">
			<div className="relative h-28 w-28">
				<span className="gk-notif-ring" style={{ animationDelay: "0s" }} />
				<span className="gk-notif-ring" style={{ animationDelay: "0.8s" }} />
				<span className="gk-notif-ring" style={{ animationDelay: "1.6s" }} />
				<div className="gk-notif-bob absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
					<Bell className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
					<span className="gk-notif-spark absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
				</div>
			</div>
			<div className="space-y-1">
				<p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
				<p className="mx-auto max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
			</div>
			<style>{`
				.gk-notif-ring {
					position: absolute; inset: 0; margin: auto; height: 100%; width: 100%;
					border-radius: 9999px; border: 1px solid rgba(163,163,163,0.55);
					animation: gk-notif-pulse 2.4s ease-out infinite;
				}
				:is(.dark) .gk-notif-ring { border-color: rgba(82,82,82,0.7); }
				@keyframes gk-notif-pulse {
					0%   { transform: scale(0.38); opacity: 0.7; }
					80%  { opacity: 0; }
					100% { transform: scale(1); opacity: 0; }
				}
				.gk-notif-bob { animation: gk-notif-bob 3s ease-in-out infinite; }
				@keyframes gk-notif-bob {
					0%, 100% { transform: translateY(0); }
					50%      { transform: translateY(-5px); }
				}
				.gk-notif-spark { animation: gk-notif-spark 2s ease-in-out infinite; }
				@keyframes gk-notif-spark {
					0%, 100% { transform: scale(0.6); opacity: 0.35; }
					50%      { transform: scale(1);   opacity: 1; }
				}
				@media (prefers-reduced-motion: reduce) {
					.gk-notif-ring, .gk-notif-bob, .gk-notif-spark { animation: none; }
				}
			`}</style>
		</div>
	)
}

function NotificationRow({ n, onClick }: { n: NotificationView; onClick?: (n: NotificationView) => void }) {
	const isUnread = !n.readAt
	return (
		<button
			type="button"
			onClick={onClick ? () => onClick(n) : undefined}
			className={cn(
				"w-full rounded-xl border p-3.5 text-left text-sm transition-all hover:shadow-sm cursor-pointer",
				isUnread
					? "border-neutral-200 bg-neutral-50 dark:border-neutral-700/70 dark:bg-neutral-900"
					: "border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60",
			)}
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 shrink-0">{n.icon ?? <Bell className="h-4 w-4 text-neutral-400" />}</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-2">
						<span className={cn("leading-snug text-neutral-900 dark:text-white", isUnread ? "font-semibold" : "font-medium")}>
							{n.title}
						</span>
						{isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
					</div>
					<p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{n.body}</p>
					<div className="mt-1.5 flex items-center justify-between gap-2">
						<span className="text-xs text-neutral-500 dark:text-neutral-400">{timeAgo(n.createdAt)}</span>
						<span className="flex items-center gap-2">
							<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">{n.module}</span>
							{n.href ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">View</span> : null}
						</span>
					</div>
				</div>
			</div>
		</button>
	)
}

/**
 * Shared notifications side-panel (Twilio-style): Unread/Read tabs, a module
 * filter, a sort control, and a unique animated empty state. Presentational -
 * the host app supplies the notifications + click / mark-all handlers.
 */
export function NotificationsPanel({
	open,
	onOpenChange,
	notifications,
	loading = false,
	onItemClick,
	onMarkAllRead,
	title = "Notifications",
	subtitle = "Recent activity and alerts.",
	emptyBody = "You'll see notifications here when there's activity.",
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	notifications: NotificationView[]
	loading?: boolean
	onItemClick?: (n: NotificationView) => void
	/**
	 * May return a promise. When it does, the button awaits it and shows a spinner - so a consumer
	 * gets the pending state for free rather than each one having to thread its own `saving` flag
	 * down (and, as here, forgetting to).
	 */
	onMarkAllRead?: () => void | Promise<void>
	title?: string
	subtitle?: string
	emptyBody?: string
}) {
	const [tab, setTab] = React.useState<"unread" | "read">("unread")
	const [moduleFilter, setModuleFilter] = React.useState<string>(ALL_MODULES)
	const [sort, setSort] = React.useState<SortKey>("recent")
	const [markingAll, setMarkingAll] = React.useState(false)

	/** Awaits the handler when it returns a promise, so the button can show progress and lock. */
	const handleMarkAllRead = React.useCallback(async () => {
		if (markingAll || !onMarkAllRead) return
		try {
			setMarkingAll(true)
			await onMarkAllRead()
		} finally {
			setMarkingAll(false)
		}
	}, [markingAll, onMarkAllRead])

	const modules = React.useMemo(
		() => Array.from(new Set(notifications.map((n) => n.module))).sort(),
		[notifications],
	)
	const unreadCount = React.useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications])

	const visible = React.useMemo(() => {
		return notifications
			.filter((n) => (tab === "unread" ? !n.readAt : !!n.readAt))
			.filter((n) => (moduleFilter === ALL_MODULES ? true : n.module === moduleFilter))
			.sort((a, b) => sort === "recent" ? toTime(b.createdAt) - toTime(a.createdAt) : toTime(a.createdAt) - toTime(b.createdAt))
	}, [notifications, tab, moduleFilter, sort])

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl [&>button]:hidden"
			>
				{/* Header */}
				<div className="shrink-0 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
							<p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
						</div>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							aria-label="Close"
							className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
						>
							<ChevronDown className="h-4 w-4 rotate-[-90deg]" />
						</button>
					</div>

					{/* Tabs (left) + filters (right) */}
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800/70">
							{(["unread", "read"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setTab(t)}
									className={cn(
										"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
										tab === t
											? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white"
											: "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
									)}
								>
									{t === "unread" ? "Unread" : "Read"}
									{t === "unread" && unreadCount > 0 && (
										<span className="rounded-full bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
											{unreadCount > 99 ? "99+" : unreadCount}
										</span>
									)}
								</button>
							))}
						</div>

						<div className="flex items-center gap-2">
							<Select value={moduleFilter} onValueChange={setModuleFilter}>
								<SelectTrigger className="h-8 w-auto min-w-[7.5rem] gap-1.5 text-xs">
									<SelectValue placeholder="All modules" />
								</SelectTrigger>
								<SelectContent emptyMessage="No modules">
									<SelectItem value={ALL_MODULES}>All modules</SelectItem>
									{modules.map((m) => (
										<SelectItem key={m} value={m}>{m}</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
								<SelectTrigger className="h-8 w-auto min-w-[7.5rem] gap-1.5 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="recent">Most recent</SelectItem>
									<SelectItem value="oldest">Oldest first</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Mark all read */}
				{tab === "unread" && unreadCount > 0 && onMarkAllRead && (
					<div className="flex shrink-0 justify-end border-b border-neutral-100 px-5 py-2 dark:border-neutral-800/60">
						<Button
							type="button" variant="ghost" size="sm"
							className="h-7 gap-1.5 text-xs"
							// Disabled while in flight: this used to fire on every click with no
							// feedback, so on a slow connection the obvious response was to click it
							// again - and each click is another round trip marking the same rows.
							disabled={markingAll}
							onClick={handleMarkAllRead}
						>
							{markingAll
								? <Loader2 className="h-3.5 w-3.5 animate-spin" />
								: <CheckCheck className="h-3.5 w-3.5" />}
							{markingAll ? "Marking..." : "Mark all read"}
						</Button>
					</div>
				)}

				{/* List */}
				<ScrollArea className="min-h-0 flex-1">
					<div className="px-5 py-4">
						{loading ? (
							<div className="flex justify-center py-16">
								<Loader2 className="h-7 w-7 animate-spin text-neutral-400" />
							</div>
						) : visible.length === 0 ? (
							<EmptyState
								title={tab === "unread" ? "No unread notifications" : "No read notifications"}
								body={tab === "unread" ? emptyBody : "Notifications you've read will appear here."}
							/>
						) : (
							<ul className="space-y-2">
								{visible.map((n) => (
									<li key={n.id}>
										<NotificationRow n={n} onClick={onItemClick} />
									</li>
								))}
							</ul>
						)}
					</div>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	)
}
