'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@repo/ui/components/ui/switch'
import toast from '@repo/ui/components/ui/sonner'
import { setGoalPublic } from '@/actions/(main)/pathfinder'

/** "Shared" switch for a goal's header (plan/pathfinder PF-4): free, instant, reversible. */
export function ShareToggle({ goalId, initial }: { goalId: string; initial: boolean }) {
    const [on, setOn] = useState(initial)
    const [pending, start] = useTransition()
    const change = (next: boolean) => {
        setOn(next)
        start(async () => {
            const r = await setGoalPublic(goalId, next)
            if (!r.success) { setOn(!next); toast.error(r.error); return }
            toast.success(next ? 'Shared in Explore. Anyone can copy it.' : 'No longer shared.')
        })
    }
    return (
        <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:text-neutral-200" title="Share in Explore, free">
            Shared
            <Switch checked={on} disabled={pending} onCheckedChange={change} aria-label="Share in Explore" />
        </label>
    )
}
