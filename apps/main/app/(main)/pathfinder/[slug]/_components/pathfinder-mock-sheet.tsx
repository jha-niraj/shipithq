'use client'

import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { useState } from 'react'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import { Mic, Play } from 'lucide-react'
import { createCustomMockVoice } from '@/actions/(main)/mockvoice/voice.action'
import { createMockVoiceSession } from '@/actions/(main)/mockvoice/session.action'
import { useRouter } from 'next/navigation'
import toast from '@repo/ui/components/ui/sonner'
import { getGoalSessions } from '@/actions/(main)/pathfinder/subgoals.action'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface SubGoal {
    id: string
    title: string
    aiResources?: { content?: string } | null
}

interface PathfinderMockSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    goalId: string
    goalTitle: string
    onSuccess?: (mockId: string) => void
}

export function PathfinderMockSheet({
    open,
    onOpenChange,
    goalId,
    goalTitle,
    onSuccess,
}: PathfinderMockSheetProps) {
    const router = useRouter()
    const [sessions, setSessions] = useState<{ id: string; date: Date; subGoals: SubGoal[] }[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)

    const loadSessions = async () => {
        if (!open) return
        setLoading(true)
        const result = await getGoalSessions(goalId)
        if (result.success && result.sessions) {
            setSessions(result.sessions as { id: string; date: Date; subGoals: SubGoal[] }[])
        }
        setLoading(false)
    }

    const handleOpen = (isOpen: boolean) => {
        onOpenChange(isOpen)
        if (isOpen) loadSessions()
        else setSelectedIds(new Set())
    }

    const toggleSubGoal = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAll = () => {
        const all = new Set<string>()
        sessions.forEach((s) => s.subGoals.forEach((sg) => all.add(sg.id)))
        setSelectedIds(all)
    }

    const handleStartMock = async () => {
        if (selectedIds.size === 0) {
            toast.error('Select at least one sub-goal')
            return
        }
        setCreating(true)
        try {
            const subGoals = sessions.flatMap((s) => s.subGoals).filter((sg) => selectedIds.has(sg.id))
            const knowledgeParts = subGoals.map((sg) => {
                const content = (sg as { aiResources?: { content?: string } }).aiResources?.content ?? sg.title
                return `${sg.title}: ${content.slice(0, 300)}${content.length > 300 ? '...' : ''}`
            })
            const knowledgeBase = knowledgeParts.join('\n\n')

            const result = await createCustomMockVoice({
                title: `Pathfinder: ${goalTitle}`,
                description: `Mock interview covering: ${subGoals.map((s) => s.title).join(', ')}`,
                category: 'TECHNICAL',
                level: 'INTERMEDIATE',
                duration: 15,
                questionsCount: 5,
                includeResume: false,
                isPublic: false,
                knowledgeBase,
            })

            if (!result.success || !result.mockId) {
                toast.error(result.error ?? 'Failed to create mock')
                return
            }

            const sessionResult = await createMockVoiceSession({
                mockId: result.mockId,
                mockType: 'custom',
                includesResume: false,
            })

            if (sessionResult.success && sessionResult.sessionId) {
                toast.success('Starting your mock interview...')
                onOpenChange(false)
                onSuccess?.(result.mockId)
                router.push(`/mock/voice/interview/${sessionResult.sessionId}`)
            } else {
                toast.success('Mock created! Start it from Mock interviews when ready.')
                onOpenChange(false)
                onSuccess?.(result.mockId)
                router.push('/mock')
            }
        } catch {
            toast.error('Failed to start mock interview')
        } finally {
            setCreating(false)
        }
    }

    const allSubGoals = sessions.flatMap((s) => s.subGoals)

    return (
        <Sheet open={open} onOpenChange={handleOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Mic className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                        Start Mock Interview
                    </SheetTitle>
                    <SheetDescription>
                        Select the sub-goals you want to practice. The AI will ask questions based on these topics.
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <InlineLoader size="lg" className="text-neutral-900 dark:text-neutral-100" />
                        </div>
                    ) : allSubGoals.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                            No sub-goals yet. Add learning tasks first.
                        </p>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={selectAll} className="w-full">
                                Select All
                            </Button>
                            <ScrollArea className="min-h-0 flex-1" viewportClassName="space-y-2 max-h-[300px]" reflow>
                                {sessions.map((sess) => (
                                    <div key={sess.id} className="space-y-2">
                                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                            {new Date(sess.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </p>
                                        {sess.subGoals.map((sg) => (
                                            <label
                                                key={sg.id}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={selectedIds.has(sg.id)}
                                                    onCheckedChange={() => toggleSubGoal(sg.id)}
                                                />
                                                <span className="text-sm font-medium flex-1">{sg.title}</span>
                                            </label>
                                        ))}
                                    </div>
                                ))}
                            </ScrollArea>
                        </>
                    )}
                    <Button
                        className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
                        onClick={handleStartMock}
                        disabled={creating || selectedIds.size === 0}
                    >
                        {creating ? (
                            <InlineLoader size="sm" className="mr-2" />
                        ) : (
                            <Play className="w-4 h-4 mr-2" />
                        )}
                        Start Mock Interview
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
