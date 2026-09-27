'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pause, Play, FolderInput, Globe, Lock, Trash2 } from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import { deletePathfinderGoal, setGoalPublic, updateGoalStatus } from '@/actions/(main)/pathfinder'
import { usePathfinderStore, type PathfinderGoal } from '@/app/store/pathfinderStore'
import { PATHFINDER_CATEGORIES } from '@/types/pathfinder'

/**
 * One goal on the dashboard (plan/pathfinder PF-6): progress at a glance, and a menu
 * to pause or resume it, move it to a group, share it, or delete it. The menu is
 * always visible, not only on hover, so it works on a phone.
 */

const STATUS: Record<string, string> = {
    ACTIVE: 'Active', VERIFICATION: 'Verifying', COMPLETED: 'Completed', FAILED: 'Retry', ABANDONED: 'Paused',
}

export function GoalCard({ goal, onMove }: { goal: PathfinderGoal; onMove: () => void }) {
    const { updateGoal, removeGoal } = usePathfinderStore()
    const [confirm, setConfirm] = useState(false)
    const [pending, start] = useTransition()
    const cat = PATHFINDER_CATEGORIES[goal.category]
    const pct = goal.totalSubGoals > 0 ? Math.round((goal.completedSubGoals / goal.totalSubGoals) * 100) : 0
    const paused = goal.status === 'ABANDONED'

    const setStatus = (status: 'ACTIVE' | 'ABANDONED') => start(async () => {
        const r = await updateGoalStatus(goal.id, status)
        if (!r.success) { toast.error(r.error ?? 'Could not update the goal'); return }
        updateGoal(goal.id, { status })
        toast.success(status === 'ABANDONED' ? 'Paused' : 'Resumed')
    })
    const share = (on: boolean) => start(async () => {
        const r = await setGoalPublic(goal.id, on)
        if (!r.success) { toast.error(r.error); return }
        updateGoal(goal.id, { isPublic: on })
        toast.success(on ? 'Shared in Explore' : 'No longer shared')
    })
    const remove = () => start(async () => {
        const r = await deletePathfinderGoal(goal.id)
        if (!r.success) { toast.error(r.error ?? 'Could not delete the goal'); return }
        removeGoal(goal.id)
        setConfirm(false)
        toast.success('Goal deleted')
    })

    return (
        <div className={cn('group relative rounded-2xl border border-neutral-200 bg-white transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600', paused && 'opacity-70', pending && 'pointer-events-none opacity-60')}>
            <Link href={`/pathfinder/${goal.slug}`} className="block p-4">
                <div className="flex items-start gap-3 pr-8">
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-900 dark:text-neutral-100', cat?.bg ?? 'bg-neutral-100 dark:bg-neutral-800')}>
                        <AnimatedIcon name={cat?.icon ?? 'target'} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-neutral-900 dark:text-white">{goal.title}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                            {STATUS[goal.status] ?? goal.status} · {goal.level.toLowerCase()}{goal.isPublic ? ' · shared' : ''}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-[12px] text-neutral-500 dark:text-neutral-400">
                    <span>{goal.completedSubGoals} of {goal.totalSubGoals} topics</span>
                    <span className="tabular-nums text-neutral-900 dark:text-white">{pct}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} />
                </div>
            </Link>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={`Actions for ${goal.title}`} className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                        <MoreHorizontal className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    {goal.status === 'ACTIVE' && <DropdownMenuItem onClick={() => setStatus('ABANDONED')}><Pause className="mr-2 size-3.5" />Pause</DropdownMenuItem>}
                    {paused && <DropdownMenuItem onClick={() => setStatus('ACTIVE')}><Play className="mr-2 size-3.5" />Resume</DropdownMenuItem>}
                    <DropdownMenuItem onClick={onMove}><FolderInput className="mr-2 size-3.5" />Move to group</DropdownMenuItem>
                    {goal.isPublic
                        ? <DropdownMenuItem onClick={() => share(false)}><Lock className="mr-2 size-3.5" />Stop sharing</DropdownMenuItem>
                        : <DropdownMenuItem onClick={() => share(true)}><Globe className="mr-2 size-3.5" />Share in Explore</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfirm(true)} className="text-red-600 focus:text-red-600 dark:text-red-400"><Trash2 className="mr-2 size-3.5" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirm} onOpenChange={setConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{goal.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Its topics, notes links, coding attempts and verification go with it. This cannot be undone. Copies other people made of it are theirs and stay.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); remove() }} className="bg-red-600 text-white hover:bg-red-700">Delete goal</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
