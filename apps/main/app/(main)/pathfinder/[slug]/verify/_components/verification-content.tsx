'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from '@repo/ui/components/ui/tabs'
import {
    Target, ArrowLeft, CheckCircle2, XCircle, Lock, Brain, Code,
    Mic, Wrench, Trophy
} from 'lucide-react'
import Link from 'next/link'
import {
    PathfinderCategory, PathfinderLevel, VerificationSectionStatus
} from '@repo/db'
import { QuizVerification } from './quiz-verification'
import { CodingVerification } from './coding-verification'
import { MockVerification } from './mock-verification'
import { ProjectVerification } from './project-verification'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AnimatedIcon } from "@repo/ui/components/animated-icons"

interface AIPlan {
    quizQuestions?: {
        id: string
        question: string
        options: string[]
        correctAnswer: number
        explanation: string
        difficulty: string
        category: string
        codeSnippet?: string | null
    }[]
    codingQuestions?: {
        id: string
        title: string
        description: string
        difficulty: string
        category: string
        constraints: string[]
        examples: { input: string; output: string; explanation?: string }[]
        hints: string[]
        starterCode: { javascript: string; python: string }
        solution: { javascript: string; python: string; explanation: string; timeComplexity: string; spaceComplexity: string }
        testCases: { input: string; expectedOutput: string; isHidden: boolean }[]
    }[]
    mockInterview?: {
        title: string
        description: string
        duration: number
        questionsCount: number
        knowledgeBase: string
    }
    minorProject?: {
        title: string
        description: string
    } | null
    majorProject?: {
        title: string
        description: string
    } | null
}

