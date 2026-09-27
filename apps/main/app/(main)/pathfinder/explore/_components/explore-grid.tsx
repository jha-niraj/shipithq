'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@repo/ui/components/ui/input'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import { cn } from '@repo/ui/lib/utils'
import { PATHFINDER_CATEGORIES } from '@/types/pathfinder'
import type { PublicGoalCard } from '@/actions/(main)/pathfinder/explore.action'

/**
 * Explore's grid (plan/pathfinder PF-3): every shared goal as a card, a search box
 * and a filter per category that actually has goals. Replaces the old sidebar plus
 * a "select a goal" placeholder, which showed nothing until you clicked.
 */

const label = (v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())

export function ExploreGrid({ goals }: { goals: PublicGoalCard[] }) {
    const [q, setQ] = useState('')
    const [category, setCategory] = useState<string | null>(null)
    const categories = useMemo(() => [...new Set(goals.map((g) => g.category))], [goals])
    const shown = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return goals.filter((g) =>
            (!category || g.category === category) &&
            (!needle || g.title.toLowerCase().includes(needle) || (g.overview ?? '').toLowerCase().includes(needle)))
    }, [goals, q, category])

    if (goals.length === 0) {
        return (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center dark:border-neutral-800">
                <AnimatedIcon name="empty-search" size={40} motion="always" className="text-neutral-500" />
                <p className="mt-4 text-[15px] font-semibold text-neutral-900 dark:text-white">Nothing shared yet</p>
                <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                    When a learner shares a goal it shows up here for anyone to copy. Share one of yours from its page.
                </p>
                <Link href="/pathfinder" className="mt-5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                    Go to my goals
                </Link>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shared goals" className="pl-9" aria-label="Search shared goals" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[null, ...categories].map((c) => (
                        <button key={c ?? 'all'} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
                            className={cn('h-8 rounded-full border px-3 text-[13px] transition-colors',
                                category === c
                                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300')}>
                            {c ? label(c) : 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {shown.length === 0 ? (
                <p className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">No shared goal matches that.</p>
            ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {shown.map((g) => {
                        const cat = PATHFINDER_CATEGORIES[g.category]
                        return (
                            <Link key={g.id} href={`/pathfinder/explore/${g.id}`}
                                className="group flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600">
                                <div className="flex items-start gap-3">
                                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-900 dark:text-neutral-100', cat?.bg ?? 'bg-neutral-100 dark:bg-neutral-800')}>
                                        <AnimatedIcon name={cat?.icon ?? 'target'} size={20} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px] font-semibold text-neutral-900 dark:text-white">{g.title}</p>
                                        <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                                            by {g.authorName || g.authorUsername || 'a learner'} · {label(g.level)}
                                        </p>
                                    </div>
                                </div>
                                {g.overview && <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-neutral-600 dark:text-neutral-300">{g.overview}</p>}
                                <p className="mt-auto pt-4 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                    {g.totalSubGoals} topics · {g.days} {g.days === 1 ? 'day' : 'days'}{g.coding ? ` · ${g.coding} coding` : ''}{g.copies ? ` · copied ${g.copies}x` : ''}
                                </p>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
