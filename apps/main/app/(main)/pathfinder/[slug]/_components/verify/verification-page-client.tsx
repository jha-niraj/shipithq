'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@repo/ui/components/ui/button'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@repo/ui/components/ui/sheet'
import {
    Target, ArrowLeft, Brain, Code, Mic, Wrench, Trophy,
    Sparkles, Coins, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { VerificationContent } from './verification-content'
import { startVerificationGeneration, getVerificationJobStatus } from '@/actions/(main)/workers/verificationworker.action'
import { usePathfinderStore } from '@/app/store/pathfinderStore'
import { PATHFINDER_CREDITS } from '@/lib/constants/pricing'
import {
    PathfinderCategory, PathfinderLevel, VerificationSectionStatus
} from '@repo/db'
import type { VerificationAIPlan } from '@/types/pathfinder'
import toast from '@repo/ui/components/ui/sonner'
import { useRouter } from 'next/navigation'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AnimatedIcon } from "@repo/ui/components/animated-icons"

interface Goal {
    id: string
    title: string
    slug?: string
    category: PathfinderCategory
    level: PathfinderLevel
}

interface Verification {
    id: string
    generatedPlan?: unknown
    mockInterviewId?: string | null
    quizStatus: VerificationSectionStatus
    codingStatus: VerificationSectionStatus
    mockStatus: VerificationSectionStatus
    projectStatus: VerificationSectionStatus
    quizScore: number | null
    codingScore: number | null
    mockScore: number | null
    projectComplete: boolean
    quizAttempts: number
    codingAttempts: number
    mockAttempts: number
    overallScore: number | null
    passed: boolean
}

interface VerificationPageClientProps {
    goal: Goal
    verification: Verification | null
}

