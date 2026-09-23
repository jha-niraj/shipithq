'use client'

import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { useState } from 'react'
import { Sparkles, Clock, Target, Pencil } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { Textarea } from '@repo/ui/components/ui/textarea'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import { awaitBackgroundJob } from '@/hooks/use-background-job'
import {
    startSprintGeneration, addSprintToProject
} from '@/actions/(main)/projects/sprint-generation.action'
import { Label } from '@repo/ui/components/ui/label'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

const SUGGESTIONS = [
    'User authentication system',
    'Dashboard with analytics',
    'API integration',
    'Database models setup',
    'Payment integration',
    'File upload feature',
]

const DIFFICULTY_LABEL = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' } as const

// ============================================================================
// Types
// ============================================================================

interface GeneratedTask {
    title: string
    description: string[]
    successCriteria: string[]
    hints: string[]
    estimatedMinutes: number
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    category: string | null
    estimatedTime: string | null
    checkpoints: string[]
    relatedPages: string[]
    dependencies: string[]
    badges: string[]
    tags: string[]
    terminalCommand: string | null
    orderIndex: number
}

interface GeneratedSprint {
    name: string
    goal: string
    duration: string
    tasks: GeneratedTask[]
}

interface SprintGenerationSheetProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    isCreator: boolean
    onSprintAdded?: () => void
}

// ============================================================================
// Sprint Generation Sheet Component
// ============================================================================

