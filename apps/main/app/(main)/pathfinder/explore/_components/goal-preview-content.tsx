'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Copy, Code2, Brain, CheckCircle2, User, BookOpen,
    ChevronRight, Sparkles, X, FileQuestion
} from 'lucide-react'
import { copyPathfinderGoal } from '@/actions/(main)/pathfinder'
import { useUserStore } from '@/app/store/useUserStore'
import { PATHFINDER_CATEGORIES } from '@/types/pathfinder'
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import toast from '@repo/ui/components/ui/sonner'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AnimatedIcon } from "@repo/ui/components/animated-icons"
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels"

interface SubGoal {
    id: string
    title: string
    description: string | null
    status: string
    hasCoding: boolean
    isAIGenerated?: boolean
}

interface GoalUser {
    id: string
    name: string | null
    username: string | null
    image: string | null
}

interface Goal {
    id: string
    title: string
    slug: string
    category: string
    level: string
    overview: string | null
    totalSubGoals: number
    completedSubGoals: number
    creditPrice: number | null
    subGoals: SubGoal[]
    user: GoalUser
}

interface GoalPreviewContentProps {
    goal: Goal
}

export function GoalPreviewContent({ goal }: GoalPreviewContentProps) {
    const router = useRouter()
    const { credits } = useUserStore()
    const [copying, setCopying] = useState(false)
    // The selected topic opens a DETAIL PANEL on the right rather than expanding
    // in place. In-place expansion was the previous attempt and it read as broken
    // for a simple reason: `description` is null or a single line on most topics,
    // so clicking produced no visible change at all. A panel always responds -
    // when there is nothing to show it says so, which is information rather than
    // silence.
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selected = goal.subGoals?.find((sg) => sg.id === selectedId) ?? null

    // The sidebar no longer collapses (it is always expanded since 2026-09-22), so
    // opening a topic no longer borrows width from it.
    const openTopic = useCallback((id: string) => {
        setSelectedId(id)
    }, [])

    const closeTopic = useCallback(() => {
        setSelectedId(null)
    }, [])

    const category = PATHFINDER_CATEGORIES[goal.category as keyof typeof PATHFINDER_CATEGORIES]
    const price = goal.creditPrice ?? 0
    const canAfford = (credits ?? 0) >= price
    const isPaid = price > 0
    const progressPercent = goal.totalSubGoals > 0
        ? Math.round((goal.completedSubGoals / goal.totalSubGoals) * 100)
        : 0

    const handleCopy = async () => {
        setCopying(true)
        try {
            const result = await copyPathfinderGoal(goal.id)
            if (result.success && result.slug) {
                toast.success('Goal copied! Redirecting...')
                router.push(`/pathfinder/${result.slug}`)
            } else {
                toast.error(result.error || 'Failed to copy goal')
                if (result.code === 'INSUFFICIENT_CREDITS') {
                    toast.error(`You need ${result.required} credits. You have ${result.available}.`)
                }
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setCopying(false)
        }
    }

    return (
        // A resizable two-pane split, not a fixed 360px aside.
        //
        // The panel was `max-w-[360px]`, which on a topic with a real description
        // wrapped the text every three or four words - and the width was not the
        // reader's to change. It now defaults to 34% (roughly 460px on a 1512px
        // screen with the app sidebar collapsed) and is draggable between 24% and
        // 55%.
        //
        // v4 of react-resizable-panels takes `orientation` rather than `direction`,
        // sizes as percentage STRINGS, and has no `order` prop - the same API the
        // practice workspace already uses. See JB-6.
        <PanelGroup orientation="horizontal" id="pathfinder-explore" className="flex h-full min-h-0 w-full overflow-hidden">
        <Panel id="content" minSize="35%" className="flex min-w-0 flex-col">
        <ScrollArea reflow className="h-full min-w-0 min-h-0 flex-1">
            {/* Full width. This was `max-w-3xl mx-auto`, which centred a 768px column
                inside a pane that is already the narrower half of a two-pane
                layout - so the study plan sat in a thin ribbon with dead space on
                both sides while its own cards wrapped. The pane IS the measure. */}
            <div className="w-full p-6">
                {/* Hero Section */}
                <div className="mb-8">
                    <div className="flex items-start gap-4 mb-4">
                        {/* `motion="always"`: one hero icon on a page it owns, so
                            it animates on arrival rather than waiting for a hover
                            the user has no reason to try. */}
                        <div className={cn(
                            "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-neutral-900 dark:text-neutral-100",
                            category?.bg ?? "bg-neutral-100 dark:bg-neutral-800/30"
                        )}>
                            <AnimatedIcon name={category?.icon ?? "target"} size={30} motion="always" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                                {goal.title}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                                <span className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    {goal.user?.name || goal.user?.username || 'Unknown'}
                                </span>
                                <Badge variant="secondary" className="text-xs capitalize">
                                    {goal.level.toLowerCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                    {goal.category.replace('_', ' ').toLowerCase()}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {goal.overview && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                            {goal.overview}
                        </p>
                    )}

                    {/* Stats Row */}
                    <StatBand
                        cols={3}
                        className="mb-4"
                        items={[
                            { icon: BookOpen, label: 'Topics', value: goal.totalSubGoals },
                            { icon: CheckCircle2, label: 'Completed', value: goal.completedSubGoals },
                            { icon: Sparkles, label: 'Progress', value: `${progressPercent}%` },
                        ]}
                    />

                    {/* Progress Bar */}
                    {goal.totalSubGoals > 0 && (
                        <div className="mb-4">
                            <Progress value={progressPercent} className="h-1.5" />
                        </div>
                    )}

                    {/* CTA */}
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleCopy}
                            disabled={copying || (isPaid && !canAfford)}
                            size="lg"
                            className="gap-2"
                        >
                            {copying ? (
                                <InlineLoader size="sm" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            {isPaid ? `Copy for ${price} credits` : 'Copy to My Goals'}
                        </Button>
                        {isPaid && (
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                {canAfford
                                    ? `You have ${credits ?? 0} credits`
                                    : `Need ${price - (credits ?? 0)} more credits`}
                            </span>
                        )}
                    </div>
                </div>

                {/* Topics Grid */}
                {goal.subGoals && goal.subGoals.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                            Study Plan ({goal.subGoals.length} topics)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {goal.subGoals.map((sg, idx) => (
                                <button
                                    key={sg.id}
                                    type="button"
                                    onClick={() => openTopic(sg.id)}
                                    aria-pressed={selectedId === sg.id}
                                    className={cn(
                                        "group w-full cursor-pointer p-4 text-left rounded-xl border bg-white dark:bg-neutral-900/50 hover:shadow-sm transition-all",
                                        selectedId === sg.id
                                            ? "border-neutral-900 dark:border-neutral-100"
                                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white leading-snug">
                                                {sg.title}
                                            </p>
                                            {sg.description && (
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                                                    {sg.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-2.5">
                                                <Badge variant="secondary" className="text-xs h-5 gap-1 bg-neutral-50 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-100 border-0">
                                                    <Brain className="w-2.5 h-2.5" />
                                                    Quiz
                                                </Badge>
                                                {sg.hasCoding && (
                                                    <Badge variant="secondary" className="text-xs h-5 gap-1 bg-neutral-50 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-100 border-0">
                                                        <Code2 className="w-2.5 h-2.5" />
                                                        Coding
                                                    </Badge>
                                                )}
                                                {sg.isAIGenerated && (
                                                    <Badge variant="secondary" className="text-xs h-5 gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-0">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        AI
                                                    </Badge>
                                                )}
                                                {sg.status === 'COMPLETED' && (
                                                    <Badge variant="secondary" className="text-xs h-5 gap-1 bg-neutral-50 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-100 border-0">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        Done
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {/* Right, not down: it opens a panel beside the
                                            list, and a chevron that points down promises
                                            an accordion. */}
                                        <ChevronRight className={cn(
                                            "w-4 h-4 shrink-0 mt-1 transition-colors",
                                            selectedId === sg.id
                                                ? "text-neutral-900 dark:text-neutral-100"
                                                : "text-neutral-600 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-600"
                                        )} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {goal.subGoals && goal.subGoals.length === 0 && (
                    <div className="py-12 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                        <AnimatedIcon name="empty-search" size={40} motion="always" className="mx-auto mb-3 text-neutral-600 dark:text-neutral-500" />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">This goal has no topics yet.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        </Panel>

        {selected && (
            <>
            {/* The handle is 1px of border with an 9px transparent hit area either
                side - a 1px drag target is not a target. */}
            <PanelResizeHandle className="group relative w-px shrink-0 bg-neutral-200 outline-none dark:bg-neutral-800">
                <span className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
                <span className="absolute inset-y-0 left-0 w-px bg-transparent transition-colors group-hover:bg-neutral-400 group-data-[resize-handle-state=drag]:bg-neutral-900 dark:group-hover:bg-neutral-600 dark:group-data-[resize-handle-state=drag]:bg-white" />
            </PanelResizeHandle>
            <Panel
                id="topic"
                defaultSize="34%"
                minSize="24%"
                maxSize="55%"
                className="flex min-w-0 flex-col border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950"
            >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="min-w-0">
                        <p className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
                            Topic {(goal.subGoals?.findIndex((sg) => sg.id === selected.id) ?? 0) + 1} of {goal.subGoals?.length ?? 0}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                            {selected.title}
                        </h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeTopic}
                        aria-label="Close topic details"
                        className="h-7 w-7 shrink-0 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                    <div className="space-y-5 p-4">
                        <div>
                            <p className="mb-1.5 text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
                                Description
                            </p>
                            {selected.description ? (
                                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                                    {selected.description}
                                </p>
                            ) : (
                                <p className="text-sm italic text-neutral-500 dark:text-neutral-400">
                                    The author did not write a description for this topic.
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
                                What is included
                            </p>
                            <ul className="space-y-1.5">
                                <li className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                    <Brain className="h-3.5 w-3.5 shrink-0" /> Quiz
                                </li>
                                {selected.hasCoding && (
                                    <li className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                        <Code2 className="h-3.5 w-3.5 shrink-0" /> Coding challenge
                                    </li>
                                )}
                                {selected.isAIGenerated && (
                                    <li className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                        <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI generated
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Says plainly why the lesson body is not here, rather than
                            rendering an empty region the reader has to interpret.
                            This is a preview of someone else's goal: the quiz and
                            coding content is generated per learner, on copy. */}
                        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
                            <div className="flex items-start gap-2">
                                <FileQuestion className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                                <div>
                                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                        No lesson content to preview
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                                        Explanations, quizzes and coding challenges are generated for
                                        you when you add this goal. Until then only the outline above
                                        is available.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </Panel>
            </>
        )}
        </PanelGroup>
    )
}
