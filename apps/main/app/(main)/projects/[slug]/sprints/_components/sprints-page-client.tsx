'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ChevronLeft, Plus, CheckCircle2, Clock, LayoutList, Sparkles, 
    Book, Users, AlertTriangle, Brain, Lock, MonitorPlay, 
    FileText, Target, Code2, Lightbulb, ChevronDown, Terminal, Copy, 
    Check, Mic
} from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
    DialogFooter
} from '@repo/ui/components/ui/dialog'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import {
    Tabs, TabsList, TabsTrigger, TabsContent
} from "@repo/ui/components/ui/tabs"
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@repo/ui/components/ui/collapsible'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@repo/ui/components/ui/tooltip'
import { toast } from '@repo/ui/components/ui/sonner'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import { cn } from '@repo/ui/lib/utils'
import { SprintGenerationSheet } from '../../_components/sprint-generation-sheet'
import DailyStandupTab from '../../_components/daily-standup-tab'
import SprintMockInterview from '../../_components/sprint-mock-interview'
import ResourcesList from '@/components/projects/resources-list'
import ErrorsTab from '@/components/projects/errors-tab'
import Quiz, { QuizQuestion, QuizResult } from '@/components/main/quiz'
import CodeEditor from '@/components/main/code-editor'
import { addTaskToSprint } from '@/actions/(main)/projects/tasks.action'
// The one copy that recalculates project progress, which gates the quiz and the
// mock. See the note in tasks.action.ts.
import { updateTaskStatus } from '@/actions/(main)/projects/project.action'
import {
    generateTaskQuizQuestions, submitTaskQuizAnswers,
    getCodeChallengeInstructions, submitCodeForValidation,
    getTaskAssessmentStatus, getSprintCompletionStatuses,
} from '@/actions/(main)/projects/projectassessments.action'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { mockUnlocked, quizUnlocked } from "@/lib/projects/gates"

interface TaskLearn {
    title: string
    summary: string
    keyPoints: string[]
    commonMistakes: string[]
    bestPractices: string[]
    realWorldUsage: string
    securityConsiderations: string[]
    relatedLearns: string[]
}

interface TaskResource {
    title: string
    url: string
    type: 'documentation' | 'article' | 'video' | 'tutorial'
}

interface TaskData {
    id: string
    title: string
    description: string[]
    criteria?: string[]
    hints?: string[]
    badges?: string[]
    tags?: string[]
    difficulty: string
    category?: string | null
    estimatedTime?: string | null
    checkpoints?: string[]
    relatedPages?: string[]
    dependencies?: string[]
    terminalCommand?: string | null
    orderIndex: number
    status?: string
    // Enhanced learning content from v2 schema
    learningObjectives?: string[]
    prerequisites?: string[]
    resources?: TaskResource[]
    testingGuidelines?: string[]
    Learns?: TaskLearn[] | null
    assessmentType?: 'QUIZ' | 'CODE' | 'NONE'
}

interface Sprint {
    id: string
    name: string
    goal: string
    duration: string
    sprintNumber: number
    tasks: TaskData[]
}

interface Project {
    id: string
    title: string
    slug: string
    sprints: Sprint[]
    createdBy: string
    progress?: {
        taskStatuses?: { taskId: string; status: string }[]
    }[]
}

interface SprintsPageClientProps {
    project: Project
    currentUserId?: string | null
    userCredits: number
    currentUser?: unknown
}

const DETAIL_TABS = [
    { value: 'taskDetails', label: 'Task Details', icon: FileText },
    { value: 'assessment', label: 'Assessment', icon: Brain },
    { value: 'standup', label: 'Daily Standup', icon: Mic },
    { value: 'resources', label: 'Resources', icon: Book },
    { value: 'errors', label: 'Errors', icon: AlertTriangle },
] as const

