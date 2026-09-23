'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
    ArrowLeft, Sparkles, Clock, Code2, Brain, Trophy, CheckCircle2, Lock,
    Unlock, Play, Users, Target, Lightbulb, Layers, ListChecks,
    Coins, Zap
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card'
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { Progress } from '@repo/ui/components/ui/progress'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
    SheetFooter
} from '@repo/ui/components/ui/sheet'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@repo/ui/components/ui/tooltip'
import toast from '@repo/ui/components/ui/sonner'
import {
    startProject, submitProject
} from '@/actions/(main)/projects/project.action'
import {
    ProjectDetailsClientProps, ProjectV2Page, ProjectV2Sprint
} from '@/types/project'
import { EnrollmentDialog } from './enrollment-dialog'
import DailyStandupSheet from './daily-standup-sheet'
import { cn } from '@repo/ui/lib/utils'
import { MOCK_UNLOCK_PERCENT, QUIZ_UNLOCK_PERCENT, mockUnlocked, quizUnlocked } from '@/lib/projects/gates'
import { ENROLL_CREDIT_COST } from '@/lib/credits/pricing'
// `loading:` is not optional on a chunk this size. Without it the flowchart is a
// blank hole in the middle of the page while React Flow downloads
// (sweep 2026-09-23, loading P3).
const BlueprintFlowchart = dynamic(() => import('@/components/projects/blueprintflowchart'), {
    ssr: false,
    loading: () => (
        <div className="flex h-72 items-center justify-center rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <InlineLoader size="lg" label="Drawing the blueprint" />
        </div>
    ),
})

// New extracted components
import { ProjectAssistantButtons } from './project-assistant-buttons'
import { PageOverviewCard } from './page-overview-card'
import { SetupGuideTab } from './setup-guide-tab'
// Team Members components removed





import type { TaskItem } from '@/types/project'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

