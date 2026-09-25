'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Target, Plus, CheckCircle2, Trophy, Flame, FolderOpen, MoreVertical,
    MoveRight, Code2, Brain, BarChart3, Zap, ChevronRight, Play,
    PauseCircle, CheckCircle, XCircle, Compass, TrendingUp, Briefcase
} from 'lucide-react'
import Link from 'next/link'
import {
    PathfinderStatus, PathfinderCategory
} from '@repo/db'
import { CreateGoalSheet } from './create-goal-sheet'
import { CreateInterviewPrepSheet } from './create-interview-prep-sheet'
import { CreateGroupSheet } from './create-group-sheet'
import { AssignGoalSheet } from './assign-goal-sheet'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@repo/ui/components/ui/dropdown-menu'
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@repo/ui/components/ui/collapsible'
// Tabs imports reserved for future use
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import {
    usePathfinderStore, type PathfinderGoal, type PathfinderGroup
} from '@/app/store/pathfinderStore'
import { PATHFINDER_CATEGORIES } from '@/types/pathfinder'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
// Aliased: this file already declares a local `ActivityChart`, which charts GOALS.
// The imported one charts days the user actually practised.
import {
    ActivityChart as DailyActivityChart,
    type ActivityPoint,
} from '@/components/common/activity-chart'
import { AnimatedIcon } from "@repo/ui/components/animated-icons"
import { GroupIcon } from './group-icon'

type Goal = PathfinderGoal
type Group = PathfinderGroup

interface PathfinderDashboardProps {
    initialGoals: PathfinderGoal[]
    initialGroups: PathfinderGroup[]
    activity: { series: ActivityPoint[]; unit: string; total: number }
}

const categoryConfig = PATHFINDER_CATEGORIES

// Same unpaired-ink bug the old stat tiles had: `text-neutral-800` with no
// `dark:` counterpart measures 1.18:1 on the dark card, so these status badges
// were unreadable in dark mode. Paired throughout.
//
// `FAILED` keeps red and `ABANDONED` keeps a muted neutral - those two carry
// MEANING in their colour, which the monochrome rule in CLAUDE.md allows for a
// semantic status badge. The other three were decorative and are now ink.
const statusConfig: Record<PathfinderStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    ACTIVE: { label: 'Active', icon: <Play className="w-3 h-3" />, color: 'text-neutral-900 dark:text-neutral-100', bg: 'bg-neutral-900/5 dark:bg-white/10' },
    VERIFICATION: { label: 'Verifying', icon: <Zap className="w-3 h-3" />, color: 'text-neutral-900 dark:text-neutral-100', bg: 'bg-neutral-900/5 dark:bg-white/10' },
    COMPLETED: { label: 'Completed', icon: <CheckCircle className="w-3 h-3" />, color: 'text-neutral-900 dark:text-neutral-100', bg: 'bg-neutral-900/5 dark:bg-white/10' },
    FAILED: { label: 'Retry', icon: <XCircle className="w-3 h-3" />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
    ABANDONED: { label: 'Paused', icon: <PauseCircle className="w-3 h-3" />, color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-500/10' },
}

// Monochrome, per the palette rule in CLAUDE.md. This was
// ['#10b981', ..., '#ec4899', ..., '#14b8a6', '#e11d48'] - emerald, pink, teal
// and rose, which is where the green donut segment came from.
//
// A neutral RAMP rather than one neutral repeated: a pie needs its slices to be
// tellable apart, and lightness is the only channel left once hue is given up.
// Ordered light-to-dark so the first (largest) slice is the most prominent in
// both themes. `currentColor` is not an option here - recharts writes `fill` on
// each Cell and they must differ from each other.
const PIE_COLORS = ['#a3a3a3', '#525252', '#d4d4d4', '#404040', '#737373', '#e5e5e5', '#262626', '#f5f5f5', '#171717', '#8a8a8a']

function GoalCard({ goal, onAssign }: { goal: Goal; onAssign: () => void }) {
    const category = categoryConfig[goal.category]
    const status = statusConfig[goal.status]

    const progressPercent = goal.totalSubGoals > 0
        ? Math.round((goal.completedSubGoals / goal.totalSubGoals) * 100)
        : 0

    const lastActivity = goal.lastActivityAt
        ? new Date(goal.lastActivityAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative"
        >
            <Link href={`/pathfinder/${goal.slug}`}>
                <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer bg-white dark:bg-neutral-900/50 hover:shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                        {/* The card is a `.group`, so hovering anywhere on it runs
                            the icon - the whole card is the hit area, not the icon. */}
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-900 dark:text-neutral-100", category.bg)}>
                            <AnimatedIcon name={category.icon} size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-neutral-900 dark:text-white text-sm line-clamp-1 pr-6">
                                {goal.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className={cn("text-xs px-1.5 py-0 h-4 font-normal gap-1", status.bg, status.color)}>
                                    {status.icon}
                                    {status.label}
                                </Badge>
                                <span className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">
                                    {goal.level.toLowerCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                            <span>{goal.completedSubGoals}/{goal.totalSubGoals}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Brain className="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                            <span>{goal.totalQuizAnswered}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Code2 className="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                            <span>{goal.totalCodingSolved}</span>
                        </div>
                        {goal.streakDays > 0 && (
                            <div className="flex items-center gap-1 text-neutral-900 dark:text-neutral-100">
                                <Flame className="w-3 h-3" />
                                <span>{goal.streakDays}d</span>
                            </div>
                        )}
                        {lastActivity && (
                            <span className="text-neutral-600 dark:text-neutral-400 ml-auto text-xs">{lastActivity}</span>
                        )}
                    </div>
                    <div className="relative">
                        <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                            <span>Progress</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-1" />
                    </div>
                </div>
            </Link>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-600 dark:text-neutral-400 hover:text-neutral-600">
                            <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); onAssign(); }}>
                            <MoveRight className="w-3.5 h-3.5 mr-2" />
                            Move to Group
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    )
}

