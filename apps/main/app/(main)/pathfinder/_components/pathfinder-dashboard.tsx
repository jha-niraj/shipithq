'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Briefcase, FolderPlus, Target, Trophy, CheckCircle2, Code2, Flame, CalendarDays } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import { cn } from '@repo/ui/lib/utils'
import { usePathfinderStore, type PathfinderGoal, type PathfinderGroup } from '@/app/store/pathfinderStore'
import { ActivityChart, type ActivityPoint } from '@/components/common/activity-chart'
import { PATHFINDER_CATEGORIES } from '@/types/pathfinder'
import { PathfinderShell } from './pathfinder-shell'
import { CreateGoalSheet } from './create-goal-sheet'
import { CreateInterviewPrepSheet } from './create-interview-prep-sheet'
import { CreateGroupSheet } from './create-group-sheet'
import { AssignGoalSheet } from './assign-goal-sheet'
import { GoalCard } from './goal-card'
import { GroupHeader } from './group-header'

/**
 * Pathfinder's home (plan/pathfinder PF-6, PF-12): the shared header with the tabs My
 * goals, Overview and Explore. My goals is every goal as a card, grouped, each with
 * its own menu; Overview is the numbers and the days you actually practised.
 *
 * Replaces a fixed 440px goals rail beside five charts, whose goals list was defined
 * inside the render (so it remounted on every state change) and which fell back to
 * the server's list whenever the store was empty, so a deleted last goal came back.
 */

type Activity = { series: ActivityPoint[]; unit: string; total: number }
type Filter = 'active' | 'paused' | 'done' | 'all'

const FILTERS: { value: Filter; label: string; test: (g: PathfinderGoal) => boolean }[] = [
    { value: 'active', label: 'Active', test: (g) => g.status === 'ACTIVE' || g.status === 'VERIFICATION' || g.status === 'FAILED' },
    { value: 'paused', label: 'Paused', test: (g) => g.status === 'ABANDONED' },
    { value: 'done', label: 'Completed', test: (g) => g.status === 'COMPLETED' },
    { value: 'all', label: 'All', test: () => true },
]

export function PathfinderDashboard({ tab, initialGoals, initialGroups, activity }: {
    tab: 'goals' | 'overview'
    initialGoals: PathfinderGoal[]
    initialGroups: PathfinderGroup[]
    activity: Activity
}) {
    const router = useRouter()
    const {
        goals, groups, initialize, addGoal, addGroup, assignGoalToGroup,
        createSheetOpen, setCreateSheetOpen, createGroupSheetOpen, setCreateGroupSheetOpen,
        assignSheetOpen, setAssignSheetOpen, selectedGoalId, setSelectedGoalId,
    } = usePathfinderStore()
    const [ready, setReady] = useState(false)
    const [prepOpen, setPrepOpen] = useState(false)
    const [filter, setFilter] = useState<Filter>('active')

    useEffect(() => { initialize(initialGoals, initialGroups); setReady(true) }, [initialGoals, initialGroups, initialize])
    // Until the store is seeded, draw the server's list; after that the store is the truth.
    const list = ready ? goals : initialGoals
    const groupList = ready ? groups : initialGroups

    const actions = (
        <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setCreateSheetOpen(true)} className="h-8 gap-1.5"><Plus className="size-4" />New goal</Button>
            <Button size="sm" variant="outline" onClick={() => setPrepOpen(true)} className="h-8 gap-1.5"><Briefcase className="size-4" />Prep for a job</Button>
            {tab === 'goals' && <Button size="sm" variant="outline" onClick={() => setCreateGroupSheetOpen(true)} className="h-8 gap-1.5"><FolderPlus className="size-4" />New group</Button>}
        </div>
    )

    return (
        <PathfinderShell tab={tab} actions={actions}>
            {tab === 'goals'
                ? <GoalsTab goals={list} groups={groupList} filter={filter} setFilter={setFilter}
                    onCreate={() => setCreateSheetOpen(true)}
                    onMove={(id) => { setSelectedGoalId(id); setAssignSheetOpen(true) }} />
                : <OverviewTab goals={list} activity={activity} />}

            <CreateInterviewPrepSheet open={prepOpen} onOpenChange={setPrepOpen} />
            <CreateGoalSheet
                open={createSheetOpen}
                onOpenChange={setCreateSheetOpen}
                onSuccess={(goalId, goal) => {
                    setCreateSheetOpen(false)
                    if (goal) addGoal(goal as PathfinderGoal)
                    router.push(`/pathfinder/${(goal as { slug?: string } | undefined)?.slug ?? goalId}`)
                }}
                groups={groupList}
                onGroupCreated={addGroup}
            />
            <CreateGroupSheet open={createGroupSheetOpen} onOpenChange={setCreateGroupSheetOpen} onSuccess={(g) => { addGroup(g); setCreateGroupSheetOpen(false) }} />
            <AssignGoalSheet
                open={assignSheetOpen}
                onOpenChange={setAssignSheetOpen}
                goalId={selectedGoalId}
                groups={groupList}
                onAssign={(goalId, groupId) => { assignGoalToGroup(goalId, groupId); setAssignSheetOpen(false) }}
            />
        </PathfinderShell>
    )
}