export function VerificationPageClient({ goal: initialGoal, verification }: VerificationPageClientProps) {
    const setVerificationAIPlan = usePathfinderStore((s) => s.setVerificationAIPlan)
    const storedPlan = usePathfinderStore((s) => s.verificationAIPlan[initialGoal.id])
    const router = useRouter()
    const [generateSheetOpen, setGenerateSheetOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    // Surfaced so the user can see which stage is running during a job that
    // legitimately takes over a minute, rather than an unmoving spinner.
    const [progress, setProgress] = useState(0)
    const [phaseLabel, setPhaseLabel] = useState<string | undefined>()

    const aiPlan = (storedPlan ?? verification?.generatedPlan) as VerificationAIPlan | null
    const hasQuestions = Boolean(aiPlan?.quizQuestions?.length ?? 0)

    const handleOpenSheet = () => setGenerateSheetOpen(true)

    // The generation runs on a Durable Object, so this only starts the job and
    // then watches it. Closing the tab no longer loses the run - the worker
    // finishes regardless and the plan is on the verification row when the user
    // comes back.
    const handleGenerate = async () => {
        setIsGenerating(true)
        setProgress(0)
        setPhaseLabel(undefined)
        try {
            const started = await startVerificationGeneration(initialGoal.id)
            if (!started.success || !started.jobId) {
                if (started.code === 'INSUFFICIENT_CREDITS') {
                    toast.error(`Insufficient credits. Need ${PATHFINDER_CREDITS.verificationFee} credits.`)
                } else {
                    toast.error(started.error ?? 'Failed to start generation')
                }
                setIsGenerating(false)
                return
            }

            const jobId = started.jobId
            // Poll until terminal. The action settles or releases the credit hold
            // the first time it sees a terminal status, so a refund does not depend
            // on this loop reaching a particular branch.
            for (;;) {
                await new Promise((r) => setTimeout(r, 2000))
                const s = await getVerificationJobStatus(jobId)
                if (!s.success) {
                    toast.error(s.error ?? 'Lost track of the generation')
                    break
                }
                setProgress(s.progress ?? 0)
                setPhaseLabel(s.phaseLabel)
                if (!s.done) continue

                if (s.status === 'completed') {
                    toast.success('Verification questions ready!')
                    setGenerateSheetOpen(false)
                    // The worker wrote the plan to the verification row; refetch
                    // rather than trusting a client copy of it.
                    router.refresh()
                } else {
                    toast.error(s.error ?? 'Generation failed')
                }
                break
            }
        } catch {
            toast.error('Failed to generate questions')
        } finally {
            setIsGenerating(false)
        }
    }

    if (hasQuestions) {
        return (
            <VerificationContent
                goal={initialGoal}
                verification={verification}
                aiPlan={aiPlan}
                mockInterviewId={verification?.mockInterviewId ?? null}
            />
        )
    }

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-6 py-4">
                    <Link
                        href={`/pathfinder/${initialGoal.slug ?? initialGoal.id}`}
                        className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Goal
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                                Verify this Goal
                            </h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{initialGoal.title}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-lg text-center"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                            <AnimatedIcon name="trophy" size={40} motion="always" className="text-neutral-900 dark:text-neutral-100" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                            Ready to Verify Your Knowledge?
                        </h2>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                            We&apos;ll generate personalized quiz and coding questions based on what you&apos;ve learned.
                            Your practice tasks and progress will help create relevant verification content.
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-left mb-8">
                            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                                <Brain className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                <span className="text-sm">20-25 Quiz Questions</span>
                            </div>
                            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                                <Code className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                <span className="text-sm">3-8 Coding Challenges</span>
                            </div>
                            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                                <Mic className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                <span className="text-sm">Mock Interview</span>
                            </div>
                            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                                <Wrench className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                <span className="text-sm">Project Verification</span>
                            </div>
                        </div>
                        <Button
                            size="lg"
                            className="gap-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
                            onClick={handleOpenSheet}
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate Verification Questions
                        </Button>
                    </motion.div>
                </div>
            </div>
            <Sheet
                open={generateSheetOpen}
                onOpenChange={(open) => !isGenerating && setGenerateSheetOpen(open)}
            >
                <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-5xl">
                    {isGenerating ? (
                        <>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <InlineLoader size="md" className="text-neutral-600 dark:text-neutral-400" />
                                    Generating Verification Questions
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col items-center justify-center py-16">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    className="w-16 h-16 rounded-full border-2 border-neutral-200 dark:border-neutral-700 border-t-neutral-600 mb-4"
                                />
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center max-w-sm">
                                    {phaseLabel ?? 'Creating personalized quiz and coding questions based on your learning progress.'}
                                </p>

                                {/* Real progress from the worker, not a fake timer. */}
                                <div className="mt-5 w-full max-w-sm">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                        <div
                                            className="h-full rounded-full bg-neutral-900 transition-all duration-500 dark:bg-white"
                                            style={{ width: `${Math.max(5, progress)}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                                        {progress}%
                                    </p>
                                </div>

                                {/* The main benefit of moving this to a worker, said plainly:
                                    the run no longer depends on this tab staying open. */}
                                <p className="mt-5 max-w-sm text-center text-xs text-neutral-600 dark:text-neutral-400">
                                    This runs on our servers - you can close this tab and come back.
                                    It usually takes 30&ndash;60 seconds.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                                    Verification Setup
                                </SheetTitle>
                                <SheetDescription>
                                    Review the cost and rewards before generating your verification content.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-6">
                                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Coins className="w-4 h-4" />
                                        Cost
                                    </h4>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        <span className="font-semibold text-neutral-900 dark:text-white">
                                            {PATHFINDER_CREDITS.verificationFee} credits
                                        </span>{' '}
                                        will be charged when you generate. This covers AI-generated quiz questions,
                                        coding challenges, and mock interview setup.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <ArrowRight className="w-4 h-4" />
                                        Refund on Score
                                    </h4>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        When you complete verification, you get credits back based on your score:
                                    </p>
                                    <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                                        <li>• 100% score → Full refund ({PATHFINDER_CREDITS.verificationFee} credits)</li>
                                        <li>• 70% score → 70% refund (14 credits)</li>
                                        <li>• 50% score → 50% refund (10 credits)</li>
                                    </ul>
                                </div>
                                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">What you&apos;ll get</h4>
                                    <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <li className="flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                            20-25 personalized quiz questions
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Code className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                            3-8 coding challenges
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Mic className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                            Mock interview setup
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                            Project verification (if applicable)
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                                <Button
                                    size="lg"
                                    className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate ({PATHFINDER_CREDITS.verificationFee} credits)
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </>
    )
}