function MilestoneTracker({ progressPercentage }: { progressPercentage: number, includeAssessment?: boolean }) {
    const milestones = [
        { threshold: 0, label: 'Start', icon: Play, unlocked: true },
        { threshold: 50, label: 'Quiz Available', icon: Brain, unlocked: progressPercentage >= 50 },
        { threshold: 75, label: 'Mock Interview', icon: Sparkles, unlocked: progressPercentage >= 75 },
        { threshold: 100, label: 'Complete', icon: Trophy, unlocked: progressPercentage >= 100 },
    ]

    return (
        <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Milestones</h3>
            <div className="relative">
                <div className="absolute top-5 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full">
                    <motion.div
                        className="h-full bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
                <div className="relative flex justify-between">
                    {
                        milestones.map((milestone, index) => {
                            const Icon = milestone.icon
                            return (
                                <TooltipProvider key={index}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex flex-col items-center">
                                                <div className={cn(
                                                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                                    milestone.unlocked
                                                        ? 'bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-800 text-white shadow-lg shadow-neutral-900/30'
                                                        : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                                                )}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className={cn(
                                                    'mt-2 text-xs font-medium',
                                                    milestone.unlocked ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-600'
                                                )}>
                                                    {milestone.label}
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {
                                                milestone.unlocked ? (
                                                    <p className="text-neutral-800 dark:text-neutral-200">✓ Unlocked</p>
                                                ) : (
                                                    <p>Complete {milestone.threshold}% to unlock</p>
                                                )
                                            }
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// Quick Actions Component
// ============================================================================
function QuickActions({
    projectSlug,
    progressPercentage,
    includeAssessment,
    isPublic,
    hasStarted,
}: {
    projectSlug: string
    progressPercentage: number
    includeAssessment: boolean
    isPublic: boolean
    hasStarted: boolean
}) {
    /*
     * A locked action is a DISABLED BUTTON, not a link to "#".
     *
     * Every one of these was wrapped in `<Link href='#'>` with a disabled Button
     * inside it, and a disabled button does not stop the anchor: clicking a locked
     * action navigated to `#` and jumped the page to the top. And the mock's link
     * pointed at `/projects/<slug>/mock`, a route that does not exist - the route
     * is `aimock` - so the one unlocked action here 404'd every time
     * (plan/projects, PJ-12).
     */
    const actions = [
        {
            key: "sprints",
            icon: ListChecks,
            label: "Sprints Board",
            lockedLabel: "Start to unlock",
            href: `/projects/${projectSlug}/sprints`,
            unlocked: hasStarted,
            shown: true,
        },
        {
            key: "quiz",
            icon: Brain,
            label: "Quiz",
            lockedLabel: `${QUIZ_UNLOCK_PERCENT}% to unlock`,
            href: `/projects/${projectSlug}/quiz`,
            unlocked: quizUnlocked(progressPercentage),
            shown: includeAssessment,
        },
        {
            key: "mock",
            icon: Sparkles,
            label: "Mock AI",
            lockedLabel: `${MOCK_UNLOCK_PERCENT}% to unlock`,
            href: `/projects/${projectSlug}/aimock`,
            unlocked: mockUnlocked(progressPercentage),
            shown: includeAssessment,
        },
    ].filter((a) => a.shown)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {actions.map(({ key, icon: Icon, label, lockedLabel, href, unlocked }) => {
                const body = (
                    <>
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{unlocked ? label : lockedLabel}</span>
                    </>
                )
                return unlocked ? (
                    <Button
                        key={key}
                        asChild
                        variant="outline"
                        className="w-full h-auto py-4 flex-col gap-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                    >
                        <Link href={href}>{body}</Link>
                    </Button>
                ) : (
                    <Button
                        key={key}
                        variant="outline"
                        disabled
                        aria-label={`${label} - ${lockedLabel}`}
                        className="w-full h-auto py-4 flex-col gap-1 opacity-50"
                    >
                        {body}
                    </Button>
                )
            })}
        </div>
    )
}

// ============================================================================
// Main Component
// ============================================================================


export default function ProjectDetailsClient({
    project,
    currentUserId,
    userCredits = 0,
    currentUser
}: ProjectDetailsClientProps) {
    const router = useRouter()

    const userProgress = project.progress?.[0]
    const hasStarted = userProgress && userProgress.status !== 'NOT_STARTED'
    const progressPercentage = userProgress?.progressPercentage || 0
    const isCompleted = userProgress?.status === 'COMPLETED'
    const isCreator = currentUserId === project?.creator?.id
    const isPublic = project.visibility === 'PUBLIC'
    const [starting, setStarting] = useState(false)
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
    const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
    // `shareDialogOpen` and its five Dialog imports went with the share feature
    // that was never built (approved by Niraj, 2026-09-23).
    const [submitting, setSubmitting] = useState(false)
    const [submitForm, setSubmitForm] = useState({
        githubUrl: '',
        liveUrl: '',
        notes: ''
    })

    const [standupSheetOpen, setStandupSheetOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')






    // Calculate total tasks from sprints (tasks are now nested in sprints)
    const totalTasks = useMemo(() => {
        if (!project.sprints) return 0
        return project.sprints.reduce((acc: number, sprint: ProjectV2Sprint) => {
            return acc + (sprint.tasks?.length || 0)
        }, 0)
    }, [project.sprints])

    // Transform tasks for components (tasks are now nested in sprints)
    const tasksWithStatus: TaskItem[] = useMemo(() => {
        if (!project.sprints || project.sprints.length === 0) return []

        // Access taskStatuses directly from userProgress
        const taskStatuses = userProgress?.taskStatuses || []

        // Flatten tasks from all sprints
        const allTasks: TaskItem[] = []
        let globalIndex = 0

        for (const sprint of project.sprints) {
            const sprintTasks = sprint.tasks || []
            for (const task of sprintTasks) {
                const statusEntry = taskStatuses.find((s) => s.taskId === task.id)
                allTasks.push({
                    id: task.id,
                    title: task.title,
                    description: task.description || [],
                    criteria: task.criteria || [],
                    hints: task.hints || [],
                    badges: task.badges || [],
                    tags: task.tags || [],
                    difficulty: task.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
                    terminalCommand: task.terminalCommand || null,
                    status: (statusEntry?.status || 'TO_DO') as 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED',
                    completedAt: statusEntry?.completedAt || null,
                    notes: statusEntry?.notes || null,
                    orderIndex: task.orderIndex ?? globalIndex,
                    // Add sprint info
                    sprintId: sprint.id,
                    sprintName: sprint.name,
                    sprintNumber: sprint.sprintNumber,
                    category: task.category,
                    estimatedTime: task.estimatedTime,
                    checkpoints: task.checkpoints || [],
                    relatedPages: task.relatedPages || [],
                    dependencies: task.dependencies || [],
                })
                globalIndex++
            }
        }

        return allTasks
    }, [project.sprints, userProgress])



    const handleStartProject = async () => {
        try {
            setStarting(true)
            const result = await startProject(project.id)

            if (result.success) {
                toast.success('Project started! Let\'s build something amazing! 🚀')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to start project')
            }
        } catch (error) {
            console.log("Error occurred while starting project: " + error);
            toast.error('Something went wrong')
        } finally {
            setStarting(false)
        }
    }

    const handleSubmitProject = async () => {
        if (!submitForm.githubUrl) {
            toast.error('GitHub URL is required')
            return
        }

        try {
            setSubmitting(true)
            const result = await submitProject(project.id, {
                githubUrl: submitForm.githubUrl,
                liveUrl: submitForm.liveUrl || undefined,
                notes: submitForm.notes || undefined,
            })

            if (result.success) {
                toast.success('🎉 Project submitted successfully!')
                setSubmitDialogOpen(false)
                setSubmitForm({ githubUrl: '', liveUrl: '', notes: '' })
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to submit project')
            }
        } catch (error) {
            console.log("Error occurred while submitting project: " + error);
            toast.error('Failed to submit project')
        } finally {
            setSubmitting(false)
        }
    }




    // All three arms were the identical string, so the map never varied. One
    // token, and it carries a border so the pill reads on both surfaces.
    const difficultyColors = {
        BEGINNER: 'border border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
        INTERMEDIATE: 'border border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
        ADVANCED: 'border border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
    }





    return (
        /*
         * The page frame, matched to Explore (Niraj, 2026-09-23: this page does
         * not match "the projects and explore page ui and professionalism").
         *
         * Gone: the `min-h-screen` gradient, which painted a full-viewport band
         * behind content that is supposed to sit in cards on the shell's own
         * surface; the hardcoded `px-4 md:px-6`, which is not the `px-page` every
         * other page uses; and the rounded back PILL, which was one of six
         * different back affordances in this module. A quiet text link, the way
         * a breadcrumb reads, and the actions sit in the flow rather than
         * `absolute`, where they overlapped the pill at narrow widths.
         */
        <div className="relative w-full">
            <div className="w-full px-page py-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <Link
                        href="/projects/explore"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Projects
                    </Link>
                    <div className="flex items-center gap-2">
                        <ProjectAssistantButtons
                            projectId={project.id}
                            projectSlug={project.slug}
                            isCreator={isCreator}
                            isEnrolled={hasStarted || isCreator}
                            currentUserId={currentUserId}
                        />
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    {/* `items-stretch`, so the action card fills the hero's height
                        instead of leaving a column of empty page beside the stats
                        (Niraj, 2026-09-23: "too much of a gap, and there is no
                        content as well"). */}
                    <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <Badge className={`${difficultyColors[project.difficulty as keyof typeof difficultyColors]} px-3 py-1`}>
                                    {project.difficulty}
                                </Badge>
                                <Badge variant="outline" className="px-3 py-1">
                                    {project.generationType.replace('_', ' ')}
                                </Badge>
                                {
                                    isPublic ? (
                                        <Badge variant="outline" className="px-3 py-1 border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                                            <Unlock className="w-3 h-3 mr-1" />
                                            Public
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="px-3 py-1">
                                            <Lock className="w-3 h-3 mr-1" />
                                            Private
                                        </Badge>
                                    )
                                }
                                {
                                    hasStarted && (
                                        <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                            <Zap className="w-3 h-3 mr-1" />
                                            In Progress
                                        </Badge>
                                    )
                                }
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-neutral-50 dark:via-neutral-200 dark:to-neutral-400 mb-4">
                                {project.title}
                            </h1>
                            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mb-6">
                                {project.shortDescription || project.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{project.estimatedHours} hours</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ListChecks className="w-4 h-4" />
                                    <span>{totalTasks} tasks</span>
                                </div>
                                {
                                    isPublic && (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                <span>{project.totalStarted} started</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-4 h-4" />
                                                <span>{project.totalSubmissions} completed</span>
                                            </div>
                                        </>
                                    )
                                }
                            </div>
                        </div>
                        <div className="lg:w-80 flex-shrink-0">
                            <Card className="h-full bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                                <CardContent className="flex h-full flex-col justify-center p-6 space-y-4">
                                    {
                                        hasStarted ? (
                                            <>
                                                <div>
                                                    <div className="flex items-center justify-between text-sm mb-2">
                                                        <span className="text-neutral-600 dark:text-neutral-400">Progress</span>
                                                        <span className="font-bold text-neutral-900 dark:text-white">
                                                            {Math.round(progressPercentage)}%
                                                        </span>
                                                    </div>
                                                    <Progress value={progressPercentage} className="h-3" />
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                        {userProgress?.tasksCompleted || 0} of {userProgress?.totalTasks || totalTasks} tasks
                                                    </p>
                                                </div>
                                                <Button className="w-full bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white shadow-lg shadow-neutral-900/25" size="lg" asChild><Link href={`/projects/${project.slug}/sprints`}>
                                                    <Play className="w-4 h-4 mr-2" />
                                                    {isCompleted ? 'Review Tasks' : 'Continue Building'}
                                                </Link></Button>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => setStandupSheetOpen(true)}
                                                    >
                                                        <Target className="w-4 h-4 mr-1" />
                                                        Standup
                                                    </Button>
                                                </div>

                                                {
                                                    progressPercentage >= 90 && (
                                                        <Button
                                                            onClick={() => setSubmitDialogOpen(true)}
                                                            className="w-full bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white"
                                                        >
                                                            <Trophy className="w-4 h-4 mr-2" />
                                                            Submit Project
                                                        </Button>
                                                    )
                                                }
                                            </>
                                        ) : isCreator ? (
                                            <>
                                                <div className="text-center py-2">
                                                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Your Project</h3>
                                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                        Start building to track progress
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={handleStartProject}
                                                    disabled={starting}
                                                    className="w-full bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white shadow-lg shadow-neutral-900/25"
                                                    size="lg"
                                                >
                                                    {
                                                        starting ? (
                                                            <>
                                                                <InlineLoader size="sm" className="mr-2" />
                                                                Starting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4 mr-2" />
                                                                Start Building
                                                            </>
                                                        )
                                                    }
                                                </Button>
                                            </>
                                        ) : isPublic ? (
                                            <>
                                                <div className="bg-gradient-to-br from-neutral-50 to-neutral-50 dark:from-neutral-800/20 dark:to-neutral-800/20 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enrollment</span>
                                                        <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100">
                                                            <Coins className="w-3 h-3 mr-1" />
                                                            {ENROLL_CREDIT_COST} Credits
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        Your balance: {userCredits} credits
                                                    </p>
                                                </div>
                                                {/* One price and one balance, said once.
                                                    The card printed "Your balance" twice,
                                                    three lines apart. The gradient had
                                                    identical stops, so it was a flat fill
                                                    pretending to be a gradient. */}
                                                <Button
                                                    onClick={() => setEnrollDialogOpen(true)}
                                                    className="w-full"
                                                    size="lg"
                                                >
                                                    <Coins className="w-4 h-4 mr-2" />
                                                    Enroll Now
                                                </Button>
                                            </>
                                        ) : (
                                            /*
                                             * The last case is a PRIVATE project seen by
                                             * somebody who is neither its creator nor
                                             * started on it - which means they were
                                             * enrolled in it. It used to be `null`, so
                                             * the card rendered as an empty white box
                                             * with no text and no button
                                             * (plan/projects, PJ-12).
                                             */
                                            <>
                                                <div className="text-center py-2">
                                                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">You have access</h3>
                                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                        This project is private. Open the board to pick up where it stands.
                                                    </p>
                                                </div>
                                                <Button asChild className="w-full" size="lg">
                                                    <Link href={`/projects/${project.slug}/sprints`}>
                                                        <ListChecks className="w-4 h-4 mr-2" />
                                                        Open the board
                                                    </Link>
                                                </Button>
                                            </>
                                        )

                                    }
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </motion.div>
                {
                    hasStarted && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8"
                        >
                            <BlueprintFlowchart
                                tasks={tasksWithStatus.map(t => ({
                                    id: t.id,
                                    title: t.title,
                                    description: t.description,
                                    difficulty: t.difficulty,
                                    tags: t.tags,
                                    status: t.status,
                                    orderIndex: t.orderIndex,
                                }))}
                                projectTitle={project.title}
                                progressPercentage={progressPercentage}
                                /*
                                 * The tabs on this page are overview / pages /
                                 * setup - there is no 'tasks' tab, so clicking a
                                 * node set `activeTab` to a value no TabsContent
                                 * matches and the whole panel went blank
                                 * (sweep 2026-09-23). The tasks live on the
                                 * sprints board, so that is where a node goes.
                                 */
                                onTaskClick={() => router.push(`/projects/${project.slug}/sprints`)}
                            />
                        </motion.div>
                    )
                }
                {
                    hasStarted && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-8 space-y-4"
                        >
                            <MilestoneTracker
                                progressPercentage={progressPercentage}
                                includeAssessment={project.includeAssessment}
                            />
                            <QuickActions
                                projectSlug={project.slug}
                                progressPercentage={progressPercentage}
                                includeAssessment={project.includeAssessment}
                                isPublic={isPublic}
                                hasStarted={hasStarted}
                            />
                        </motion.div>
                    )
                }

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* `segmented size="sm" fit`, the same call Explore and
                            practice make. It was the default card variant at full
                            width, which stretched three labels across the page and
                            re-drew the border, background and shadow the component
                            already owns. The Pages tab only appears when there are
                            pages: "Pages (0)" opened an empty grid. */}
                        <TabsList variant="segmented" size="sm" fit>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            {project.pages.length > 0 && (
                                <TabsTrigger value="pages">Pages ({project.pages.length})</TabsTrigger>
                            )}
                            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <CardHeader>
                                        <CardTitle className='text-left text-xl'>Project Overview</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-left text-neutral-700 dark:text-neutral-300 leading-relaxed text-lg">
                                            {project.blueprintOverview}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            <Layers className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                            Technology Stack
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            {
                                                project.stacks?.frontend && (
                                                    <div className="flex gap-4 items-center">
                                                        <p className="text-left text-sm font-medium text-neutral-500 dark:text-neutral-400 w-20">Frontend</p>
                                                        <Badge variant="secondary" className="bg-neutral-50 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">{project.stacks.frontend}</Badge>
                                                    </div>
                                                )
                                            }
                                            {
                                                project.stacks?.backend && (
                                                    <div className="flex gap-4 items-center">
                                                        <p className="text-left text-sm font-medium text-neutral-500 dark:text-neutral-400 w-20">Backend</p>
                                                        <Badge variant="secondary" className="bg-neutral-50 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">{project.stacks.backend}</Badge>
                                                    </div>
                                                )
                                            }
                                            {
                                                project.stacks?.database && (
                                                    <div className="flex gap-4 items-center">
                                                        <p className="text-left text-sm font-medium text-neutral-500 dark:text-neutral-400 w-20">Database</p>
                                                        <Badge variant="secondary" className="bg-neutral-50 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">{project.stacks.database}</Badge>
                                                    </div>
                                                )
                                            }
                                            {
                                                project.stacks?.deployment && (
                                                    <div className="flex gap-4 items-center">
                                                        <p className="text-left text-sm font-medium text-neutral-500 dark:text-neutral-400 w-20">Deployment</p>
                                                        <Badge variant="secondary" className="bg-neutral-50 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">{project.stacks.deployment}</Badge>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                                {project.keyOutcomes?.length > 0 && (
                                <Card className="lg:col-span-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            <Target className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                            Key Outcomes
                                        </CardTitle>
                                        <CardDescription>What you&apos;ll build in this project</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                            {
                                                (project.keyOutcomes || []).map((outcome: string, index: number) => (
                                                    <li key={index} className="flex items-start gap-3 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                                        <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200 flex-shrink-0 mt-0.5" />
                                                        <span className="text-left text-neutral-700 dark:text-neutral-300 text-sm">{outcome}</span>
                                                    </li>
                                                ))
                                            }
                                        </ul>
                                    </CardContent>
                                </Card>
                                )}
                                {
                                    project.vision && (
                                        <Card className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow duration-300">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-xl">
                                                    <Lightbulb className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                                    Vision & Purpose
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-left text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                                                    &quot;{project.vision}&quot;
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                    {project.targetAudience && (
                                                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                                                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Target Audience</p>
                                                            <p className="text-sm text-neutral-700 dark:text-neutral-300">{project.targetAudience}</p>
                                                        </div>
                                                    )}
                                                    {project.problemSolution && (
                                                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                                                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Problem Solved</p>
                                                            <p className="text-sm text-neutral-700 dark:text-neutral-300">{project.problemSolution}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                }
                                {
                                    project.features && project.features.length > 0 && (
                                        <Card className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 border-neutral-200 dark:border-neutral-800 lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300">
                                            <CardHeader>
                                                <CardTitle className="text-left flex items-center gap-2 text-xl">
                                                    <Code2 className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                                    Features
                                                </CardTitle>
                                                <CardDescription className="text-left">Main features you&apos;ll implement</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {
                                                        project.features.map((feature, index: number) => (
                                                            <div key={index} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-900 transition-colors">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <h4 className="font-medium text-neutral-900 dark:text-white text-sm">{feature.name}</h4>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "text-xs",
                                                                            feature.priority === 'must-have' && "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400",
                                                                            feature.priority === 'should-have' && "border-neutral-200 bg-neutral-50 text-neutral-700 dark:bg-neutral-800/20 dark:border-neutral-800 dark:text-neutral-100",
                                                                            feature.priority === 'nice-to-have' && "border-neutral-200 bg-neutral-50 text-neutral-700 dark:bg-neutral-800/20 dark:border-neutral-800 dark:text-neutral-100"
                                                                        )}
                                                                    >
                                                                        {feature.priority?.replace('-', ' ')}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 leading-relaxed">{feature.description}</p>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={cn(
                                                                        "text-xs",
                                                                        feature.complexity === 'low' && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                                                                        feature.complexity === 'medium' && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                                                                        feature.complexity === 'high' && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                                    )}
                                                                >
                                                                    {feature.complexity} complexity
                                                                </Badge>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                }
                            </div>
                        </TabsContent>

                        <TabsContent value="pages" className="mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {
                                    project.pages.map((page: ProjectV2Page) => (
                                        <PageOverviewCard
                                            key={page.id}
                                            page={page}
                                            difficultyColors={difficultyColors}
                                        />
                                    ))
                                }
                            </div>
                        </TabsContent>
                        <TabsContent value="setup" className="mt-6">
                            <SetupGuideTab
                                setupGuide={project.setupGuide ? {
                                    prerequisites: project.setupGuide.prerequisites || [],
                                    environmentVariables: project.setupGuide.environmentVariables || [],
                                    installationSteps: project.setupGuide.installationSteps || [],
                                    verificationSteps: project.setupGuide.verificationSteps || []
                                } : null}
                            />
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div >
            <EnrollmentDialog
                open={enrollDialogOpen}
                onOpenChange={setEnrollDialogOpen}
                projectId={project.id}
                projectTitle={project.title}
                projectSlug={project.slug}
                tasksCount={totalTasks}
                userCredits={userCredits}
            />
            <Sheet open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Submit Your Project</SheetTitle>
                        <SheetDescription>
                            Share your completed project for review
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="githubUrl">GitHub Repository URL *</Label>
                            <Input
                                id="githubUrl"
                                placeholder="https://github.com/username/repo"
                                value={submitForm.githubUrl}
                                onChange={(e) => setSubmitForm({ ...submitForm, githubUrl: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="liveUrl">Live Demo URL (Optional)</Label>
                            <Input
                                id="liveUrl"
                                placeholder="https://your-project.vercel.app"
                                value={submitForm.liveUrl}
                                onChange={(e) => setSubmitForm({ ...submitForm, liveUrl: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Additional Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Share any challenges, learnings, or additional features..."
                                value={submitForm.notes}
                                onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })}
                                rows={4}
                            />
                        </div>
                    </div>
                    <SheetFooter>
                        <Button
                            onClick={handleSubmitProject}
                            disabled={submitting || !submitForm.githubUrl}
                            className="w-full bg-gradient-to-r from-neutral-800 to-neutral-800 text-white"
                        >
                            {
                                submitting ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Trophy className="w-4 h-4 mr-2" />
                                        Submit Project
                                    </>
                                )
                            }
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            <DailyStandupSheet
                isOpen={standupSheetOpen}
                onClose={() => setStandupSheetOpen(false)}
                projectId={project.id}
                projectSlug={project.slug}
                projectTitle={project.title}
                userCredits={userCredits}
                hasStarted={!!hasStarted}
            />
        </div >
    )
}