function GoalsTab({ goals, groups, filter, setFilter, onCreate, onMove }: {
    goals: PathfinderGoal[]
    groups: PathfinderGroup[]
    filter: Filter
    setFilter: (f: Filter) => void
    onCreate: () => void
    onMove: (goalId: string) => void
}) {
    const test = FILTERS.find((f) => f.value === filter)!.test
    const shown = goals.filter(test)
    const sections = useMemo(() => [
        ...groups.map((g) => ({ group: g as PathfinderGroup | null, goals: shown.filter((x) => x.groupId === g.id), total: goals.filter((x) => x.groupId === g.id).length })),
        { group: null, goals: shown.filter((x) => !x.groupId || !groups.some((g) => g.id === x.groupId)), total: 0 },
    ], [groups, shown, goals])

    if (goals.length === 0) {
        return (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center dark:border-neutral-800">
                <AnimatedIcon name="target" size={40} motion="always" className="text-neutral-500" />
                <p className="mt-4 text-[15px] font-semibold text-neutral-900 dark:text-white">Start your first goal</p>
                <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                    Name what you want to learn and get a plan of topics a day at a time, or copy one someone shared.
                </p>
                <div className="mt-5 flex gap-2">
                    <Button onClick={onCreate} className="gap-1.5"><Plus className="size-4" />New goal</Button>
                    <Button asChild variant="outline"><Link href="/pathfinder/explore">Explore shared goals</Link></Button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => {
                    const n = goals.filter(f.test).length
                    return (
                        <button key={f.value} type="button" onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
                            className={cn('h-8 rounded-full border px-3 text-[13px] transition-colors',
                                filter === f.value
                                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300')}>
                            {f.label} <span className="ml-0.5 font-mono text-[11px] opacity-70">{n}</span>
                        </button>
                    )
                })}
            </div>

            {shown.length === 0 && <p className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">No goals here.</p>}

            <div className="mt-6 space-y-8">
                {sections.map(({ group, goals: items, total }) => {
                    if (!group && items.length === 0) return null
                    // A group with nothing under this filter still shows its heading, so it can be renamed or deleted.
                    if (group && items.length === 0 && filter !== 'all') return null
                    return (
                        <section key={group?.id ?? 'ungrouped'}>
                            {group
                                ? <GroupHeader group={group} count={total} />
                                : groups.length > 0 && <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Ungrouped</h2>}
                            {items.length > 0
                                ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {items.map((g) => <GoalCard key={g.id} goal={g} onMove={() => onMove(g.id)} />)}
                                </div>
                                : <p className="text-sm text-neutral-500 dark:text-neutral-400">No goals in this group yet. Use a goal's menu to move one here.</p>}
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

function OverviewTab({ goals, activity }: { goals: PathfinderGoal[]; activity: Activity }) {
    const active = goals.filter((g) => g.status === 'ACTIVE' || g.status === 'VERIFICATION')
    const topics = goals.reduce((n, g) => n + g.totalSubGoals, 0)
    const done = goals.reduce((n, g) => n + g.completedSubGoals, 0)
    const coding = goals.reduce((n, g) => n + g.totalCodingSolved, 0)
    const streak = Math.max(0, ...goals.map((g) => g.streakDays))
    const top = [...active].sort((a, b) => (b.lastActivityAt ? +new Date(b.lastActivityAt) : 0) - (a.lastActivityAt ? +new Date(a.lastActivityAt) : 0)).slice(0, 5)

    return (
        <div className="space-y-6">
            <StatBand cols={5} items={[
                { icon: Target, label: 'Active goals', value: active.length },
                { icon: Trophy, label: 'Completed', value: goals.filter((g) => g.status === 'COMPLETED').length },
                { icon: CheckCircle2, label: 'Topics done', value: topics ? `${done}/${topics}` : '-' },
                { icon: Code2, label: 'Problems solved', value: coding },
                { icon: Flame, label: 'Best streak', value: streak ? `${streak}d` : '-' },
            ]} />

            <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white"><CalendarDays className="size-4" />Days practised</h3>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400"><span className="font-medium tabular-nums text-neutral-900 dark:text-white">{activity.total}</span> in 30 days</span>
                </div>
                <ActivityChart data={activity.series} unit={activity.unit} />
            </div>

            {top.length > 0 && (
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Keep going</h3>
                    <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                        {top.map((g) => {
                            const pct = g.totalSubGoals ? Math.round((g.completedSubGoals / g.totalSubGoals) * 100) : 0
                            const cat = PATHFINDER_CATEGORIES[g.category]
                            return (
                                <li key={g.id}>
                                    <Link href={`/pathfinder/${g.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                                        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-900 dark:text-neutral-100', cat?.bg)}>
                                            <AnimatedIcon name={cat?.icon ?? 'target'} size={16} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm text-neutral-900 dark:text-white">{g.title}</span>
                                        <span className="w-24 shrink-0">
                                            <span className="block h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"><span className="block h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} /></span>
                                        </span>
                                        <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">{pct}%</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}