interface Verification {
    id: string
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

interface Goal {
    id: string
    title: string
    category: PathfinderCategory
    level: PathfinderLevel
}

interface VerificationContentProps {
    goal: Goal
    verification: Verification | null
    aiPlan?: AIPlan | null
    mockInterviewId?: string | null
}

const statusIcons: Record<VerificationSectionStatus, React.ReactNode> = {
    LOCKED: <Lock className="w-4 h-4" />,
    PENDING: <div className="w-4 h-4 rounded-full border-2 border-current" />,
    IN_PROGRESS: <InlineLoader size="sm" />,
    COMPLETED: <CheckCircle2 className="w-4 h-4" />,
    FAILED: <XCircle className="w-4 h-4" />,
}

const statusColors: Record<VerificationSectionStatus, string> = {
    LOCKED: 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800',
    PENDING: 'text-neutral-800 bg-neutral-100 dark:bg-neutral-800/30',
    IN_PROGRESS: 'text-neutral-800 bg-neutral-100 dark:bg-neutral-800/30',
    COMPLETED: 'text-neutral-800 bg-neutral-100 dark:bg-neutral-800/30',
    FAILED: 'text-red-600 bg-red-100 dark:bg-red-900/30',
}

function SectionTab({
    icon,
    label,
    status,
    score
}: {
    icon: React.ReactNode
    label: string
    status: VerificationSectionStatus
    score?: number | null
}) {
    return (
        <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${statusColors[status]}`}>
                {statusIcons[status]}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                </div>
                {
                    score !== null && score !== undefined && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{score}%</span>
                    )
                }
            </div>
        </div>
    )
}

function CompletionScreen({ verification }: { verification: Verification }) {
    const passed = verification.passed
    const score = verification.overallScore || 0

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center justify-center"
        >
            <div className="text-center max-w-md">
                <div className={`w-24 h-24 mx-auto rounded-full ${passed ? 'bg-neutral-900' : 'bg-red-500'} flex items-center justify-center mb-6`}>
                    {
                        passed ? (
                            <AnimatedIcon name="trophy" size={48} motion="always" className="text-white" />
                        ) : (
                            <XCircle className="w-12 h-12 text-white" />
                        )
                    }
                </div>
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                    {passed ? 'Congratulations!' : 'Keep Practicing'}
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    {
                        passed
                            ? 'You have successfully completed all verification sections.'
                            : 'You need to pass all sections to complete this goal.'
                    }
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Overall Score:</span>
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">{score}%</span>
                </div>
            </div>
        </motion.div>
    )
}

export function VerificationContent({ goal, verification, aiPlan: aiPlanProp, mockInterviewId }: VerificationContentProps) {
    const aiPlan = aiPlanProp ?? null
    const hasProject = !!(aiPlan?.minorProject || aiPlan?.majorProject)

    // Determine which tab should be active based on status
    const getDefaultTab = () => {
        if (!verification) return 'quiz'
        if (verification.quizStatus !== 'COMPLETED') return 'quiz'
        if (verification.codingStatus !== 'COMPLETED') return 'coding'
        if (verification.mockStatus !== 'COMPLETED') return 'mock'
        if (hasProject && verification.projectStatus !== 'COMPLETED') return 'project'
        return 'quiz'
    }

    const [activeTab, setActiveTab] = useState(getDefaultTab())

    // If verification is complete, show completion screen
    if (verification?.passed) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <VerificationHeader goal={goal} verification={verification} />
                <CompletionScreen verification={verification} />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <VerificationHeader goal={goal} verification={verification} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 pt-3">
                        <TabsList variant="segmented" size="sm" fit>
                            <TabsTrigger
                                value="quiz">
                                <SectionTab
                                    icon={<Brain className="w-4 h-4" />}
                                    label="Quiz"
                                    status={verification?.quizStatus || 'PENDING'}
                                    score={verification?.quizScore}
                                />
                            </TabsTrigger>
                            <TabsTrigger
                                value="coding">
                                <SectionTab
                                    icon={<Code className="w-4 h-4" />}
                                    label="Coding"
                                    status={verification?.codingStatus || 'LOCKED'}
                                    score={verification?.codingScore}
                                />
                            </TabsTrigger>
                            <TabsTrigger
                                value="mock">
                                <SectionTab
                                    icon={<Mic className="w-4 h-4" />}
                                    label="Mock Interview"
                                    status={verification?.mockStatus || 'LOCKED'}
                                    score={verification?.mockScore}
                                />
                            </TabsTrigger>
                            {
                                hasProject && (
                                    <TabsTrigger
                                        value="project">
                                        <SectionTab
                                            icon={<Wrench className="w-4 h-4" />}
                                            label="Project"
                                            status={verification?.projectStatus || 'LOCKED'}
                                        />
                                    </TabsTrigger>
                                )
                            }
                        </TabsList>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <TabsContent value="quiz" className="h-full m-0">
                            <QuizVerification
                                goalId={goal.id}
                                questions={aiPlan?.quizQuestions || []}
                                status={verification?.quizStatus || 'PENDING'}
                                score={verification?.quizScore ?? null}
                                attempts={verification?.quizAttempts || 0}
                            />
                        </TabsContent>
                        <TabsContent value="coding" className="h-full m-0">
                            <CodingVerification
                                goalId={goal.id}
                                questions={aiPlan?.codingQuestions || []}
                                status={verification?.codingStatus || 'LOCKED'}
                                score={verification?.codingScore ?? null}
                            />
                        </TabsContent>
                        <TabsContent value="mock" className="h-full m-0">
                            <MockVerification
                                mockInterviewId={mockInterviewId ?? null}
                                mockConfig={aiPlan?.mockInterview}
                                status={verification?.mockStatus || 'LOCKED'}
                                score={verification?.mockScore ?? null}
                                attempts={verification?.mockAttempts || 0}
                            />
                        </TabsContent>
                        {
                            hasProject && (
                                <TabsContent value="project" className="h-full m-0">
                                    <ProjectVerification
                                        goalId={goal.id}
                                        minorProject={aiPlan?.minorProject}
                                        majorProject={aiPlan?.majorProject}
                                        status={verification?.projectStatus || 'LOCKED'}
                                        complete={verification?.projectComplete || false}
                                    />
                                </TabsContent>
                            )
                        }
                    </div>
                </Tabs>
            </div>
        </div>
    )
}

function VerificationHeader({ goal, verification }: { goal: Goal; verification: Verification | null }) {
    // Calculate overall progress
    const sections = [
        verification?.quizStatus === 'COMPLETED',
        verification?.codingStatus === 'COMPLETED',
        verification?.mockStatus === 'COMPLETED',
    ]
    const completedSections = sections.filter(Boolean).length
    const totalSections = sections.length
    const progress = Math.round((completedSections / totalSections) * 100)

    return (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-6 py-4">
            <Link href={`/pathfinder/${(goal as { slug?: string }).slug ?? goal.id}`} className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4" />
                Back to Goal
            </Link>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
                        <Target className="w-6 h-6 text-white dark:text-neutral-900" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                            Skill Verification
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{goal.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">Progress</div>
                        <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {completedSections}/{totalSections} sections
                        </div>
                    </div>
                    <div className="w-32">
                        <Progress value={progress} className="h-3" />
                    </div>
                </div>
            </div>
        </div>
    )
}