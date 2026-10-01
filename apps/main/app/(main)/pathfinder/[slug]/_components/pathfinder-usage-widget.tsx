'use client'

import { useEffect } from 'react'
import {
    Coins, Zap, AlertTriangle
} from 'lucide-react'
import { getGoalUsageSummary } from '@/actions/(main)/pathfinder/usage.action'
import { usePathfinderStore } from '@/app/store/pathfinderStore'
import { useUserStore } from '@/app/store/useUserStore'
import { cn } from '@repo/ui/lib/utils'

interface PathfinderUsageWidgetProps {
    goalId: string
    className?: string
}

export function PathfinderUsageWidget({ goalId, className }: PathfinderUsageWidgetProps) {
    const { credits } = useUserStore()
    const storeUsage = usePathfinderStore((s) => s.getGoalUsage(goalId))
    const setGoalUsage = usePathfinderStore((s) => s.setGoalUsage)

    useEffect(() => {
        if (!goalId) return
        getGoalUsageSummary(goalId).then((summary) => {
            if (summary) setGoalUsage(goalId, summary)
        })
    }, [goalId, setGoalUsage])

    const usage = storeUsage
    const isBlocked = usage?.isBlocked ?? false

    return (
        <div
            className={cn(
                'flex h-8 shrink-0 items-center gap-2.5 rounded-lg border px-2.5 transition-colors',
                isBlocked
                    ? 'border-neutral-300 dark:border-neutral-300 bg-neutral-50 dark:bg-neutral-900/30'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900',
                className
            )}
        >
            <div className="flex items-center gap-2">
                <Coins className="size-3.5 text-neutral-900 dark:text-neutral-100" />
                <span className="whitespace-nowrap text-[13px] font-medium">{credits ?? 0} credits</span>
            </div>
            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-neutral-900 dark:text-neutral-100" />
                <span className="whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-400">
                    {usage?.pendingCredits ?? 0} pending
                </span>
            </div>
            {
                usage?.totalInputTokens !== undefined && usage.totalInputTokens > 0 && (
                    <>
                        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            ~{(usage.totalInputTokens + usage.totalOutputTokens).toLocaleString()} tokens
                        </span>
                    </>
                )
            }
            {
                isBlocked && (
                    <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-100">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">AI paused - add credits</span>
                    </div>
                )
            }
        </div>
    )
}