function GroupSection({ group, goals, onAssignGoal }: { group: Group; goals: Goal[]; onAssignGoal: (goalId: string) => void }) {
    const [isOpen, setIsOpen] = useState(true)

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors group">
                <div className="flex h-5 w-5 items-center justify-center rounded text-neutral-900 dark:text-neutral-100" style={{ backgroundColor: `${group.color || '#525252'}20` }}>
                    <GroupIcon value={group.emoji} size={12} />
                </div>
                <span className="font-medium text-xs text-neutral-700 dark:text-neutral-300 flex-1 text-left">{group.name}</span>
                <Badge variant="secondary" className="text-xs h-4 px-1.5 font-normal bg-neutral-100 dark:bg-neutral-800">{goals.length}</Badge>
                <ChevronRight className={cn("w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 transition-transform", isOpen && "rotate-90")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
                {goals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onAssign={() => onAssignGoal(goal.id)} />
                ))}
                {goals.length === 0 && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 py-3 text-center">No goals in this group</p>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}

function StatsSection({ goals }: { goals: Goal[] }) {
    const activeGoals = goals.filter(g => g.status === 'ACTIVE' || g.status === 'VERIFICATION')
    const completedGoals = goals.filter(g => g.status === 'COMPLETED')
    const totalTasks = goals.reduce((sum, g) => sum + g.totalSubGoals, 0)
    const completedTasks = goals.reduce((sum, g) => sum + g.completedSubGoals, 0)
    const totalQuiz = goals.reduce((sum, g) => sum + g.totalQuizAnswered, 0)
    const totalCoding = goals.reduce((sum, g) => sum + g.totalCodingSolved, 0)
    const maxStreak = Math.max(...goals.map(g => g.streakDays), 0)

    // Six figures in a narrow side panel: a small band, three across.
    // (These tiles once carried an unpaired `text-neutral-800` ink that measured
    // 1.18:1 on the dark card; StatBand owns its ink now, paired in both themes.)
    return (
        <StatBand
            size="sm"
            cols={3}
            items={[
                { icon: Target, label: 'Active', value: activeGoals.length },
                { icon: Trophy, label: 'Done', value: completedGoals.length },
                { icon: CheckCircle2, label: 'Tasks', value: `${completedTasks}/${totalTasks}` },
                { icon: Brain, label: 'Quiz', value: totalQuiz },
                { icon: Code2, label: 'Code', value: totalCoding },
                { icon: Flame, label: 'Streak', value: `${maxStreak}d` },
            ]}
        />
    )
}

/**
 * Cumulative goals over the last 30 days.
 *
 * Real data only - derived from each goal's own `createdAt`. There is no other
 * time series on this page, so this is the one honest line available; nothing
 * here is invented to fill the space.
 *
 * The series is DENSE - every day in the window gets a point, including days
 * with no new goal. A sparse series plotted on an evenly spaced axis draws three
 * goals three weeks apart as three adjacent points, which is a line of the wrong
 * SHAPE, not merely the wrong labels. Same lesson as the admin analytics fix.
 */
function GoalTrendChart({ goals }: { goals: Goal[] }) {
    const DAYS = 30
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - (DAYS - 1))
    start.setHours(0, 0, 0, 0)

    // How many goals existed BEFORE the window opens - the line starts there
    // rather than at zero, or a long-standing account looks like it began today.
    let running = goals.filter((g) => new Date(g.createdAt) < start).length

    const perDay = new Map<string, number>()
    for (const g of goals) {
        const d = new Date(g.createdAt)
        if (d < start) continue
        const key = d.toISOString().split('T')[0] as string
        perDay.set(key, (perDay.get(key) ?? 0) + 1)
    }

    const data: Array<{ date: string; label: string; total: number }> = []
    const cursor = new Date(start)
    for (let i = 0; i < DAYS; i++) {
        const key = cursor.toISOString().split('T')[0] as string
        running += perDay.get(key) ?? 0
        data.push({
            date: key,
            label: cursor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            total: running,
        })
        cursor.setDate(cursor.getDate() + 1)
    }

    if (goals.length === 0) return null

    return (
        <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">Goals Over Time</h3>
            <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 p-3
 [--chart-1:#171717] [--chart-axis:#737373] [--chart-cursor:#00000008]
 dark:[--chart-1:#f5f5f5] dark:[--chart-axis:#a3a3a3] dark:[--chart-cursor:#ffffff0a]">
                <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} minTickGap={28} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                        <RechartsTooltip
                            cursor={{ stroke: 'var(--chart-cursor)' }}
                            contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ fontWeight: 600, color: 'var(--popover-foreground)' }}
                            formatter={(v) => [v ?? 0, 'Goals']}
                        />
                        <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    Last {DAYS} days &middot; {goals.length} {goals.length === 1 ? 'goal' : 'goals'} total
                </p>
            </div>
        </div>
    )
}

