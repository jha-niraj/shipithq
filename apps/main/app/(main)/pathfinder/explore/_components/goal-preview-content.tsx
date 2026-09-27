'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, CalendarDays, Code2, Copy, ArrowRight } from 'lucide-react'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import { copyPathfinderGoal } from '@/actions/(main)/pathfinder'
import { PATHFINDER_CATEGORIES } from '@/types/pathfinder'
import type { PublicGoal } from '@/actions/(main)/pathfinder/explore.action'

/**
 * A shared goal before you copy it (plan/pathfinder PF-3, PF-5): what it covers, day by
 * day, and one button. Copying is free and gives you the whole goal, notes and coding
 * problems included, starting today. If you already copied it, the button opens your copy.
 */

const label = (v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
const KIND: Record<string, string> = { TECHNICAL: 'Technical', BEHAVIORAL: 'Behavioural', CODING: 'Coding' }

export function GoalPreviewContent({ goal }: { goal: PublicGoal }) {
    const router = useRouter()
    const [copying, setCopying] = useState(false)
    const cat = PATHFINDER_CATEGORIES[goal.category]
    const topics = goal.days.reduce((n, d) => n + d.topics.length, 0)
    const coding = goal.days.reduce((n, d) => n + d.topics.filter((t) => t.hasCoding).length, 0)
    const open = goal.ownerSlug ?? goal.copySlug

    const copy = async () => {
        setCopying(true)
        try {
            const r = await copyPathfinderGoal(goal.id)
            if (r.success) {
                toast.success(r.existing ? 'You already have a copy. Opening it.' : 'Copied to your goals')
                router.push(`/pathfinder/${r.slug}`)
                return
            }
            toast.error(r.error)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Could not copy this goal')
        }
        setCopying(false)
    }

    return (
        <div className="w-full pb-10">
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/85 px-page py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
                <Link href="/pathfinder/explore" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                    <ArrowLeft className="size-4" aria-hidden /> Explore
                </Link>
                <span className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-white">{goal.title}</p>
                {open ? (
                    <Link href={`/pathfinder/${open}`} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                        {goal.isOwner ? 'Open your goal' : 'Open your copy'} <ArrowRight className="size-4" aria-hidden />
                    </Link>
                ) : (
                    <button type="button" onClick={copy} disabled={copying}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                        {copying ? <InlineLoader size="sm" /> : <Copy className="size-4" aria-hidden />} Copy to my goals
                    </button>
                )}
            </div>

            <div className="mx-auto w-full max-w-4xl px-page pt-8">
                <div className="flex items-start gap-4">
                    <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl text-neutral-900 dark:text-neutral-100', cat?.bg ?? 'bg-neutral-100 dark:bg-neutral-800')}>
                        <AnimatedIcon name={cat?.icon ?? 'target'} size={28} motion="always" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{goal.title}</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            by {goal.user?.name || goal.user?.username || 'a learner'} · {label(goal.level)} · {label(goal.category)}
                        </p>
                    </div>
                </div>

                {goal.overview && <p className="mt-5 text-[15px] leading-7 text-neutral-700 dark:text-neutral-300">{goal.overview}</p>}

                <StatBand cols={3} className="mt-6" items={[
                    { icon: BookOpen, label: 'Topics', value: topics },
                    { icon: CalendarDays, label: 'Days', value: goal.days.length },
                    { icon: Code2, label: 'Coding problems', value: coding ? `${coding} topics` : '-' },
                ]} />

                {goal.learningObjectives.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">What you will be able to do</h2>
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {goal.learningObjectives.map((o) => (
                                <li key={o} className="rounded-xl border border-neutral-200 px-3 py-2 text-[14px] leading-6 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">{o}</li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="mt-8">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">The plan</h2>
                    <ol className="mt-3 space-y-4">
                        {goal.days.map((d) => (
                            <li key={d.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
                                <p className="border-b border-neutral-200 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">Day {d.day}</p>
                                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {d.topics.map((t) => (
                                        <li key={t.id} className="px-4 py-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="min-w-0 text-[14px] font-medium text-neutral-900 dark:text-white">{t.title}</p>
                                                <span className="shrink-0 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                                    {[t.kind ? KIND[t.kind] : null, t.hasCoding ? 'Coding' : null].filter(Boolean).join(' · ')}
                                                </span>
                                            </div>
                                            {t.description && <p className="mt-1 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">{t.description}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>
        </div>
    )
}
