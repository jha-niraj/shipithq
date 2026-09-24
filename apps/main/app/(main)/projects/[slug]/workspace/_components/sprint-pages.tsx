'use client'

import { cn } from '@repo/ui/lib/utils'

/*
 * The shared frame for the workspace's page tabs. The sprint and final quizzes
 * live in `sprint-quiz.tsx` and the mock interviews in `sprint-mock.tsx`
 * (plan/project-workspace WS-12, WS-13, WS-14); this file keeps what they and
 * the Resources, Errors and Standup tabs have in common.
 *
 * Every page tab sits in one centred column (Niraj, 2026-09-24), so it stays
 * in the middle whether the preview and explorer are open or not. 896px, not
 * the 1280px first tried: the editor pane is narrower than 1280px at normal
 * widths, so that cap never engaged and the pages still ran edge to edge.
 */
export const PAGE_COLUMN = 'mx-auto w-full max-w-4xl px-6'

/** A board panel given a full page in the editor area, in the same centred column. */
export function FullPage({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className={cn(PAGE_COLUMN, 'pb-8 pt-4')}>
            {title && <h1 className="mb-4 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>}
            {children}
        </div>
    )
}