function ActivityChart({ goals }: { goals: Goal[] }) {
    const chartData = goals
        .filter(g => g.status === 'ACTIVE' || g.status === 'COMPLETED')
        .slice(0, 8)
        .map((g) => ({
            name: g.title.length > 12 ? g.title.slice(0, 12) + '…' : g.title,
            tasks: g.completedSubGoals,
            quiz: g.totalQuizAnswered,
            code: g.totalCodingSolved,
        }))

    if (chartData.length === 0) return null

    return (
        <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">Goal Activity</h3>
            {/* The chart palette lives here as CSS variables with `dark:`
                counterparts, so every series, axis and cursor inverts with the
                theme. Recharts takes colours as prop STRINGS, not classes, so a
                Tailwind `dark:` utility cannot reach inside it - a variable set on
                an ancestor is the only thing that can.

                Values are neutrals from the Tailwind ramp, chosen so the three
                series stay distinguishable in both themes: dark-to-light in light
                mode, light-to-dark in dark mode. */}
            <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 p-3
 [--chart-1:#171717] [--chart-2:#737373] [--chart-3:#d4d4d4] [--chart-axis:#737373] [--chart-cursor:#00000008]
 dark:[--chart-1:#f5f5f5] dark:[--chart-2:#a3a3a3] dark:[--chart-3:#525252] dark:[--chart-axis:#a3a3a3] dark:[--chart-cursor:#ffffff0a]">
                {/* `var(--border)`, NOT `hsl(var(--border))`.
                    `--border` in packages/ui/src/styles/globals.css is an `oklch()`
                    COLOUR, not a triple of HSL channels - so `hsl(var(--border))`
                    resolved to `hsl(oklch(0.922 0 0))`, which is invalid CSS and
                    painted nothing. The grid lines and the tooltip background were
                    simply absent in both themes, which is most of why these charts
                    read as "not visible".

                    The three series colours come from CSS variables set on the
                    wrapper below with `dark:` counterparts, so they invert with the
                    theme instead of being one hardcoded value that only suits one.
                    Same pattern as the admin TrendChart. */}
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} barSize={12} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                        <RechartsTooltip
                            cursor={{ fill: 'var(--chart-cursor)' }}
                            contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ fontWeight: 600, color: 'var(--popover-foreground)' }}
                        />
                        <Bar dataKey="tasks" fill="var(--chart-1)" radius={[3, 3, 0, 0]} name="Tasks" />
                        <Bar dataKey="quiz" fill="var(--chart-2)" radius={[3, 3, 0, 0]} name="Quiz" />
                        <Bar dataKey="code" fill="var(--chart-3)" radius={[3, 3, 0, 0]} name="Code" />
                    </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2">
                    {/* Each swatch now matches the bar it labels. All three were
                        `bg-neutral-900` - identical to each other, so the legend
                        distinguished nothing, and nearly invisible on the dark card. */}
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"><span className="w-2 h-2 rounded-sm" style={{ background: 'var(--chart-1)' }} />Tasks</span>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"><span className="w-2 h-2 rounded-sm" style={{ background: 'var(--chart-2)' }} />Quiz</span>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"><span className="w-2 h-2 rounded-sm" style={{ background: 'var(--chart-3)' }} />Code</span>
                </div>
            </div>
        </div>
    )
}

