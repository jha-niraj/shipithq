'use client'

import { useState, useEffect } from 'react'
import {
    Book, Users, AlertTriangle
} from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import ResourcesList from '@/components/projects/resources-list'
import ErrorsTab from '@/components/projects/errors-tab'
import { getProjectResources } from '@/actions/(main)/projects/resources.action'
import { getProjectErrorStats } from '@/actions/(main)/projects/project-errors.action'
import { Suggestion } from '@/types/project'

interface ProjectAssistantButtonsProps {
    projectId: string
    projectSlug: string
    isCreator: boolean
    isEnrolled: boolean
    currentUserId?: string | null
}

export function ProjectAssistantButtons({
    projectId,
    projectSlug,
    isCreator,
    isEnrolled,
    currentUserId
}: ProjectAssistantButtonsProps) {
    const [resourcesOpen, setResourcesOpen] = useState(false)
    const [errorsOpen, setErrorsOpen] = useState(false)

    // Counts for badges
    const [resourcesCount, setResourcesCount] = useState(0)
    const [errorsCount, setErrorsCount] = useState(0)


    // Fetch counts on mount
    useEffect(() => {
        const fetchCounts = async () => {

            try {
                const [resourcesRes, errorsRes] = await Promise.all([
                    getProjectResources({ projectId }),
                    getProjectErrorStats(projectId)
                ])

                if (resourcesRes.success && resourcesRes.resources) {
                    setResourcesCount(resourcesRes.resources.length)
                }
                if (errorsRes.success && errorsRes.data) {
                    setErrorsCount(errorsRes.data.totalErrors || 0)
                }
            } catch (e) {
                console.error('Failed to fetch counts:', e)
            }
        }
        fetchCounts()
    }, [projectId])

    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResourcesOpen(true)}
                    className="relative gap-2"
                >
                    <Book className="w-4 h-4" />
                    <span className="hidden sm:inline">Resources</span>
                    {
                        resourcesCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold bg-neutral-800 text-white rounded-full px-1">
                                {resourcesCount}
                            </span>
                        )
                    }
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setErrorsOpen(true)}
                    className="relative gap-2"
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Errors</span>
                    {
                        errorsCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold bg-neutral-800 text-white rounded-full px-1">
                                {errorsCount}
                            </span>
                        )
                    }
                </Button>
            </div>
            <Sheet open={resourcesOpen} onOpenChange={setResourcesOpen}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
                    <div className="h-full flex flex-col">
                        {/* Body-size title: SheetTitle defaults to text-3xl (Niraj, 2026-09-24: "too big"). */}
                        <SheetHeader className="space-y-0.5 border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <Book className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                                Resources
                            </SheetTitle>
                            <SheetDescription className="text-xs">What people found useful while building this: videos, docs, articles.</SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="min-h-0 flex-1">
                            <div className="w-full px-5 py-4">
                                <ResourcesList
                                    projectId={projectId}
                                    currentUserId={currentUserId}
                                    isCreator={isCreator}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>
            <Sheet open={errorsOpen} onOpenChange={setErrorsOpen}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
                    <div className="h-full flex flex-col">
                        {/* Body-size title: SheetTitle defaults to text-3xl (Niraj, 2026-09-24: "too big"). */}
                        <SheetHeader className="space-y-0.5 border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <AlertTriangle className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                                Errors
                            </SheetTitle>
                            <SheetDescription className="text-xs">Pitfalls people hit on this project, and how they fixed them.</SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="min-h-0 flex-1">
                            <div className="w-full px-5 py-4">
                                <ErrorsTab
                                    projectId={projectId}
                                    isEnrolled={isEnrolled}
                                    isCreator={isCreator}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}