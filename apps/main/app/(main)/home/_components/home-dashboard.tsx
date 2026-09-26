/**
 * Home, action-first (plan/home HOME-1, HOME-2).
 *
 * Niraj, 2026-09-25: "what should I do next" leads, "how am I doing" follows. The
 * page is a greeting with two quick actions, the headline StatBand, a "Pick up where
 * you left off" card, four compact module cards in a 2x2 grid, then the activity
 * calendar (rendered by the page).
 *
 * No framer `initial={{ opacity: 0 }}` anywhere. That inline style is in the server
 * HTML, so the content that replaced the skeleton stayed invisible until hydration
 * and the animation had run - about a second of blank screen (HOME-1). Entrance
 * motion is Tailwind's CSS `animate-in`, which plays on first paint without JS and
 * is off under reduced motion. It is also why this file is a server component now:
 * nothing here needs the client, and the module rows' Recharts line charts (the
 * heaviest thing on the page) are replaced by inline SVG sparklines.
 */

import Link from "next/link"
import {
	Activity, ArrowRight, CalendarDays, ClipboardPaste, Flame, FolderKanban, GraduationCap, Mic, Plus,
	Sparkles, Target, Zap,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"

// ─── Types (mirror of the getHomeData payload the page passes down) ──────────

export interface TrendPoint { month: string; [key: string]: string | number }

export interface DashboardStats {
	projects: { total: number; active: number; completed: number }
	goals: { total: number; active: number; completed: number; avgProgress: number }
	studios: number
	mockSessions: number
	totalXpEarned: number
	activeDays: number
}

export interface PickUpItem {
	kind: "project" | "goal" | "studio"
	title: string
	detail: string
	href: string
	/** 0-100 when the item has a measurable progress. */
	progress?: number
}

export interface HomeDashboardProps {
	user: {
		name: string | null
		credits: number
		currentXp: number
		totalXp: number
		currentLevel: number
		currentStreak: number
		longestStreak: number
	} | null
	stats: DashboardStats
	trends: {
		activity: TrendPoint[]
		projects: TrendPoint[]
		mocks: TrendPoint[]
		goals: TrendPoint[]
	}
	pickUp: PickUpItem[]
}

function todayLabel() {
	return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

/**
 * CSS entrance: plays on first paint, no JS, off under reduced motion. The delay is
 * an inline style because Tailwind cannot see a class name built at runtime.
 */
const ENTER = "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 [animation-fill-mode:both] motion-reduce:animate-none"
const delay = (ms: number) => ({ animationDelay: `${ms}ms` })

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function HomeDashboard({ user, stats, trends, pickUp }: HomeDashboardProps) {
	const first = user?.name?.split(" ")[0]
	return (
		<div className="mx-auto w-full space-y-6 px-page pt-6 pb-6">
			{/* ── Header ── */}
			<header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", ENTER)}>
				<div>
					<p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{todayLabel()}</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
						{first ? `Welcome back, ${first}` : "Home"}
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button asChild variant="outline" size="sm"><Link href="/practice"><Zap className="mr-1.5 size-3.5" /> Practice</Link></Button>
					<Button asChild variant="outline" size="sm"><Link href="/jobs/import"><ClipboardPaste className="mr-1.5 size-3.5" /> Practise a job</Link></Button>
					<Button asChild size="sm"><Link href="/projects"><Plus className="mr-1.5 size-3.5" /> New project</Link></Button>
				</div>
			</header>

			{/* ── Headline counters ── */}
			<div className={ENTER} style={delay(40)}>
				<StatBand
					cols={4}
					items={[
						{ label: "Current streak", value: `${user?.currentStreak ?? 0}d`, icon: Flame },
						{ label: "Total XP", value: (user?.totalXp || user?.currentXp || 0).toLocaleString(), icon: Zap },
						{ label: "Level", value: user?.currentLevel ?? 1, icon: Sparkles },
						{ label: "Credits", value: (user?.credits ?? 0).toLocaleString(), icon: Activity },
					]}
				/>
			</div>

			{/* ── Pick up where you left off ── */}
			<div className={ENTER} style={delay(80)}>
				<PickUp items={pickUp} streak={user?.currentStreak ?? 0} />
			</div>

			{/* ── Modules, 2x2 ── */}
			<div className="grid gap-4 md:grid-cols-2">
				<ModuleCard
					delayMs={120}
					title="Momentum" icon={Zap} href="/practice" cta="Keep going"
					value={stats.totalXpEarned.toLocaleString()} unit="XP this year"
					detail={`${stats.activeDays} active days · longest streak ${user?.longestStreak ?? 0}d`}
					series={trends.activity.map((p) => Number(p.xp ?? 0))}
					months={trends.activity.map((p) => String(p.month))}
				/>
				<ModuleCard
					delayMs={160}
					title="Projects" icon={FolderKanban} href="/projects" cta="All projects"
					value={String(stats.projects.active)} unit="in progress"
					detail={`${stats.projects.total} total · ${stats.projects.completed} completed`}
					series={trends.projects.map((p) => Number(p.started ?? 0))}
					months={trends.projects.map((p) => String(p.month))}
				/>
				<ModuleCard
					delayMs={200}
					title="Career goals" icon={Target} href="/pathfinder" cta="Pathfinder"
					value={String(stats.goals.active)} unit={stats.goals.active === 1 ? "active goal" : "active goals"}
					detail={`${stats.goals.total} total · ${stats.goals.avgProgress}% average progress`}
					series={trends.goals.map((p) => Number(p.goals ?? 0))}
					months={trends.goals.map((p) => String(p.month))}
				/>
				<ModuleCard
					delayMs={240}
					title="Interview practice" icon={Mic} href="/mock" cta="Mock interviews"
					value={String(stats.mockSessions)} unit={stats.mockSessions === 1 ? "mock session" : "mock sessions"}
					detail={`${stats.studios} study ${stats.studios === 1 ? "space" : "spaces"}`}
					series={trends.mocks.map((p) => Number(p.sessions ?? 0))}
					months={trends.mocks.map((p) => String(p.month))}
				/>
			</div>
		</div>
	)
}

// ─── Pick up where you left off ─────────────────────────────────────────────

const KIND_ICON = { project: FolderKanban, goal: Target, studio: GraduationCap } as const
const KIND_LABEL = { project: "Project", goal: "Career goal", studio: "Study space" } as const

function PickUp({ items, streak }: { items: PickUpItem[]; streak: number }) {
	if (items.length === 0) {
		// Honest when empty: a new account has nothing to resume, so offer the start.
		return (
			<section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-950">
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Start here</p>
					<p className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">Build your first project</p>
					<p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Pick one from the catalogue or describe your own. It becomes a sprint board you work through.</p>
				</div>
				<Button asChild><Link href="/projects">Browse projects <ArrowRight className="ml-1.5 size-3.5" /></Link></Button>
			</section>
		)
	}
	const [lead, ...rest] = items
	const LeadIcon = KIND_ICON[lead!.kind]
	return (
		<section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
			<div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
				<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
					<LeadIcon className="size-5" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
						Pick up where you left off{streak === 0 ? " · keep a streak going today" : ""}
					</p>
					<p className="mt-1 truncate text-base font-semibold text-neutral-900 dark:text-white">{lead!.title}</p>
					<p className="mt-0.5 truncate text-sm text-neutral-600 dark:text-neutral-400">{KIND_LABEL[lead!.kind]} · {lead!.detail}</p>
					{lead!.progress !== undefined && (
						<div className="mt-2.5 h-1 max-w-sm overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
							<div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${Math.max(2, Math.min(100, lead!.progress))}%` }} />
						</div>
					)}
				</div>
				<Button asChild className="shrink-0"><Link href={lead!.href}>Continue <ArrowRight className="ml-1.5 size-3.5" /></Link></Button>
			</div>
			{rest.length > 0 && (
				<ul className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
					{rest.map((it) => {
						const Icon = KIND_ICON[it.kind]
						return (
							<li key={it.href}>
								<Link href={it.href} className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
									<Icon className="size-3.5 shrink-0 text-neutral-400" />
									<span className="min-w-0 flex-1 truncate text-[13px] text-neutral-800 dark:text-neutral-200">{it.title}</span>
									<span className="hidden shrink-0 text-xs text-neutral-500 sm:inline dark:text-neutral-400">{it.detail}</span>
									<ArrowRight className="size-3.5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
								</Link>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}

// ─── Module card ─────────────────────────────────────────────────────────────

function ModuleCard({ title, icon: Icon, href, cta, value, unit, detail, series, months, delayMs }: {
	title: string
	icon: React.ComponentType<{ className?: string }>
	href: string
	cta: string
	value: string
	unit: string
	detail: string
	series: number[]
	months: string[]
	delayMs: number
}) {
	return (
		<Link
			href={href}
			className={cn(
				"group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600",
				ENTER,
			)}
			style={delay(delayMs)}
		>
			<div className="flex items-center gap-2">
				<Icon className="size-4 text-neutral-500 dark:text-neutral-400" />
				<h2 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{title}</h2>
				<span className="ml-auto inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white">
					{cta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
				</span>
			</div>
			<div className="mt-4 flex items-end justify-between gap-4">
				<div className="min-w-0">
					<p className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white">{value}</p>
					<p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{unit}</p>
				</div>
				<Sparkline values={series} label={`${title}, last ${series.length} months`} />
			</div>
			<p className="mt-3 flex items-center gap-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-900 dark:text-neutral-400">
				<CalendarDays className="size-3 shrink-0" />
				<span className="truncate">{detail}</span>
				{months.length > 1 && <span className="ml-auto shrink-0 tabular-nums">{months[0]} - {months[months.length - 1]}</span>}
			</p>
		</Link>
	)
}

/**
 * A six-month trend as an inline SVG: no chart library, renders on the server.
 * All-zero data draws a flat baseline, not an empty box or an error (overview 3).
 */
function Sparkline({ values, label }: { values: number[]; label: string }) {
	const w = 120
	const h = 40
	const pad = 3
	const max = Math.max(...values, 0)
	const pts = values.length > 1 ? values : [0, 0]
	const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1)
	const y = (v: number) => (max === 0 ? h - pad : h - pad - (v / max) * (h - pad * 2))
	const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
	const area = `${line} L${x(pts.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`
	return (
		<svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-28 shrink-0 text-neutral-900 dark:text-white" role="img" aria-label={label}>
			<path d={area} className="fill-current opacity-[0.06]" />
			<path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={max === 0 ? "opacity-30" : undefined} />
			<circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1]!)} r={2.5} className="fill-current" />
		</svg>
	)
}