function CategoryChart({ goals }: { goals: Goal[] }) {
    const categoryData = Object.entries(
        goals.reduce((acc, g) => {
            acc[g.category] = (acc[g.category] || 0) + 1
            return acc
        }, {} as Record<string, number>)
    ).map(([cat, count], idx) => ({
        name: cat.toLowerCase().replace('_', ' '),
        value: count,
        icon: categoryConfig[cat as PathfinderCategory]?.icon ?? 'learning',
        color: PIE_COLORS[idx % PIE_COLORS.length],
    }))

    if (categoryData.length === 0) return null

    return (
        <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">By Category</h3>
            <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 p-3">
                <div className="flex items-center gap-4">
                    <div className="w-[120px] h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28} strokeWidth={2}>
                                    {categoryData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} stroke="hsl(var(--background))" />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        {categoryData.map((cat, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <AnimatedIcon name={cat.icon} size={14} className="shrink-0 text-neutral-500 dark:text-neutral-400" />
                                <span className="flex-1 truncate text-xs capitalize text-neutral-600 dark:text-neutral-400">{cat.name}</span>
                                <span className="text-xs font-medium text-neutral-900 dark:text-white">{cat.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProgressOverview({ goals }: { goals: Goal[] }) {
    const activeGoals = goals
        .filter(g => g.status === 'ACTIVE')
        .sort((a, b) => {
            const aP = a.totalSubGoals > 0 ? a.completedSubGoals / a.totalSubGoals : 0
            const bP = b.totalSubGoals > 0 ? b.completedSubGoals / b.totalSubGoals : 0
            return bP - aP
        })
        .slice(0, 5)

    if (activeGoals.length === 0) return null

    return (
        <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">Active Progress</h3>
            <div className="space-y-2.5">
                {activeGoals.map((goal) => {
                    const pct = goal.totalSubGoals > 0 ? Math.round((goal.completedSubGoals / goal.totalSubGoals) * 100) : 0
                    const category = categoryConfig[goal.category]
                    return (
                        <Link key={goal.id} href={`/pathfinder/${goal.slug}`}>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
                                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-900 dark:text-neutral-100", category.bg)}>
                                    <AnimatedIcon name={category.icon} size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{goal.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Progress value={pct} className="h-1 flex-1" />
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400 w-8 text-right">{pct}%</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

function RecentActivity({ goals }: { goals: Goal[] }) {
    const recentGoals = [...goals]
        .filter(g => g.lastActivityAt)
        .sort((a, b) => new Date(b.lastActivityAt!).getTime() - new Date(a.lastActivityAt!).getTime())
        .slice(0, 5)

    if (recentGoals.length === 0) return null

    return (
        <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">Recent Activity</h3>
            <div className="space-y-1">
                {recentGoals.map((goal) => {
                    const category = categoryConfig[goal.category]
                    return (
                        <Link key={goal.id} href={`/pathfinder/${goal.slug}`}>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
                                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-900 dark:text-neutral-100", category.bg)}>
                                    <AnimatedIcon name={category.icon} size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{goal.title}</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                        {goal.lastActivityAt && new Date(goal.lastActivityAt).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

function OverviewContent({
    goals,
    groups: _groups,
    activity,
}: {
    goals: Goal[]
    groups: Group[]
    activity: { series: ActivityPoint[]; unit: string; total: number }
}) {
    if (goals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                {/* `dark:text-neutral-500`, not `-700`. On the dark card (`neutral-900`)
                    a `neutral-700` glyph measures 1.73:1 - a smudge at best.
                    `neutral-500` measures 3.78:1, which clears WCAG's 3:1 minimum
                    for a graphical object (this is a 48px icon, not body text)
                    and reads as a deliberately muted icon rather than a rendering
                    failure. Measured, not guessed, per CLAUDE.md. */}
                <BarChart3 className="w-12 h-12 text-neutral-600 dark:text-neutral-500 mb-4" />
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">No stats yet</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Create your first goal to see stats here</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <StatsSection goals={goals} />

            {/* Days practised. Distinct from every other chart on this page, which
                are all derived from GOAL rows - this one comes from
                `pathfinder_daily_session`, the record of turning up. */}
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                        Days practised
                    </h3>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-neutral-900 tabular-nums dark:text-white">
                            {activity.total}
                        </span>
                        {" in 30 days"}
                    </span>
                </div>
                <DailyActivityChart data={activity.series} unit={activity.unit} />
            </div>

            <GoalTrendChart goals={goals} />
            <ActivityChart goals={goals} />
            <CategoryChart goals={goals} />
            <ProgressOverview goals={goals} />
            <RecentActivity goals={goals} />
        </div>
    )
}

export function EmptyState({ onCreateGoal }: { onCreateGoal: () => void }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h3 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Start Your Learning Journey</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mb-4">Create your first learning goal and track progress with AI-powered practice.</p>
            <Button onClick={onCreateGoal} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Goal
            </Button>
        </motion.div>
    )
}

function QuickActions({ onCreateGoal, onCreateGroup, onInterviewPrep }: { onCreateGoal: () => void; onCreateGroup: () => void; onInterviewPrep: () => void }) {
    return (
        <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={onCreateGoal} className="h-8 text-xs bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
                <Target className="w-4 h-4 mr-1.5" />
                New Goal
            </Button>
            <Button variant="outline" size="sm" onClick={onInterviewPrep} className="h-8 text-xs">
                <Briefcase className="w-4 h-4 mr-1.5" />
                Prep for a Job
            </Button>
            <Button variant="outline" size="sm" onClick={onCreateGroup} className="h-8 text-xs">
                <FolderOpen className="w-4 h-4 mr-1.5" />
                New Group
            </Button>
            <Link href="/pathfinder/explore">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Compass className="w-4 h-4 mr-1.5" />
                    Explore
                </Button>
            </Link>
        </div>
    )
}

export function PathfinderDashboard({ initialGoals, initialGroups, activity }: PathfinderDashboardProps) {
    const {
        goals, groups, initialize,
        setCreateSheetOpen, setCreateGroupSheetOpen, setAssignSheetOpen,
        createSheetOpen, createGroupSheetOpen, assignSheetOpen,
        selectedGoalId, setSelectedGoalId,
        addGoal, addGroup, assignGoalToGroup
    } = usePathfinderStore()

    const [interviewPrepOpen, setInterviewPrepOpen] = useState(false)
    const [mobileTab, setMobileTab] = useState<'goals' | 'overview'>('goals')

    useEffect(() => {
        initialize(initialGoals, initialGroups)
    }, [initialGoals, initialGroups, initialize])

    const displayGoals = goals.length > 0 ? goals : initialGoals
    const displayGroups = groups.length > 0 ? groups : initialGroups

    const ungroupedGoals = displayGoals.filter(g => !g.groupId)
    const groupedGoals = displayGroups.map(group => ({
        group,
        goals: displayGoals.filter(g => g.groupId === group.id),
    }))

    const handleGoalCreated = (goalId: string, newGoal?: Goal) => {
        setCreateSheetOpen(false)
        if (newGoal) addGoal(newGoal)
        const slug = (newGoal as { slug?: string })?.slug ?? goalId
        window.location.href = `/pathfinder/${slug}`
    }

    const handleGroupCreated = (newGroup: Group) => {
        addGroup(newGroup)
        setCreateGroupSheetOpen(false)
    }

    const handleAssignGoal = (goalId: string) => {
        setSelectedGoalId(goalId)
        setAssignSheetOpen(true)
    }

    const handleAssignComplete = (goalId: string, groupId: string | null) => {
        assignGoalToGroup(goalId, groupId)
        setAssignSheetOpen(false)
    }

    const GoalsList = () => (
        <AnimatePresence mode="wait">
            {displayGoals.length === 0 ? (
                <EmptyState onCreateGoal={() => setCreateSheetOpen(true)} />
            ) : (
                <div>
                    {groupedGoals.filter(g => g.goals.length > 0).map(({ group, goals: groupGoals }) => (
                        <GroupSection key={group.id} group={group} goals={groupGoals} onAssignGoal={handleAssignGoal} />
                    ))}
                    {groupedGoals.filter(g => g.goals.length === 0).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 px-2">Empty Groups</p>
                            {groupedGoals.filter(g => g.goals.length === 0).map(({ group }) => (
                                <div key={group.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                                    <span style={{ backgroundColor: `${group.color || '#525252'}20` }} className="flex h-4 w-4 items-center justify-center rounded text-neutral-700 dark:text-neutral-300">
                                        <GroupIcon value={group.emoji} size={10} />
                                    </span>
                                    {group.name}
                                </div>
                            ))}
                        </div>
                    )}
                    {ungroupedGoals.length > 0 && (
                        <div className={cn(displayGroups.length > 0 && "mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/50")}>
                            {displayGroups.length > 0 && (
                                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2 px-2">
                                    Ungrouped ({ungroupedGoals.length})
                                </p>
                            )}
                            <div className="space-y-2">
                                {ungroupedGoals.map((goal) => (
                                    <GoalCard key={goal.id} goal={goal} onAssign={() => handleAssignGoal(goal.id)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AnimatePresence>
    )

    return (
        <div className="h-dvh flex flex-col">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/80 backdrop-blur-sm">
                <div className="page-frame flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                            <Target className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold text-neutral-900 dark:text-white">Pathfinder</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Track your learning goals</p>
                        </div>
                    </div>
                    <QuickActions
                        onCreateGoal={() => setCreateSheetOpen(true)}
                        onCreateGroup={() => setCreateGroupSheetOpen(true)}
                        onInterviewPrep={() => setInterviewPrepOpen(true)}
                    />
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="lg:hidden shrink-0 px-4 py-2 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/80">
                {/* The shared segmented control (plan/ui-pass UI-2), not a hand-built copy
                    of its classes. The panels below stay controlled by `mobileTab`. */}
                <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'goals' | 'overview')}>
                    <TabsList variant="segmented" size="sm">
                        <TabsTrigger value="goals" icon={<Target />}>Goals</TabsTrigger>
                        <TabsTrigger value="overview" icon={<TrendingUp />}>Overview</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <div className="page-frame flex h-full">
                    {/* Goals Panel - Desktop always, Mobile conditional */}
                    <div className={cn(
                        "w-full lg:w-[400px] xl:w-[440px] border-r border-neutral-200/60 dark:border-neutral-800/60 flex flex-col bg-white dark:bg-neutral-900/30",
                        mobileTab !== 'goals' && "hidden lg:flex"
                    )}>
                        <ScrollArea className="min-h-0 flex-1">
                            <div className="p-4">
                                <GoalsList />
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Overview Panel - Desktop always, Mobile conditional */}
                    <div className={cn(
                        "flex-1 flex flex-col",
                        mobileTab !== 'overview' && "hidden lg:flex"
                    )}>
                        <ScrollArea className="min-h-0 flex-1">
                            <div className="p-6">
                                <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">Overview</h2>
                                <OverviewContent goals={displayGoals} groups={displayGroups} activity={activity} />
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <CreateInterviewPrepSheet
                open={interviewPrepOpen}
                onOpenChange={setInterviewPrepOpen}
            />
            <CreateGoalSheet
                open={createSheetOpen}
                onOpenChange={setCreateSheetOpen}
                onSuccess={handleGoalCreated}
                groups={displayGroups}
                onGroupCreated={handleGroupCreated}
            />
            <CreateGroupSheet
                open={createGroupSheetOpen}
                onOpenChange={setCreateGroupSheetOpen}
                onSuccess={handleGroupCreated}
            />
            <AssignGoalSheet
                open={assignSheetOpen}
                onOpenChange={setAssignSheetOpen}
                goalId={selectedGoalId}
                groups={displayGroups}
                onAssign={handleAssignComplete}
            />
        </div>
    )
}
