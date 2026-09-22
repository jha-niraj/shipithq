"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
	LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	BarChart, Bar, Cell,
} from "recharts"
import {
	FolderKanban, Target, Mic, Sparkles, Flame, Zap, ArrowRight, Activity,
	AlertTriangle, Clock, Plus, TrendingUp, GraduationCap,
} from "lucide-react"
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

export interface DashboardActivity {
	id: string
	type: string
	title: string
	description: string | null
	xpEarned: number
	createdAt: Date | string
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
	activityMix: Array<{ type: string; count: number; xp: number }>
	recentActivity: DashboardActivity[]
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function todayLabel() {
	return new Date().toLocaleDateString("en-US", {
		weekday: "long", month: "long", day: "numeric", year: "numeric",
	})
}

function formatDate(d: Date | string) {
	return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function titleCase(s: string) {
	return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

// Chart colours are literal hex, not Tailwind classes: Recharts writes them into
// SVG `stroke`/`fill` attributes, where a class name means nothing.
//
// MONOCHROME, and series are told apart by DASH rather than by hue - matching the
// credits chart. Emerald used to mark the "completed" line, which broke the
// palette rule in CLAUDE.md and, worse, carried no meaning a reader could act on:
// two lines in two colours say "these differ", where solid-versus-dashed says
// which is which even in greyscale or to a reader who cannot separate hues.
//
// The values themselves come from CSS variables on the wrapper so they can flip
// for dark mode; recharts cannot read `currentColor`.
const INK = "var(--home-ink)"
const ACCENT = "var(--home-ink)"
const OK = "var(--home-muted)"

// Categorical ramp for the activity-mix bars. Ordered by LUMINANCE, not hue, so
// the categories stay distinguishable in a monochrome brand - and readable for
// anyone who cannot separate hues. The two non-neutrals are the semantic pair
// (green = positive, red = attention) that still carry meaning elsewhere.
const MIX_COLORS = ["#171717", "#404040", "#525252", "#737373", "#8a8a8a", "#a3a3a3", "#bdbdbd", "#d4d4d4"]

type Tone = "default" | "ok" | "warn" | "bad"
const toneCls = (t?: Tone) =>
	// "ok" no longer means green. A completed count is not a status the reader has
	// to act on, and colouring it made every zero on this page read as a failure.
	t === "ok" ? "text-neutral-900 dark:text-white"
		: t === "warn" ? "text-neutral-800 dark:text-neutral-100"
			: t === "bad" ? "text-red-600 dark:text-red-400"
				: "text-neutral-900 dark:text-white"

interface StatItem { label: string; value: string | number; tone?: Tone }

function StatColumn({ stats }: { stats: StatItem[] }) {
	return (
		<div className="grid h-full grid-cols-2 gap-2.5 lg:grid-cols-1">
			{stats.map((s) => (
				<div
					key={s.label}
					className="flex flex-col justify-center rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/30 px-3.5 py-2.5"
				>
					<p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{s.label}</p>
					<p className={cn("mt-0.5 text-xl font-bold tabular-nums", toneCls(s.tone))}>{s.value}</p>
				</div>
			))}
		</div>
	)
}

interface TrendLine { key: string; name: string; color: string }

/** Reusable trend line chart - solid lines only, readable in light + dark. */
function TrendChart({ data, lines, height = "h-60", fill }: {
	data: TrendPoint[]
	lines: TrendLine[]
	height?: string
	fill?: boolean
}) {
	return (
		// The two inks live here as CSS variables so they can flip for dark mode.
		// recharts writes `stroke` as a real SVG attribute and cannot read
		// `currentColor`, which is why this cannot simply be a Tailwind class.
		<div className={cn(
			"[--home-ink:#171717] [--home-muted:#737373] [--home-grid:#e5e5e5]",
			"dark:[--home-ink:#f5f5f5] dark:[--home-muted:#a3a3a3] dark:[--home-grid:#262626]",
			fill ? "h-full min-h-[220px]" : height,
		)}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
					<CartesianGrid stroke="var(--home-grid)" strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="month"
						tick={{ fontSize: 12, fill: "var(--home-muted)" }}
						axisLine={false}
						tickLine={false}
						minTickGap={24}
					/>
					<YAxis
						allowDecimals={false}
						width={40}
						tick={{ fontSize: 12, fill: "var(--home-muted)" }}
						axisLine={false}
						tickLine={false}
					/>
					<Tooltip
						cursor={{ stroke: "var(--home-muted)", strokeDasharray: "3 3" }}
						contentStyle={{
							background: "var(--popover)",
							border: "1px solid var(--border)",
							borderRadius: 10,
							fontSize: 12,
							color: "var(--popover-foreground)",
						}}
						labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600, marginBottom: 4 }}
					/>
					{lines.map((l, i) => (
						<Line
							key={l.key}
							type="monotone"
							dataKey={l.key}
							name={l.name}
							stroke={l.color}
							strokeWidth={2}
							// The SECOND series is dashed. That is what tells the two
							// apart now that both are the same ink - and it survives
							// greyscale, colour blindness and a printed page, which a
							// hue never did.
							strokeDasharray={i === 0 ? undefined : "4 3"}
							dot={false}
							activeDot={{ r: 4 }}
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
			{/* Legend is hand-rolled so it matches the rest of the type scale. */}
			<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
				{lines.map((l, i) => (
					<span key={l.key} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
						{/* The swatch has to be DASHED when its line is, or the legend
							stops identifying anything: two identical marks beside two
							different names is worse than no legend. */}
						<span
							className="h-0.5 w-4 rounded-full"
							style={
								i === 0
									? { backgroundColor: l.color }
									: { backgroundImage: `repeating-linear-gradient(90deg, ${l.color} 0 4px, transparent 4px 7px)` }
							}
						/>
						{l.name}
					</span>
				))}
			</div>
		</div>
	)
}

/** One module row: complementary STATS (1/3) beside a trend CHART (2/3).
 *  `reverse` puts the chart on the left, alternating down the page. */
function ModuleRow({ title, icon: Icon, href, hrefLabel, stats, lines, data, reverse, delay }: {
	title: string
	icon: React.ComponentType<{ className?: string }>
	href: string
	hrefLabel?: string
	stats: StatItem[]
	lines: TrendLine[]
	data: TrendPoint[]
	reverse?: boolean
	delay?: number
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: delay ?? 0.2 }}
			className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6"
		>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900/10">
						<Icon className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
					</div>
					<h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
				</div>
				<Link
					href={href}
					className="cursor-pointer flex items-center gap-0.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
				>
					{hrefLabel ?? "Open"} <ArrowRight className="h-3 w-3" />
				</Link>
			</div>
			<div className={cn("flex flex-col gap-5 lg:flex-row lg:items-stretch", reverse && "lg:flex-row-reverse")}>
				<div className="lg:w-1/3 lg:min-w-0"><StatColumn stats={stats} /></div>
				<div className="lg:w-2/3 lg:min-w-0"><TrendChart data={data} lines={lines} fill /></div>
			</div>
		</motion.div>
	)
}

function SectionHeader({ title, href, label = "Open" }: { title: string; href: string; label?: string }) {
	return (
		<div className="mb-5 flex items-center justify-between">
			<h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h2>
			<Link
				href={href}
				className="flex cursor-pointer items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
			>
				{label} <ArrowRight className="h-3 w-3" />
			</Link>
		</div>
	)
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function HomeDashboard({
	user, stats, trends, activityMix, recentActivity,
}: HomeDashboardProps) {
	const completionRate = stats.projects.total > 0
		? Math.round((stats.projects.completed / stats.projects.total) * 100)
		: 0

	const headerStats = [
		{ label: `${stats.projects.total} Projects`, href: "/projects", icon: FolderKanban },
		{ label: `${stats.goals.total} Goals`, href: "/pathfinder", icon: Target },
		{ label: `${stats.mockSessions} Mocks`, href: "/mock", icon: Mic },
		{ label: `${stats.studios} Studios`, href: "/practice", icon: GraduationCap },
	]

	// Nudges, not errors: each one is a concrete next action, and the strip hides
	// entirely when there's nothing worth interrupting for.
	const alerts: Array<{ label: string; href: string }> = []
	if (stats.projects.active === 0 && stats.projects.total > 0) {
		alerts.push({ label: "No project in progress - pick your next build", href: "/projects" })
	}
	if (stats.projects.total === 0) {
		alerts.push({ label: "Start your first project", href: "/projects" })
	}
	if (stats.goals.active === 0) {
		alerts.push({ label: "Set a career goal in Pathfinder", href: "/pathfinder" })
	}
	if ((user?.currentStreak ?? 0) === 0) {
		alerts.push({ label: "Your streak is at zero - do one thing today", href: "/practice" })
	}

	const mixChartData = activityMix.slice(0, 8).map((m, i) => ({
		name: titleCase(m.type).slice(0, 12),
		count: m.count,
		color: MIX_COLORS[i % MIX_COLORS.length]!,
	}))

	return (
		<div className="mx-auto w-full space-y-7 px-page pt-6 pb-10">
			{/* ── Header ── */}
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
			>
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
						{user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Home"}
					</h1>
					<p className="mt-0.5 font-mono text-sm text-neutral-500 dark:text-neutral-400">{todayLabel()}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{headerStats.map((s) => (
						<Link
							key={s.href}
							href={s.href}
							className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
						>
							<s.icon className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
							{s.label}
						</Link>
					))}
					{completionRate > 0 && (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
							<TrendingUp className="h-3 w-3" />
							{completionRate}% done
						</span>
					)}
				</div>
			</motion.div>

			{/* ── Headline counters ── */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.05 }}
				className="grid grid-cols-2 gap-3 lg:grid-cols-4"
			>
				{([
					{ label: "Current streak", value: `${user?.currentStreak ?? 0}d`, icon: Flame, tone: (user?.currentStreak ?? 0) > 0 ? "ok" : "default" },
					{ label: "Total XP", value: (user?.totalXp ?? 0).toLocaleString(), icon: Zap },
					{ label: "Level", value: user?.currentLevel ?? 1, icon: Sparkles },
					{ label: "Credits", value: (user?.credits ?? 0).toLocaleString(), icon: Activity },
				] as Array<StatItem & { icon: React.ComponentType<{ className?: string }> }>).map((s) => (
					<div
						key={s.label}
						className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
					>
						<div className="flex items-center gap-2">
							<s.icon className="h-3.5 w-3.5 text-neutral-900 dark:text-neutral-100" />
							<p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{s.label}</p>
						</div>
						<p className={cn("mt-1.5 text-2xl font-bold tabular-nums", toneCls(s.tone))}>{s.value}</p>
					</div>
				))}
			</motion.div>

			{/* ── Nudge strip ── */}
			{alerts.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.08 }}
					className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800/50 dark:bg-neutral-900/30"
				>
					<div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-100">
						<AlertTriangle className="h-4 w-4 flex-shrink-0" />
						<span className="text-sm font-semibold">Worth a look:</span>
					</div>
					{alerts.map((alert) => (
						<Link
							key={alert.label}
							href={alert.href}
							className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-200 dark:border-neutral-800/50 dark:bg-neutral-800/40 dark:text-neutral-100 dark:hover:bg-neutral-800/70"
						>
							{alert.label}
						</Link>
					))}
				</motion.div>
			)}

			{/* ── Module rows: stats + trend line chart, alternating sides ── */}
			<div className="space-y-6">
				<ModuleRow
					title="Momentum" icon={Zap} href="/practice" hrefLabel="Keep going" delay={0.14}
					stats={[
						{ label: "XP this year", value: stats.totalXpEarned.toLocaleString() },
						{ label: "Active days", value: stats.activeDays },
						{ label: "Current streak", value: `${user?.currentStreak ?? 0}d`, tone: (user?.currentStreak ?? 0) > 0 ? "ok" : "default" },
						{ label: "Longest streak", value: `${user?.longestStreak ?? 0}d` },
					]}
					data={trends.activity}
					lines={[
						{ key: "xp", name: "XP earned", color: ACCENT },
						{ key: "sessions", name: "Activities", color: INK },
					]}
				/>

				<ModuleRow
					title="Projects" icon={FolderKanban} href="/projects" hrefLabel="All projects" reverse delay={0.2}
					stats={[
						{ label: "Total projects", value: stats.projects.total },
						{ label: "In progress", value: stats.projects.active },
						{ label: "Completed", value: stats.projects.completed, tone: "ok" },
						{ label: "Completion", value: `${completionRate}%`, tone: completionRate > 0 ? "ok" : "default" },
					]}
					data={trends.projects}
					lines={[
						{ key: "started", name: "Started", color: ACCENT },
						{ key: "completed", name: "Completed", color: OK },
					]}
				/>

				<ModuleRow
					title="Career goals" icon={Target} href="/pathfinder" hrefLabel="Pathfinder" delay={0.26}
					stats={[
						{ label: "Total goals", value: stats.goals.total },
						{ label: "Active", value: stats.goals.active },
						{ label: "Completed", value: stats.goals.completed, tone: "ok" },
						{ label: "Avg progress", value: `${stats.goals.avgProgress}%` },
					]}
					data={trends.goals}
					lines={[
						{ key: "goals", name: "Goals set", color: ACCENT },
						{ key: "completed", name: "Completed", color: OK },
					]}
				/>

				<ModuleRow
					title="Interview practice" icon={Mic} href="/mock" hrefLabel="Mock interviews" reverse delay={0.32}
					stats={[
						{ label: "Mock sessions", value: stats.mockSessions },
						{ label: "Study spaces", value: stats.studios },
						{ label: "Active days", value: stats.activeDays },
						{ label: "Level", value: user?.currentLevel ?? 1 },
					]}
					data={trends.mocks}
					lines={[{ key: "sessions", name: "Sessions", color: ACCENT }]}
				/>
			</div>

			{/* ── Bottom split: activity mix bar chart + recent activity feed ── */}
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, delay: 0.38 }}
					className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-2"
				>
					<SectionHeader title="What you've been doing" href="/practice" label="Practice" />
					{mixChartData.length === 0 ? (
						<EmptyBlock
							icon={Activity}
							title="Nothing logged yet"
							action={{ label: "Start your first session", href: "/practice" }}
						/>
					) : (
						<>
							<div className="h-44">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={mixChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={28}>
										<CartesianGrid stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" strokeOpacity={0.6} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor" }} className="text-neutral-600 dark:text-neutral-400" axisLine={false} tickLine={false} />
										<YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "currentColor" }} className="text-neutral-600 dark:text-neutral-400" axisLine={false} tickLine={false} />
										<Tooltip
											contentStyle={{
												background: "var(--color-card)",
												border: "1px solid var(--color-border)",
												borderRadius: 10,
												fontSize: 12,
											}}
											cursor={{ fill: "rgba(0,0,0,0.03)" }}
											formatter={(value: number | undefined) => [`${value ?? 0} activities`, ""]}
										/>
										<Bar dataKey="count" name="Activities" radius={[4, 4, 0, 0]}>
											{mixChartData.map((entry, i) => (
												<Cell key={i} fill={entry.color} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
								{activityMix.slice(0, 8).map((m, i) => (
									<div key={m.type} className="flex items-center gap-1.5">
										<span
											className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
											style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length] }}
										/>
										<span className="text-sm text-neutral-500 dark:text-neutral-400">
											{titleCase(m.type)}
											<span className="ml-1 font-mono text-neutral-600 dark:text-neutral-400">({m.xp} XP)</span>
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, delay: 0.42 }}
					className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
				>
					<SectionHeader title="Recent activity" href="/profile" label="Profile" />
					{recentActivity.length === 0 ? (
						<EmptyBlock icon={Clock} title="No activity yet" />
					) : (
						<div className="space-y-5">
							{recentActivity.slice(0, 6).map((activity, i) => (
								<div key={activity.id} className="relative flex gap-3">
									{i !== Math.min(recentActivity.length, 6) - 1 && (
										<div className="absolute bottom-0 left-3.5 top-7 w-px bg-neutral-200 dark:bg-neutral-800" />
									)}
									<div className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-900/10 dark:border-neutral-900">
										<Clock className="h-3 w-3 text-neutral-900 dark:text-neutral-100" />
									</div>
									<div className="min-w-0 pt-0.5">
										<p className="text-sm leading-snug text-neutral-700 dark:text-neutral-300">
											<span className="font-semibold text-neutral-900 dark:text-white">{activity.title}</span>
											{activity.description ? ` - ${activity.description}` : null}
										</p>
										<span className="mt-0.5 block font-mono text-xs text-neutral-600 dark:text-neutral-400">
											{formatDate(activity.createdAt)}
											{activity.xpEarned > 0 ? ` · +${activity.xpEarned} XP` : ""}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</motion.div>
			</div>
		</div>
	)
}

function EmptyBlock({ icon: Icon, title, action }: {
	icon: React.ComponentType<{ className?: string }>
	title: string
	action?: { label: string; href: string }
}) {
	return (
		<div className="flex flex-col items-center justify-center py-10">
			<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
				<Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
			</div>
			<p className="text-sm font-medium text-neutral-500 dark:text-neutral-300">{title}</p>
			{action && (
				<Link
					href={action.href}
					className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
				>
					<Plus className="h-3.5 w-3.5" /> {action.label}
				</Link>
			)}
		</div>
	)
}
