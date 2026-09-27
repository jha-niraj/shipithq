'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/components/ui/dialog'
import { Input } from '@repo/ui/components/ui/input'
import { Button } from '@repo/ui/components/ui/button'
import toast from '@repo/ui/components/ui/sonner'
import { deletePathfinderGroup, updatePathfinderGroup } from '@/actions/(main)/pathfinder'
import { usePathfinderStore, type PathfinderGroup } from '@/app/store/pathfinderStore'
import { GroupIcon } from './group-icon'

/** A group's heading on the dashboard, with Rename and Delete (plan/pathfinder PF-6). */
export function GroupHeader({ group, count }: { group: PathfinderGroup; count: number }) {
    const { updateGroup, removeGroup, goals, updateGoal } = usePathfinderStore()
    const [renaming, setRenaming] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [name, setName] = useState(group.name)
    const [pending, start] = useTransition()

    const rename = () => start(async () => {
        const next = name.trim()
        if (next.length < 1) return
        const r = await updatePathfinderGroup({ id: group.id, name: next })
        if (!r.success) { toast.error(r.error ?? 'Could not rename'); return }
        updateGroup(group.id, { name: next })
        setRenaming(false)
    })
    const remove = () => start(async () => {
        const r = await deletePathfinderGroup(group.id)
        if (!r.success) { toast.error(r.error ?? 'Could not delete the group'); return }
        for (const g of goals) if (g.groupId === group.id) updateGoal(g.id, { groupId: null })
        removeGroup(group.id)
        setDeleting(false)
        toast.success('Group deleted. Its goals are ungrouped.')
    })

    return (
        <div className="mb-3 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md text-neutral-900 dark:text-neutral-100" style={{ backgroundColor: `${group.color || '#525252'}20` }}>
                <GroupIcon value={group.emoji} size={13} />
            </span>
            <h2 className="min-w-0 truncate text-sm font-semibold text-neutral-900 dark:text-white">{group.name}</h2>
            <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{count}</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={`Actions for ${group.name}`} className="ml-1 flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                        <MoreHorizontal className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => { setName(group.name); setRenaming(true) }}><Pencil className="mr-2 size-3.5" />Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleting(true)} className="text-red-600 focus:text-red-600 dark:text-red-400"><Trash2 className="mr-2 size-3.5" />Delete group</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={renaming} onOpenChange={setRenaming}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Rename group</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); rename() }}>
                        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus aria-label="Group name" />
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setRenaming(false)}>Cancel</Button>
                            <Button type="submit" disabled={pending || !name.trim()}>Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleting} onOpenChange={setDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete the group "{group.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Only the group goes. Its {count} {count === 1 ? 'goal stays' : 'goals stay'}, ungrouped.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); remove() }} disabled={pending}>Delete group</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