export function SprintGenerationSheet({
    isOpen,
    onClose,
    projectId,
    isCreator,
    onSprintAdded
}: SprintGenerationSheetProps) {
    const [sprintDescription, setSprintDescription] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [generatedSprint, setGeneratedSprint] = useState<GeneratedSprint | null>(null)
    const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input')
    const [generationPhase, setGenerationPhase] = useState<string>('')
    const [generationProgress, setGenerationProgress] = useState(0)

    const handleGenerate = async () => {
        if (!sprintDescription.trim()) {
            toast.error('Please describe what you want to build')
            return
        }

        setIsGenerating(true)
        setGenerationPhase('')
        setGenerationProgress(0)
        setStep('generating')

        try {
            // Generation runs on the worker; this follows the job. The sprint is
            // still only a preview until the user adds it below.
            const started = await startSprintGeneration(projectId, sprintDescription.trim())

            if (!started.success || !started.jobId) {
                toast.error(started.error || 'Failed to generate sprint')
                setStep('input')
                return
            }

            const outcome = await awaitBackgroundJob<{ sprint?: GeneratedSprint }>(
                started.jobId,
                (progress, phaseLabel) => {
                    setGenerationProgress(progress)
                    if (phaseLabel) setGenerationPhase(phaseLabel)
                },
            )

            if (outcome.ok && outcome.result?.sprint) {
                setGeneratedSprint(outcome.result.sprint)
                setStep('preview')
                toast.success('Sprint generated! Review and add it to your project.')
            } else {
                toast.error(outcome.ok ? 'Failed to generate sprint' : outcome.error)
                setStep('input')
            }
        } catch (error: unknown) {
            console.error('Error generating sprint:', error)
            toast.error('Failed to generate sprint')
            setStep('input')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAddSprint = async () => {
        if (!generatedSprint) return

        setIsAdding(true)

        try {
            const result = await addSprintToProject(projectId, generatedSprint)

            if (result.success) {
                const message = isCreator
                    ? 'Sprint added to your project!'
                    : result.data?.isPersonal
                        ? 'Sprint added! Accept it to include in your progress.'
                        : 'Sprint added!'

                toast.success(message)
                onSprintAdded?.()
                handleClose()
            } else {
                toast.error(result.error || 'Failed to add sprint')
            }
        } catch (error: unknown) {
            console.error('Error adding sprint:', error)
            toast.error('Failed to add sprint')
        } finally {
            setIsAdding(false)
        }
    }

    const handleClose = () => {
        setSprintDescription('')
        setGeneratedSprint(null)
        setStep('input')
        onClose()
    }

    // Cmd/Ctrl+Enter, not bare Enter: this is a multi-line field, and Enter
    // alone started a generation when someone only wanted a new line.
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleGenerate()
        }
    }

    /*
     * The same layout as the project generate sheet (plan/projects PJ-16 item 7):
     * a compact header, a scrolling body, and a PINNED footer holding the one
     * action for the current step. `scroll={false}` because SheetContent
     * otherwise wraps everything, footer included, in its own scroller.
     *
     * What it was: the Generate button sat in the middle of the form, the
     * preview's Add/Regenerate row scrolled away with a nested 300px scroller,
     * "Regenerate" did not regenerate (it went back to the description, so it is
     * now called what it does), three difficulty colours were identical, and the
     * sheet never said what it costs. It costs nothing, and nothing is added to
     * the project until the preview is accepted - so the footer says that.
     */
    const subtitle = step === 'preview'
        ? 'Review it before it goes on the board.'
        : 'Say what it should deliver. The AI writes the tasks.'

    return (
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
            <SheetContent scroll={false} side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[720px]">
                <SheetHeader className="space-y-0 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-base">Generate a sprint</SheetTitle>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
                        </div>
                    </div>
                </SheetHeader>

                {
                    step === 'generating' ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
                            <div className="relative flex h-20 w-20 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-2 border-neutral-900/20 dark:border-white/20" />
                                <Sparkles className="h-7 w-7 text-neutral-900 dark:text-neutral-100" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Planning your sprint</h3>
                                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                    {generationPhase || 'Reading the project and breaking the work into tasks'}
                                </p>
                            </div>
                            <div className="w-full max-w-sm">
                                <Progress value={generationProgress} className="h-1.5" />
                                <div className="mt-2 flex justify-between font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                    <span>{generationProgress}%</span>
                                    <span>~30-60s</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="min-h-0 min-w-0 flex-1" reflow>
                            {
                                step === 'input' && (
                                    <div className="space-y-5 px-6 py-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="sprint-description" className="text-sm">What should this sprint deliver?</Label>
                                            <Textarea
                                                id="sprint-description"
                                                placeholder="e.g., Sign up and log in with email, verify the address, reset a forgotten password"
                                                value={sprintDescription}
                                                onChange={(e) => setSprintDescription(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                className="min-h-[120px] resize-none"
                                                autoFocus
                                            />
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                The more specific, the better the tasks. <kbd className="font-sans">Ctrl</kbd>/<kbd className="font-sans">⌘</kbd> + <kbd className="font-sans">Enter</kbd> to generate.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Or start from</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {
                                                    SUGGESTIONS.map((suggestion) => (
                                                        <button
                                                            key={suggestion}
                                                            type="button"
                                                            onClick={() => setSprintDescription(suggestion)}
                                                            className={cn(
                                                                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                                                                sprintDescription === suggestion
                                                                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                                                                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700'
                                                            )}
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                            {
                                step === 'preview' && generatedSprint && (
                                    <div className="space-y-5 px-6 py-5">
                                        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                                            <div className="flex items-start justify-between gap-3">
                                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{generatedSprint.name}</h3>
                                                {
                                                    generatedSprint.duration && (
                                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {generatedSprint.duration}
                                                        </span>
                                                    )
                                                }
                                            </div>
                                            <p className="mt-2 flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                                <Target className="mt-0.5 h-4 w-4 shrink-0" />
                                                {generatedSprint.goal}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">{generatedSprint.tasks.length} tasks</Label>
                                            <ol className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                                                {
                                                    generatedSprint.tasks.map((task, idx) => (
                                                        <li key={idx} className="flex gap-3 px-3 py-3">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xs font-medium tabular-nums text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                                                                {idx + 1}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{task.title}</p>
                                                                {
                                                                    task.description[0] && (
                                                                        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                                                                            {task.description[0]}
                                                                            {task.description.length > 1 && ` (+${task.description.length - 1} more steps)`}
                                                                        </p>
                                                                    )
                                                                }
                                                                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                                    {DIFFICULTY_LABEL[task.difficulty] ?? task.difficulty}
                                                                    {task.estimatedTime && ` · ${task.estimatedTime}`}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    ))
                                                }
                                            </ol>
                                        </div>
                                    </div>
                                )
                            }
                        </ScrollArea>
                    )
                }

                {
                    step !== 'generating' && (
                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
                            {
                                step === 'preview' ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setGeneratedSprint(null)
                                                setStep('input')
                                            }}
                                            disabled={isAdding}
                                            className="gap-1.5"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit description
                                        </Button>
                                        <Button onClick={handleAddSprint} disabled={isAdding} className="shrink-0">
                                            {isAdding ? <><InlineLoader size="sm" className="mr-1.5" /> Adding</> : (isCreator ? 'Add to project' : 'Add to my timeline')}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            Free. Nothing is added until you review it.
                                        </p>
                                        <Button onClick={handleGenerate} disabled={!sprintDescription.trim() || isGenerating} className="shrink-0 gap-1.5">
                                            <Sparkles className="h-4 w-4" />
                                            Generate sprint
                                        </Button>
                                    </>
                                )
                            }
                        </div>
                    )
                }
            </SheetContent>
        </Sheet>
    )
}
