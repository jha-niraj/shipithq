'use client'

import {
    Tabs, TabsList, TabsTrigger, TabsContent
} from '@repo/ui/components/ui/tabs'
import { Code2, CheckCircle2, StickyNote } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { PathfinderNotesTab } from './pathfinder-notes-tab'
import type { SubGoalForTabs } from './pathfinder-notes-tab'

interface SubGoalContentTabsProps {
    subGoalId: string
    subGoalTitle: string
    goalId: string
    hasCoding: boolean
    codingCompleted: boolean
    codingPassed: boolean
    studioId: string | null
    onCodingComplete: () => void
    SubGoalCodingComponent: React.ComponentType<{ subGoal: SubGoalForTabs; onComplete: () => void }>
    subGoal: SubGoalForTabs
}

export function SubGoalContentTabs({
    subGoalId,
    subGoalTitle,
    goalId,
    hasCoding,
    codingCompleted,
    codingPassed,
    studioId,
    onCodingComplete,
    SubGoalCodingComponent,
    subGoal,
}: SubGoalContentTabsProps) {
    return (
        <Tabs defaultValue="notes" className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {/* The bar only earns its space when there is something to switch
                BETWEEN. "Coding" is conditional on `hasCoding`, so a sub-goal
                without a coding challenge rendered a full-width bar containing
                exactly one tab - a control that cannot do anything, sitting
                directly above the Studio header it duplicates.
                Hidden at one tab, shown at two. Not deleted: removing it would
                take the Coding tab with it wherever `hasCoding` is true. */}
            {hasCoding && (
                <div className="mx-4 mt-4 flex-shrink-0">
                    <TabsList size="sm" fit>
                        <TabsTrigger value="notes" icon={<StickyNote />}>Notes</TabsTrigger>
                        <TabsTrigger value="coding" icon={<Code2 />}>
                            Coding
                            {
                                codingCompleted && (
                                    <CheckCircle2
                                        className={cn(
                                            'ml-1 w-3 h-3',
                                            codingPassed ? 'text-neutral-900 dark:text-neutral-100' : 'text-red-500'
                                        )}
                                    />
                                )
                            }
                        </TabsTrigger>
                    </TabsList>
                </div>
            )}

            <TabsContent value="notes" className="m-0 flex min-h-0 flex-1 overflow-hidden">
                <PathfinderNotesTab
                    subGoalId={subGoalId}
                    subGoalTitle={subGoalTitle}
                    goalId={goalId}
                    studioId={studioId}
                />
            </TabsContent>

            {
                hasCoding && (
                    <TabsContent value="coding" className="m-0 flex min-h-0 flex-1 overflow-hidden p-4">
                        <SubGoalCodingComponent subGoal={subGoal} onComplete={onCodingComplete} />
                    </TabsContent>
                )
            }
        </Tabs>
    )
}