export default function SprintsPageClient({
    project,
    currentUserId,
    userCredits,
    currentUser: _currentUser
}: SprintsPageClientProps) {
    const router = useRouter()
    const [selectedSprintId, setSelectedSprintId] = useState<string>('')
    const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>(() => {
        const statuses: Record<string, string> = {}
        if (project.progress && project.progress.length > 0) {
            const p = project.progress[0]
            if (p && p.taskStatuses) {
                p.taskStatuses.forEach((ts: { taskId: string; status: string }) => {
                    statuses[ts.taskId] = ts.status
                })
            }
        }
        return statuses
    })
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
    const [isSprintGenOpen, setIsSprintGenOpen] = useState(false)

    // Task Form State
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDesc, setNewTaskDesc] = useState('')
    const [newTaskDiff, setNewTaskDiff] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER')
    const [newTaskTime, setNewTaskTime] = useState('')
    const [newTaskCategory, setNewTaskCategory] = useState('')
    const [isSubmittingTask, setIsSubmittingTask] = useState(false)

    // Selected Task - for Task Details tab
    const [selectedTask, setSelectedTask] = useState<TaskData | null>(null)

    // Right Panel Tab State
    const [activeTab, setActiveTab] = useState('taskDetails')


    // Mock Interview State - when a sprint mock is selected
    const [selectedMockSprintId, setSelectedMockSprintId] = useState<string | null>(null)

    // The sprint rail, as a sheet, below md. See `sprintRail` further down.
    const [railOpen, setRailOpen] = useState(false)

    // Task Details UI State
    const [copied, setCopied] = useState(false)
    const [hintsOpen, setHintsOpen] = useState(false)

    // Quiz/Code Assessment State
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
    const [isLoadingAssessment, setIsLoadingAssessment] = useState(false)
    const [codeInstructions, setCodeInstructions] = useState('')

    const [codeLanguage, setCodeLanguage] = useState('javascript')
    const [userCode, setUserCode] = useState('')
    const [codeResult, setCodeResult] = useState<{
        passed: boolean
        score: number
        feedback: string
        suggestions: string[]
    } | null>(null)

    const isCreator = project.createdBy === currentUserId
    /*
     * Everybody who gets here is the creator or enrolled.
     *
     * `page.tsx` reads the progress row and redirects anyone who is neither, so
     * this is true by construction rather than by assumption - which is what the
     * old comment ("assume enrolled is true for now") left unclear, and it made
     * the `isCreator || isEnrolled` below look like a real check when it can only
     * ever be true.
     */
    const isEnrolled = true

    // Task Assessment Status - tracks completed assessments for each task
    const [taskAssessmentStatus, setTaskAssessmentStatus] = useState<Record<string, {
        passed: boolean
        score: number | null
        attempts: number
    }>>({})

    // Sprint Completion Status - tracks full completion including assessments and mocks
    const [sprintCompletionStatus, setSprintCompletionStatus] = useState<Record<string, {
        isFullyCompleted: boolean
        tasksCompleted: boolean
        allAssessmentsPassed: boolean
        mockInterviewCompleted: boolean
    }>>({})

    // One call for every sprint, not one per sprint in series (plan/projects,
    // sweep-2026-09-23). A ten-sprint project used to open with ten sequential
    // server actions and the locks fell open one at a time.
    useEffect(() => {
        let cancelled = false
        const fetchSprintCompletionStatuses = async () => {
            if (!project.sprints || project.sprints.length === 0) return
            try {
                const result = await getSprintCompletionStatuses(project.id)
                if (cancelled || !result.success || !result.data) return
                const data = result.data
                setSprintCompletionStatus(
                    Object.fromEntries(
                        Object.entries(data).map(([sprintId, status]) => [
                            sprintId,
                            {
                                isFullyCompleted: status.isFullyCompleted,
                                tasksCompleted: status.tasksCompleted,
                                allAssessmentsPassed: status.allAssessmentsPassed,
                                mockInterviewCompleted: status.mockInterviewCompleted,
                            },
                        ]),
                    ),
                )
            } catch (error: unknown) {
                console.error('Error fetching sprint completion status:', error)
            }
        }

        fetchSprintCompletionStatuses()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id, project.sprints])

    // Helper: Check if a sprint is unlocked
    // A sprint is unlocked if it's the first sprint OR previous sprint is fully completed
    // (all tasks completed + all assessments passed + mock interview completed)
    const isSprintUnlocked = (sprintNumber: number): boolean => {
        // First sprint is always unlocked
        if (sprintNumber === 1) return true

        // Creators can access all sprints
        // if (isCreator) return true

        // Find the previous sprint
        const previousSprint = project.sprints?.find(s => s.sprintNumber === sprintNumber - 1)
        if (!previousSprint) return true // If no previous sprint, unlock

        // No tasks in previous sprint means unlocked
        const previousTasks = previousSprint.tasks || []
        if (previousTasks.length === 0) return true

        // Check comprehensive completion status
        const completionStatus = sprintCompletionStatus[previousSprint.id]
        if (completionStatus) {
            return completionStatus.isFullyCompleted
        }

        // Fallback: Check if all tasks in previous sprint are at least marked as completed
        const allTasksCompleted = previousTasks.every(task =>
            taskStatuses[task.id] === 'COMPLETED'
        )
        return allTasksCompleted
    }

    // Helper: Get what's missing to unlock the next sprint
    const getSprintUnlockRequirements = (sprintId: string): string[] => {
        const status = sprintCompletionStatus[sprintId]
        if (!status) return []

        const requirements: string[] = []
        if (!status.tasksCompleted) requirements.push('Complete all tasks')
        if (!status.allAssessmentsPassed) requirements.push('Pass all assessments')
        if (!status.mockInterviewCompleted) requirements.push('Complete mock interview')

        return requirements
    }

    // Get completion percentage for a sprint
    const getSprintCompletionPercentage = (sprint: Sprint): number => {
        const tasks = sprint.tasks || []
        if (tasks.length === 0) return 0
        const completed = tasks.filter(t => taskStatuses[t.id] === 'COMPLETED').length
        return Math.round((completed / tasks.length) * 100)
    }

    useEffect(() => {
        // Set default sprint (first one or active one)
        if (project.sprints && project.sprints.length > 0 && !selectedSprintId) {
            const firstSprint = project.sprints[0]
            if (firstSprint) setSelectedSprintId(firstSprint.id)
        }
    }, [project.sprints, selectedSprintId])

    useEffect(() => {
        if (project.progress && project.progress.length > 0) {
            const statuses: Record<string, string> = {}
            const p = project.progress[0]
            if (p && p.taskStatuses) {
                p.taskStatuses.forEach((ts: { taskId: string; status: string }) => {
                    statuses[ts.taskId] = ts.status
                })
            }
            setTaskStatuses(statuses)
        }
    }, [project.progress])

    // Fetch assessment status when task is selected
    useEffect(() => {
        const fetchAssessmentStatus = async () => {
            if (!selectedTask || !selectedTask.assessmentType || selectedTask.assessmentType === 'NONE') return

            // Check if we already have the status
            if (taskAssessmentStatus[selectedTask.id]) return

            try {
                const result = await getTaskAssessmentStatus(selectedTask.id)
                if (result.success && result.data) {
                    setTaskAssessmentStatus(prev => ({
                        ...prev,
                        [selectedTask.id]: {
                            passed: result.data?.passed ?? false,
                            score: result.data?.score ?? null,
                            attempts: result.data?.attempts ?? 0
                        }
                    }))
                }
            } catch (error) {
                console.error('Error fetching assessment status:', error)
            }
        }
        fetchAssessmentStatus()
    }, [selectedTask, taskAssessmentStatus])

    // Calculate progress
    const allTasks = project.sprints?.flatMap(s => s.tasks) || []
    const completedTasks = allTasks.filter(t => taskStatuses[t.id] === 'COMPLETED').length
    const progressPercent = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0

    const handleTaskStatusChange = async (taskId: string, newStatus: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED') => {
        const previous = taskStatuses[taskId]
        setTaskStatuses(prev => ({ ...prev, [taskId]: newStatus }))
        try {
            // The action reports a failure in its result rather than throwing, so
            // the catch alone left the checkbox ticked against a write that never
            // landed - and the next reload silently untucked it.
            const result = await updateTaskStatus(taskId, newStatus)
            if (!result.success) {
                setTaskStatuses(prev => ({ ...prev, [taskId]: previous ?? 'TO_DO' }))
                toast.error(result.error || 'Failed to update task status')
            }
        } catch {
            setTaskStatuses(prev => ({ ...prev, [taskId]: previous ?? 'TO_DO' }))
            toast.error('Failed to update task status')
        }
    }

    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || !selectedSprintId) return
        setIsSubmittingTask(true)
        try {
            const result = await addTaskToSprint(
                project.id,
                selectedSprintId,
                {
                    title: newTaskTitle,
                    description: newTaskDesc,
                    difficulty: newTaskDiff as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
                    estimatedTime: newTaskTime || undefined,
                    category: newTaskCategory || undefined
                }
            )
            if (result.success) {
                toast.success('Task added successfully')
                setIsTaskDialogOpen(false)
                setNewTaskTitle('')
                setNewTaskDesc('')
                setNewTaskDiff('BEGINNER')
                setNewTaskTime('')
                setNewTaskCategory('')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to add task')
            }
        } catch {
            toast.error('Error adding task')
        } finally {
            setIsSubmittingTask(false)
        }
    }

    const handleTaskClick = (task: TaskData) => {
        setSelectedTask(task)
        setSelectedMockSprintId(null)
        setActiveTab('taskDetails')
        // Reset assessment state
        setQuizQuestions([])
        setCodeInstructions('')
        setCodeResult(null)
        setUserCode('')
    }

    const handleCopyCommand = () => {
        if (selectedTask?.terminalCommand) {
            navigator.clipboard.writeText(selectedTask.terminalCommand)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleStartAssessment = () => {
        if (!selectedTask) return
        setActiveTab('assessment')
        if (selectedTask.assessmentType === 'QUIZ') {
            loadQuizQuestions()
        } else if (selectedTask.assessmentType === 'CODE') {
            loadCodeChallenge()
        }
    }

    const loadQuizQuestions = async () => {
        if (!selectedTask) return
        setIsLoadingAssessment(true)
        try {
            const result = await generateTaskQuizQuestions(selectedTask.id)
            if (result.success && result.data) {
                // Convert to Quiz component format
                const formatted: QuizQuestion[] = result.data.map((q, idx) => ({
                    id: `q-${idx}`,
                    text: q.prompt,
                    type: 'single' as const,
                    options: q.options.map((opt, oidx) => ({
                        id: `opt-${oidx}`,
                        text: opt,
                        isCorrect: oidx === q.correctAnswer
                    })),
                    explanation: q.explanation,
                    correctAnswer: q.correctAnswer
                }))
                setQuizQuestions(formatted)
            } else {
                toast.error(result.error || 'Failed to load quiz')
            }
        } catch {
            toast.error('Error loading quiz')
        } finally {
            setIsLoadingAssessment(false)
        }
    }

    const loadCodeChallenge = async () => {
        if (!selectedTask) return
        setIsLoadingAssessment(true)
        try {
            const result = await getCodeChallengeInstructions(selectedTask.id)
            if (result.success && result.data) {
                setCodeInstructions(result.data.instructions)

                setCodeLanguage(result.data.language)
                setUserCode(result.data.starterCode)
            } else {
                toast.error(result.error || 'Failed to load challenge')
            }
        } catch {
            toast.error('Error loading challenge')
        } finally {
            setIsLoadingAssessment(false)
        }
    }

    const handleQuizComplete = async (result: QuizResult) => {
        if (!selectedTask) return
        try {
            const answers = result.answers.map((a, idx) => ({
                questionIndex: idx,
                selectedAnswer: typeof a.selectedAnswer === 'string'
                    ? parseInt(a.selectedAnswer.replace('opt-', ''))
                    : 0
            }))
            await submitTaskQuizAnswers(selectedTask.id, answers)

            if (result.scorePercentage >= 70) {
                toast.success(`Quiz passed with ${result.scorePercentage}%!`)
                handleTaskStatusChange(selectedTask.id, 'COMPLETED')
            } else {
                toast.info(`Score: ${result.scorePercentage}%. Need 70% to pass.`)
            }

            // Go back to task details
            setActiveTab('taskDetails')
            setQuizQuestions([])
        } catch {
            toast.error('Error submitting quiz')
        }
    }

    const handleSubmitCode = async () => {
        if (!selectedTask || !userCode.trim()) return
        setIsLoadingAssessment(true)
        try {
            const result = await submitCodeForValidation(selectedTask.id, userCode, codeLanguage)
            if (result.success && result.data) {
                setCodeResult(result.data)
                if (result.data.passed) {
                    toast.success(`Code passed with ${result.data.score}%!`)
                    handleTaskStatusChange(selectedTask.id, 'COMPLETED')
                } else {
                    toast.info(`Score: ${result.data.score}%. ${result.data.feedback}`)
                }
            } else {
                toast.error(result.error || 'Failed to validate code')
            }
        } catch {
            toast.error('Error validating code')
        } finally {
            setIsLoadingAssessment(false)
        }
    }

    const activeSprint = project.sprints?.find((s: Sprint) => s.id === selectedSprintId)

    // `>` and `<=` here against `>=` on the pages meant that at exactly 50 or 75
    // percent this board said locked and the page let you in. One helper now,
    // read from plan/projects/overview.md (plan/projects, PJ-12).
    const canQuiz = quizUnlocked(progressPercent)
    const canMock = mockUnlocked(progressPercent)

    const handleQuiz = () => {
        if (canQuiz) router.push(`/projects/${project.slug}/quiz`)
    }

    const handleMock = () => {
        if (canMock) router.push(`/projects/${project.slug}/aimock`)
    }

    const statusOptions = [
        { value: 'TO_DO', label: 'To Do', color: 'text-neutral-500 bg-neutral-100' },
        { value: 'IN_PROGRESS', label: 'In Progress', color: 'text-neutral-800 bg-neutral-100' },
        { value: 'COMPLETED', label: 'Completed', color: 'text-neutral-800 bg-neutral-100' }
    ] as const

    /*
     * ONE style, because all three arms were already the identical string - the
     * map only looked like it varied.
     *
     * It set `text-neutral-800` with NO dark variant, so on the board's near-black
     * card the label was dark grey on black: the BEGINNER badge was invisible in
     * dark mode (Niraj, 2026-09-23). The ink has to change with the surface.
     */
    const DIFFICULTY_BADGE =
        'border border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'

    /*
     * The rail, once, rendered twice.
     *
     * It was `hidden md:flex` and nothing else, so below `md` the board had no
     * sprint list, no Generate Sprint button and nothing selected: a dead
     * "Select a Sprint" screen on every phone (plan/projects, PJ-12). The same
     * markup now also fills a Sheet, which is how the rest of this app handles a
     * fixed column on a small screen.
     */
    const sprintRail = (
        <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <Link
                    href={`/projects/${project.slug}`}
                    className="flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Project
                </Link>
            </div>
            <div className="p-4 pb-2">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Sprints</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {project.sprints?.length || 0} sprints available
                </p>
            </div>
            <ScrollArea className="min-h-0 flex-1 w-full px-3">
                <div className="space-y-2 py-2">
                    {
                        project.sprints?.map((sprint: Sprint, index: number) => {
                            const unlocked = isSprintUnlocked(sprint.sprintNumber)
                            const completionPct = getSprintCompletionPercentage(sprint)

                            return (
                                <div key={sprint.id}>
                                    <div className="relative group">
                                        <button
                                            onClick={() => {
                                                if (!unlocked) {
                                                    return // Prevent click on locked sprints
                                                }
                                                setSelectedSprintId(sprint.id)
                                                setSelectedMockSprintId(null)
                                                setRailOpen(false)
                                                // Auto-select first task if available
                                                const firstTask = sprint.tasks?.[0]
                                                if (firstTask) {
                                                    setSelectedTask(firstTask)
                                                    setActiveTab('taskDetails')
                                                } else {
                                                    setSelectedTask(null)
                                                    setActiveTab('resources')
                                                }
                                            }}
                                            disabled={!unlocked}
                                            className={cn(
                                                "w-full text-left p-3 rounded-xl transition-all border border-transparent relative",
                                                !unlocked && "opacity-50 cursor-not-allowed",
                                                selectedSprintId === sprint.id && !selectedMockSprintId && unlocked
                                                    ? "bg-white dark:bg-neutral-900 shadow-sm border-neutral-200 dark:border-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-800"
                                                    : unlocked ? "hover:bg-neutral-100 dark:hover:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400" : ""
                                            )}
                                        >
                                            {
                                                !unlocked && (() => {
                                                    const prevSprint = project.sprints?.find(s => s.sprintNumber === sprint.sprintNumber - 1)
                                                    const requirements = prevSprint ? getSprintUnlockRequirements(prevSprint.id) : []
                                                    return (
                                                        <div className="absolute top-2 right-2 group/tooltip">
                                                            <Lock className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                                            {
                                                                requirements.length > 0 && (
                                                                    <div className="absolute right-0 top-6 w-48 p-2 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none">
                                                                        <p className="font-semibold mb-1">To unlock:</p>
                                                                        <ul className="list-disc list-inside space-y-0.5">
                                                                            {
                                                                                requirements.map((req, idx) => (
                                                                                    <li key={idx}>{req}</li>
                                                                                ))
                                                                            }
                                                                        </ul>
                                                                    </div>
                                                                )
                                                            }
                                                        </div>
                                                    )
                                                })()
                                            }
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    selectedSprintId === sprint.id && !selectedMockSprintId ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-500"
                                                )}>
                                                    Sprint {sprint.sprintNumber}
                                                </span>
                                                {
                                                    unlocked && completionPct > 0 && (
                                                        <span className={cn(
                                                            "text-xs font-medium",
                                                            completionPct === 100 ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-800 dark:text-neutral-100"
                                                        )}>
                                                            {completionPct}%
                                                        </span>
                                                    )
                                                }
                                            </div>
                                            <h3 className={cn(
                                                "font-semibold text-sm line-clamp-1 mb-1",
                                                selectedSprintId === sprint.id && !selectedMockSprintId ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                                            )}>
                                                {sprint.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                <span className="flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {sprint.duration}
                                                </span>
                                                <span>•</span>
                                                <span>{sprint.tasks?.length} tasks</span>
                                            </div>
                                            {
                                                unlocked && completionPct > 0 && completionPct < 100 && (
                                                    <div className="mt-2 h-1 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-neutral-900 rounded-full transition-all"
                                                            style={{ width: `${completionPct}%` }}
                                                        />
                                                    </div>
                                                )
                                            }
                                        </button>

                                        {
                                            index < (project.sprints?.length || 0) - 1 && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMockSprintId(sprint.id)
                                                        setSelectedSprintId(sprint.id)
                                                        setRailOpen(false)
                                                        setSelectedTask(null)
                                                        setActiveTab('assessment')
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-2 mt-1 rounded-lg transition-all border",
                                                        selectedMockSprintId === sprint.id
                                                            ? "bg-neutral-50 dark:bg-neutral-900/30 border-neutral-200 dark:border-neutral-800"
                                                            : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center",
                                                            selectedMockSprintId === sprint.id
                                                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                                                : "bg-neutral-100 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200"
                                                        )}>
                                                            <Brain className="w-3 h-3" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn(
                                                                "text-xs font-medium truncate",
                                                                selectedMockSprintId === sprint.id
                                                                    ? "text-neutral-800 dark:text-neutral-100"
                                                                    : "text-neutral-700 dark:text-neutral-300"
                                                            )}>
                                                                Mock Interview
                                                            </p>
                                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                                                Sprints 1-{sprint.sprintNumber}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            )}
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </ScrollArea>
            {/* Creator only (Niraj, 2026-09-23, PJ-16 item 9). `startSprintGeneration`
                refuses everyone else, so an enrolled user pressing this got an error
                toast. The same gate is on Add Task, whose action has the same rule. */}
            {
                isCreator && (
                    <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                        <Button
                            onClick={() => setIsSprintGenOpen(true)}
                            className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Sprint
                        </Button>
                    </div>
                )
            }
        </>
    )

    return (
        <div className="flex h-dvh w-full overflow-hidden">
            <div className="hidden md:flex w-72 border-r border-neutral-200 dark:border-neutral-800 flex-col bg-neutral-50/50 dark:bg-neutral-900/20">
                {sprintRail}
            </div>
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-950 relative">
                <div className="h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Link href={`/projects/${project.slug}`} className="md:hidden">
                            <ChevronLeft className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                        </Link>
                        {/* The only way into the sprint list below md. */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="md:hidden gap-1.5 shrink-0"
                            onClick={() => setRailOpen(true)}
                        >
                            <LayoutList className="w-4 h-4" />
                            Sprints
                        </Button>
                        {
                            activeSprint ? (
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                                        {activeSprint.name}
                                    </h1>
                                </div>
                            ) : (
                                <h1 className="text-lg font-bold">Select a Sprint</h1>
                            )
                        }
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {
                            activeSprint && isCreator && (
                                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="hidden lg:flex gap-1">
                                            <Plus className="w-4 h-4" />
                                            Add Task
                                        </Button>
                                    </DialogTrigger>
                                    {/* The generate sheet's layout (PJ-16 item 7): icon header with
                                        a one-line subtitle, `text-sm` labels, difficulty as three
                                        picker cards instead of a Select, and the actions in a
                                        bordered footer bar. Add is disabled until there is a
                                        title - it used to be live and silently do nothing. */}
                                    <DialogContent className="gap-0 p-0 sm:max-w-lg">
                                        <DialogHeader className="space-y-0 border-b border-neutral-200 px-6 py-4 text-left dark:border-neutral-800">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <DialogTitle className="text-base">Add a task</DialogTitle>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        To Sprint {activeSprint.sprintNumber}: {activeSprint.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </DialogHeader>
                                        <div className="max-h-[70dvh] space-y-5 overflow-y-auto px-6 py-5">
                                            <div className="space-y-2">
                                                <Label htmlFor="new-task-title" className="text-sm">Title</Label>
                                                <Input
                                                    id="new-task-title"
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    placeholder="e.g., Implement the login API"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-task-desc" className="text-sm">
                                                    What does done look like? <span className="font-normal text-neutral-500 dark:text-neutral-400">(optional)</span>
                                                </Label>
                                                <Textarea
                                                    id="new-task-desc"
                                                    value={newTaskDesc}
                                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                                    placeholder="Describe what needs to be done..."
                                                    className="min-h-[96px] resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm">How hard is it?</Label>
                                                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulty">
                                                    {
                                                        ([
                                                            { value: 'BEGINNER', label: 'Beginner' },
                                                            { value: 'INTERMEDIATE', label: 'Intermediate' },
                                                            { value: 'ADVANCED', label: 'Advanced' },
                                                        ] as const).map((d) => {
                                                            const active = newTaskDiff === d.value
                                                            return (
                                                                <button
                                                                    key={d.value}
                                                                    type="button"
                                                                    role="radio"
                                                                    aria-checked={active}
                                                                    onClick={() => setNewTaskDiff(d.value)}
                                                                    className={cn(
                                                                        'rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition-colors',
                                                                        active
                                                                            ? 'border-neutral-900 bg-neutral-50 text-neutral-900 dark:border-white dark:bg-neutral-800 dark:text-white'
                                                                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700'
                                                                    )}
                                                                >
                                                                    {d.label}
                                                                </button>
                                                            )
                                                        })
                                                    }
                                                </div>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-task-time" className="text-sm">
                                                        Time <span className="font-normal text-neutral-500 dark:text-neutral-400">(optional)</span>
                                                    </Label>
                                                    <Input
                                                        id="new-task-time"
                                                        value={newTaskTime}
                                                        onChange={(e) => setNewTaskTime(e.target.value)}
                                                        placeholder="e.g., 2 hours"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-task-category" className="text-sm">
                                                        Area <span className="font-normal text-neutral-500 dark:text-neutral-400">(optional)</span>
                                                    </Label>
                                                    <Input
                                                        id="new-task-category"
                                                        value={newTaskCategory}
                                                        onChange={(e) => setNewTaskCategory(e.target.value)}
                                                        placeholder="e.g., Backend"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter className="border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
                                            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={handleAddTask} disabled={isSubmittingTask || !newTaskTitle.trim()}>
                                                {isSubmittingTask ? <><InlineLoader size="sm" className="mr-1.5" /> Adding</> : 'Add task'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )
                        }

                        <Button
                            variant="outline" size="sm" onClick={handleQuiz}
                            disabled={!canQuiz}
                            className={cn("hidden lg:flex gap-2", !canQuiz && "opacity-50 cursor-not-allowed")}
                        >
                            <Brain className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                            Final Quiz
                            {!canQuiz && <Lock className="w-3 h-3 ml-1" />}
                        </Button>
                        <Button
                            variant="outline" size="sm" onClick={handleMock}
                            disabled={!canMock}
                            className={cn("hidden lg:flex gap-2", !canMock && "opacity-50 cursor-not-allowed")}
                        >
                            <MonitorPlay className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                            Final Mock Interview
                            {!canMock && <Lock className="w-3 h-3 ml-1" />}
                        </Button>
                    </div>
                </div>
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    <div className="w-full lg:w-[400px] shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-800">
                        {/* `reflow`: without it Radix's `display: table` wrapper grows to the
                            longest title, so `truncate` never engaged and titles were cut off
                            at the column edge instead (PJ-16 item 4). */}
                        <ScrollArea reflow className="min-h-0 flex-1 w-full relative">
                            <div className="w-full p-4 space-y-3">
                                {
                                    activeSprint ? (
                                        activeSprint.tasks?.length > 0 ? (
                                            activeSprint.tasks.map((task: TaskData) => {
                                                const status = taskStatuses[task.id] || 'TO_DO'
                                                const isCompleted = status === 'COMPLETED'
                                                const isSelected = selectedTask?.id === task.id

                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => handleTaskClick(task)}
                                                        className={cn(
                                                            "group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                                                            isSelected
                                                                ? "bg-neutral-50 dark:bg-neutral-900/20 border-neutral-300 dark:border-neutral-700 ring-1 ring-neutral-300 dark:ring-neutral-700"
                                                                : isCompleted
                                                                    ? "bg-neutral-50/50 dark:bg-neutral-900/10 border-neutral-200 dark:border-neutral-800/30"
                                                                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                                                        )}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleTaskStatusChange(
                                                                        task.id,
                                                                        isCompleted ? 'TO_DO' : 'COMPLETED'
                                                                    )
                                                                }}
                                                                className={cn(
                                                                    "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                                                    isCompleted
                                                                        ? "bg-neutral-900 dark:bg-white border-neutral-900 text-white dark:text-neutral-900"
                                                                        : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 text-transparent"
                                                                )}
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            </button>
                                                            <div className="flex-1 min-w-0">
                                                                <h3
                                                                    title={task.title}
                                                                    className={cn(
                                                                        "text-sm font-semibold leading-snug transition-all line-clamp-2 break-words",
                                                                        isCompleted ? "text-neutral-500 line-through" : "text-neutral-900 dark:text-white"
                                                                    )}
                                                                >
                                                                    {task.title}
                                                                </h3>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                                    <Badge variant="secondary" className={cn(
                                                                        "text-xs font-medium",
                                                                        DIFFICULTY_BADGE
                                                                    )}>
                                                                        {task.difficulty}
                                                                    </Badge>
                                                                    {
                                                                        task.assessmentType && task.assessmentType !== 'NONE' && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {task.assessmentType === 'QUIZ' ? '📝 Quiz' : '💻 Code'}
                                                                            </Badge>
                                                                        )
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="text-center py-16 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
                                                <LayoutList className="w-10 h-10 mx-auto text-neutral-600 dark:text-neutral-400 mb-3" />
                                                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">No tasks yet</h3>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[200px] mx-auto mt-1">
                                                    {isCreator ? 'Generate tasks with AI or add them manually.' : 'The creator has not added tasks to this sprint yet.'}
                                                </p>
                                                {
                                                    isCreator && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setIsTaskDialogOpen(true)}
                                                            className="mt-4"
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            Add Task
                                                        </Button>
                                                    )
                                                }
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-neutral-500 dark:text-neutral-400">
                                            <p className="text-sm">Pick a sprint to see its tasks.</p>
                                            {/* On a phone the list is behind the Sprints button, so
                                                "from the sidebar" was an instruction to look at
                                                something that is not on screen. */}
                                            <Button variant="outline" size="sm" className="md:hidden gap-1.5" onClick={() => setRailOpen(true)}>
                                                <LayoutList className="w-4 h-4" />
                                                Choose a sprint
                                            </Button>
                                        </div>
                                    )
                                }
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="flex-1 flex flex-col bg-neutral-50/30 dark:bg-neutral-900/10 overflow-hidden">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm shrink-0">
                                {/* Icon-only with tooltips (Niraj, 2026-09-23): five labelled tabs
                                    truncated to "Task Det...", "Assess...", "Daily St..." in this
                                    pane. The label is the tooltip and the accessible name. */}
                                <TooltipProvider delayDuration={150}>
                                    <TabsList variant="segmented" size="sm" fit>
                                        {
                                            DETAIL_TABS.map(({ value, label, icon: Icon }) => (
                                                <Tooltip key={value}>
                                                    <TooltipTrigger asChild>
                                                        <TabsTrigger value={value} aria-label={label} icon={<Icon />} className="px-3" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">{label}</TooltipContent>
                                                </Tooltip>
                                            ))
                                        }
                                    </TabsList>
                                </TooltipProvider>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <ScrollArea className="h-full w-full">
                                    <div className="p-6">
                                        <TabsContent value="taskDetails" className="mt-0">
                                            {
                                                selectedTask ? (
                                                    <div className="space-y-6">
                                                        <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
                                                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                                                                {selectedTask.title}
                                                            </h2>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge className={DIFFICULTY_BADGE}>
                                                                    {selectedTask.difficulty}
                                                                </Badge>
                                                                {
                                                                    selectedTask.category && (
                                                                        <Badge variant="outline">
                                                                            {selectedTask.category}
                                                                        </Badge>
                                                                    )
                                                                }
                                                                {
                                                                    selectedTask.estimatedTime && (
                                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            {selectedTask.estimatedTime}
                                                                        </Badge>
                                                                    )
                                                                }
                                                            </div>
                                                            {
                                                                selectedTask.tags && selectedTask.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                                        {
                                                                            selectedTask.tags.map((tag, idx) => (
                                                                                <span
                                                                                    key={idx}
                                                                                    className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded"
                                                                                >
                                                                                    {tag}
                                                                                </span>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                )
                                                            }

                                                            <div className="flex items-center gap-2 mt-4">
                                                                {
                                                                    statusOptions.map((option) => (
                                                                        <Button
                                                                            key={option.value}
                                                                            variant={taskStatuses[selectedTask.id] === option.value ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            onClick={() => handleTaskStatusChange(selectedTask.id, option.value)}
                                                                            className={cn(
                                                                                'gap-1',
                                                                                taskStatuses[selectedTask.id] === option.value && 'bg-neutral-800 hover:bg-neutral-700'
                                                                            )}
                                                                        >
                                                                            {option.label}
                                                                        </Button>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>

                                                        {
                                                            selectedTask.Learns && selectedTask.Learns.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                                                                        <Lightbulb className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                                        Key Learns
                                                                    </h4>
                                                                    <div className="space-y-3">
                                                                        {
                                                                            selectedTask.Learns.map((learn, idx) => (
                                                                                <Collapsible key={idx}>
                                                                                    <CollapsibleTrigger asChild>
                                                                                        <div className="p-3 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900/30 transition-colors">
                                                                                            <div className="flex items-center justify-between">
                                                                                                <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100">{learn.title}</p>
                                                                                                <ChevronDown className="w-4 h-4 text-neutral-800 dark:text-neutral-100" />
                                                                                            </div>
                                                                                            <p className="text-xs text-neutral-700 dark:text-neutral-100 mt-1">{learn.summary}</p>
                                                                                        </div>
                                                                                    </CollapsibleTrigger>
                                                                                    <CollapsibleContent>
                                                                                        <div className="mt-2 p-3 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-lg space-y-3 text-sm">
                                                                                            {
                                                                                                learn.keyPoints && learn.keyPoints.length > 0 && (
                                                                                                    <div>
                                                                                                        <p className="font-medium text-neutral-800 dark:text-neutral-100 text-xs mb-1">Key Points:</p>
                                                                                                        <ul className="list-disc list-inside text-xs text-neutral-700 dark:text-neutral-100 space-y-1">
                                                                                                            {
                                                                                                                learn.keyPoints.slice(0, 5).map((point, pidx) => (
                                                                                                                    <li key={pidx}>{point}</li>
                                                                                                                ))
                                                                                                            }
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )
                                                                                            }
                                                                                            {
                                                                                                learn.bestPractices && learn.bestPractices.length > 0 && (
                                                                                                    <div>
                                                                                                        <p className="font-medium text-neutral-800 dark:text-neutral-100 text-xs mb-1">Best Practices:</p>
                                                                                                        <ul className="list-disc list-inside text-xs text-neutral-700 dark:text-neutral-100 space-y-1">
                                                                                                            {
                                                                                                                learn.bestPractices.slice(0, 3).map((practice, pidx) => (
                                                                                                                    <li key={pidx}>{practice}</li>
                                                                                                                ))
                                                                                                            }
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )
                                                                                            }
                                                                                            {
                                                                                                learn.commonMistakes && learn.commonMistakes.length > 0 && (
                                                                                                    <div>
                                                                                                        <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">Common Mistakes:</p>
                                                                                                        <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-400 space-y-1">
                                                                                                            {
                                                                                                                learn.commonMistakes.slice(0, 3).map((mistake, midx) => (
                                                                                                                    <li key={midx}>{mistake}</li>
                                                                                                                ))
                                                                                                            }
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )
                                                                                            }
                                                                                        </div>
                                                                                    </CollapsibleContent>
                                                                                </Collapsible>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            selectedTask.description && selectedTask.description.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                                                                        <Code2 className="w-4 h-4" />
                                                                        What to Build
                                                                    </h4>
                                                                    <ol className="space-y-3">
                                                                        {
                                                                            selectedTask.description.map((step, idx) => (
                                                                                <li key={idx} className="flex gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                                                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100 flex items-center justify-center text-xs font-medium">
                                                                                        {idx + 1}
                                                                                    </span>
                                                                                    <span className="leading-relaxed pt-0.5">{step}</span>
                                                                                </li>
                                                                            ))
                                                                        }
                                                                    </ol>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            selectedTask.criteria && selectedTask.criteria.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                                                                        <Target className="w-4 h-4" />
                                                                        Success Criteria
                                                                    </h4>
                                                                    <ul className="space-y-2">
                                                                        {
                                                                            selectedTask.criteria.map((criterion, idx) => (
                                                                                <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                                                                    <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200 flex-shrink-0 mt-0.5" />
                                                                                    {criterion}
                                                                                </li>
                                                                            ))
                                                                        }
                                                                    </ul>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            selectedTask.hints && selectedTask.hints.length > 0 && (
                                                                <Collapsible open={hintsOpen} onOpenChange={setHintsOpen}>
                                                                    <CollapsibleTrigger asChild>
                                                                        <Button variant="ghost" className="w-full justify-between p-4 bg-neutral-50 dark:bg-neutral-800/20 hover:bg-neutral-100 dark:hover:bg-neutral-800/30 rounded-xl">
                                                                            <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-100">
                                                                                <Lightbulb className="w-4 h-4" />
                                                                                {selectedTask.hints.length} Hints Available
                                                                            </span>
                                                                            <ChevronDown className={cn('w-4 h-4 transition-transform', hintsOpen && 'rotate-180')} />
                                                                        </Button>
                                                                    </CollapsibleTrigger>
                                                                    <CollapsibleContent>
                                                                        <ul className="mt-3 space-y-2 p-4 bg-neutral-50/50 dark:bg-neutral-800/10 rounded-xl">
                                                                            {
                                                                                selectedTask.hints.map((hint, idx) => (
                                                                                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-800 dark:text-neutral-100">
                                                                                        <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                                        {hint}
                                                                                    </li>
                                                                                ))
                                                                            }
                                                                        </ul>
                                                                    </CollapsibleContent>
                                                                </Collapsible>
                                                            )
                                                        }
                                                        {
                                                            selectedTask.terminalCommand && (
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                                                                        <Terminal className="w-4 h-4" />
                                                                        Terminal Command
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 p-3 bg-neutral-900 dark:bg-black rounded-xl">
                                                                        <code className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 font-mono">
                                                                            $ {selectedTask.terminalCommand}
                                                                        </code>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={handleCopyCommand}
                                                                            className="text-neutral-600 dark:text-neutral-400 hover:text-white"
                                                                        >
                                                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            selectedTask.assessmentType && selectedTask.assessmentType !== 'NONE' && (() => {
                                                                const assessmentStatus = taskAssessmentStatus[selectedTask.id]
                                                                const hasAttempted = assessmentStatus && assessmentStatus.attempts > 0

                                                                return (
                                                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                                                                        {
                                                                            hasAttempted && (
                                                                                <div className={cn(
                                                                                    "p-3 rounded-lg border",
                                                                                    assessmentStatus.passed
                                                                                        ? "bg-neutral-50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800"
                                                                                        : "bg-neutral-50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800"
                                                                                )}>
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            {
                                                                                                assessmentStatus.passed ? (
                                                                                                    <CheckCircle2 className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                                                                ) : (
                                                                                                    <AlertTriangle className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                                                                )
                                                                                            }
                                                                                            <span className={cn(
                                                                                                "font-medium text-sm",
                                                                                                assessmentStatus.passed
                                                                                                    ? "text-neutral-800 dark:text-neutral-100"
                                                                                                    : "text-neutral-800 dark:text-neutral-100"
                                                                                            )}>
                                                                                                {assessmentStatus.passed ? "Assessment Passed!" : "Not Passed Yet"}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="text-right">
                                                                                            <p className={cn(
                                                                                                "text-lg font-bold",
                                                                                                assessmentStatus.passed
                                                                                                    ? "text-neutral-800 dark:text-neutral-100"
                                                                                                    : "text-neutral-800 dark:text-neutral-100"
                                                                                            )}>
                                                                                                {assessmentStatus.score ?? 0}%
                                                                                            </p>
                                                                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                                                {assessmentStatus.attempts} attempt{assessmentStatus.attempts !== 1 ? 's' : ''}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        }
                                                                        <Button
                                                                            onClick={handleStartAssessment}
                                                                            className={cn(
                                                                                "w-full",
                                                                                selectedTask.assessmentType === 'QUIZ'
                                                                                    ? "bg-neutral-800 hover:bg-neutral-700 text-white"
                                                                                    : "bg-neutral-800 hover:bg-neutral-700 text-white"
                                                                            )}
                                                                        >
                                                                            {
                                                                                selectedTask.assessmentType === 'QUIZ' ? (
                                                                                    <>
                                                                                        <Brain className="w-4 h-4 mr-2" />
                                                                                        {hasAttempted ? 'Retake Quiz' : 'Take Quiz Assessment'}
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Code2 className="w-4 h-4 mr-2" />
                                                                                        {hasAttempted ? 'Retry Code Challenge' : 'Take Code Challenge'}
                                                                                    </>
                                                                                )
                                                                            }
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            })()
                                                        }
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500 dark:text-neutral-400">
                                                        <FileText className="w-12 h-12 text-neutral-600 dark:text-neutral-400 mb-4" />
                                                        <p className="text-sm">Select a task to view details</p>
                                                    </div>
                                                )
                                            }
                                        </TabsContent>
                                        <TabsContent value="assessment" className="mt-0">
                                            {
                                                selectedMockSprintId && activeSprint ? (
                                                    <SprintMockInterview
                                                        projectId={project.id}
                                                        sprintId={selectedMockSprintId}
                                                        sprintName={activeSprint.name}
                                                        sprintNumber={activeSprint.sprintNumber}
                                                        onComplete={(score) => {
                                                            toast.success(`Mock interview completed with score: ${score}%`)
                                                            setSelectedMockSprintId(null)
                                                            setActiveTab('resources')
                                                        }}
                                                    />
                                                ) : selectedTask ? (
                                                    isLoadingAssessment ? (
                                                        <div className="flex flex-col items-center justify-center h-[50vh]">
                                                            <InlineLoader size="lg" className="text-neutral-800 dark:text-neutral-200 mb-4" />
                                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading assessment...</p>
                                                        </div>
                                                    ) : selectedTask.assessmentType === 'QUIZ' && quizQuestions.length > 0 ? (
                                                        <Quiz
                                                            quizId={`task-${selectedTask.id}`}
                                                            questions={quizQuestions}
                                                            title={`Quiz: ${selectedTask.title}`}
                                                            mode="assessment"
                                                            immediateResults={true}
                                                            allowSkip={false}
                                                            allowHints={true}
                                                            onComplete={handleQuizComplete}
                                                            onExit={() => {
                                                                setQuizQuestions([])
                                                                setActiveTab('taskDetails')
                                                            }}
                                                        />
                                                    ) : selectedTask.assessmentType === 'CODE' && codeInstructions ? (
                                                        <div className="space-y-4">
                                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                                                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
                                                                    Code Challenge: {selectedTask.title}
                                                                </h3>
                                                                <p className="text-sm text-neutral-700 dark:text-neutral-100 whitespace-pre-wrap">
                                                                    {codeInstructions}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                                                <CodeEditor
                                                                    code={userCode}
                                                                    language={codeLanguage}
                                                                    height="400px"
                                                                    onChange={(code) => setUserCode(code)}
                                                                    showLanguageSelector={false}
                                                                    showCopyButton={true}
                                                                    showRunButton={false}
                                                                    placeholder="Write your solution here..."
                                                                />
                                                            </div>

                                                            {
                                                                codeResult && (
                                                                    <div className={cn(
                                                                        "p-4 rounded-lg border-2",
                                                                        codeResult.passed
                                                                            ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20"
                                                                            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20"
                                                                    )}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            {
                                                                                codeResult.passed ? (
                                                                                    <CheckCircle2 className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                                                                                ) : (
                                                                                    <AlertTriangle className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                                                                                )
                                                                            }
                                                                            <span className="font-semibold">
                                                                                {codeResult.passed ? 'Challenge Passed!' : 'Not Quite Right'}
                                                                            </span>
                                                                            <Badge variant="secondary">Score: {codeResult.score}%</Badge>
                                                                        </div>
                                                                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{codeResult.feedback}</p>
                                                                        {
                                                                            codeResult.suggestions.length > 0 && (
                                                                                <div className="mt-2">
                                                                                    <p className="text-sm font-medium">Suggestions:</p>
                                                                                    <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400">
                                                                                        {
                                                                                            codeResult.suggestions.map((s, i) => (
                                                                                                <li key={i}>{s}</li>
                                                                                            ))
                                                                                        }
                                                                                    </ul>
                                                                                </div>
                                                                            )
                                                                        }
                                                                    </div>
                                                                )
                                                            }

                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setCodeInstructions('')
                                                                        setCodeResult(null)
                                                                        setActiveTab('taskDetails')
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    onClick={handleSubmitCode}
                                                                    disabled={isLoadingAssessment || !userCode.trim()}
                                                                    className="bg-neutral-800 hover:bg-neutral-700 text-white"
                                                                >
                                                                    {
                                                                        isLoadingAssessment ? (
                                                                            <InlineLoader size="sm" className="mr-2" />
                                                                        ) : null
                                                                    }
                                                                    Submit Code
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500 dark:text-neutral-400">
                                                            <Brain className="w-12 h-12 text-neutral-600 dark:text-neutral-400 mb-4" />
                                                            <p className="text-sm">
                                                                {
                                                                    selectedTask.assessmentType === 'NONE'
                                                                        ? "This task doesn't require an assessment"
                                                                        : "Click 'Start Assessment' from Task Details to begin"
                                                                }
                                                            </p>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-500 dark:text-neutral-400">
                                                        <Brain className="w-12 h-12 text-neutral-600 dark:text-neutral-400 mb-4" />
                                                        <p className="text-sm">Select a task or mock interview to view assessments</p>
                                                    </div>
                                                )
                                            }
                                        </TabsContent>
                                        <TabsContent value="standup" className="mt-0">
                                            <DailyStandupTab
                                                projectId={project.id}
                                                projectSlug={project.slug}
                                                projectTitle={project.title}
                                                userCredits={userCredits}
                                            />
                                        </TabsContent>
                                        <TabsContent value="resources" className="mt-0">
                                            <ResourcesList
                                                projectId={project.id}
                                                currentUserId={currentUserId}
                                                isCreator={isCreator}
                                            />
                                        </TabsContent>
                                        <TabsContent value="errors" className="mt-0">
                                            <ErrorsTab
                                                projectId={project.id}
                                                isEnrolled={isEnrolled}
                                                isCreator={isCreator}
                                            />
                                        </TabsContent>
                                    </div>
                                </ScrollArea>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>

            <Sheet open={railOpen} onOpenChange={setRailOpen}>
                <SheetContent side="left" className="flex w-80 max-w-[85vw] flex-col gap-0 p-0 md:hidden">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Sprints</SheetTitle>
                    </SheetHeader>
                    {sprintRail}
                </SheetContent>
            </Sheet>

            <SprintGenerationSheet
                projectId={project.id}
                isOpen={isSprintGenOpen}
                onClose={() => setIsSprintGenOpen(false)}
                isCreator={isCreator}
            />
        </div>
    )
}