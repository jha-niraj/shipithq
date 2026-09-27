'use client'

import { useEffect, useState } from 'react'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit'
import { MarkdownRenderer } from '@/components/common/markdown-renderer'
import { getGoalNotes } from '@/actions/(main)/pathfinder/studio-link.action'

type Days = Awaited<ReturnType<typeof getGoalNotes>>['days']

/**
 * The Notes tab (plan/pathfinder PF-8): every topic's written explanation in plan
 * order, one long read with a contents list beside it. Editing stays in each topic's
 * Studio, in Today and Plan; this is for reading back.
 */
export function NotesReader({ goalId }: { goalId: string }) {
    const [days, setDays] = useState<Days | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let live = true
        getGoalNotes(goalId).then((r) => {
            if (!live) return
            if (r.success) setDays(r.days)
            else setError(r.error)
        })
        return () => { live = false }
    }, [goalId])

    if (error) return <p className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
    if (!days) return <NotesSkeleton />
    if (days.length === 0) return <p className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">No topics yet, so no notes.</p>

    const written = days.reduce((n, d) => n + d.topics.filter((t) => t.content).length, 0)
    const count = days.reduce((n, d) => n + d.topics.length, 0)

    return (
        <div className="flex h-full min-h-0">
            <nav className="hidden w-64 shrink-0 border-r border-neutral-200 lg:block dark:border-neutral-800" aria-label="Contents">
                <ScrollArea reflow className="h-full">
                    <div className="space-y-4 p-4">
                        <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{written} of {count} topics have notes</p>
                        {days.map((d) => (
                            <div key={d.day}>
                                <p className="font-mono text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Day {d.day}</p>
                                <ul className="mt-1 space-y-0.5">
                                    {d.topics.map((t) => (
                                        <li key={t.id}>
                                            <a href={`#note-${t.id}`} className="block truncate rounded-md px-2 py-1 text-[13px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">{t.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </nav>
            <ScrollArea reflow className="h-full min-w-0 flex-1">
                <article className="mx-auto w-full max-w-3xl px-page py-8">
                    {days.map((d) => (
                        <section key={d.day} className="mb-10">
                            <p className="mb-4 font-mono text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Day {d.day}</p>
                            {d.topics.map((t) => (
                                <div key={t.id} id={`note-${t.id}`} className="mb-10 scroll-mt-4">
                                    <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{t.title}</h2>
                                    {t.content
                                        ? <MarkdownRenderer content={t.content} className="mt-3" />
                                        : <p className="mt-2 text-sm italic text-neutral-500 dark:text-neutral-400">No notes yet. Open this topic in Today or Plan to write or generate them.</p>}
                                </div>
                            ))}
                        </section>
                    ))}
                </article>
            </ScrollArea>
        </div>
    )
}

function NotesSkeleton() {
    return (
        <div className="flex h-full">
            <ShimmerStyles />
            <div className="hidden w-64 shrink-0 space-y-2 border-r border-neutral-200 p-4 lg:block dark:border-neutral-800">
                {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} className="h-4 w-full" delay={i * 0.03} />)}
            </div>
            <div className="mx-auto w-full max-w-3xl space-y-3 px-page py-8">
                <Shimmer className="h-3 w-12" />
                <Shimmer className="h-6 w-2/3" delay={0.04} />
                {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-4 w-full" delay={0.06 + i * 0.03} />)}
            </div>
        </div>
    )
}
