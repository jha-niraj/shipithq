// Pathfinder Types - Centralized type definitions for the Pathfinder (AI Learning Goals) feature
import { PathfinderStatus, PathfinderCategory, PathfinderLevel } from '@repo/db'
import type { AnimatedIconName } from '@repo/ui/components/animated-icons'

// Goal duration presets (matches PathfinderGoalDuration enum)
export const GOAL_DURATION_OPTIONS = [
    { value: 'ONE_WEEK', label: '1 Week', days: 7 },
    { value: 'FORTNIGHT', label: 'Fortnight', days: 14 },
    { value: 'ONE_MONTH', label: '1 Month', days: 30 },
    { value: 'TWO_MONTHS', label: '2 Months', days: 60 },
    { value: 'THREE_MONTHS', label: '3 Months', days: 90 },
    { value: 'SIX_MONTHS', label: '6 Months', days: 180 },
    { value: 'CUSTOM', label: 'Custom', days: null },
] as const

// =========================================
// Core Types
// =========================================

export interface PathfinderGoal {
    id: string
    slug: string
    title: string
    category: PathfinderCategory
    level: PathfinderLevel
    focusAreas: string[]
    status: PathfinderStatus
    progressPercent: number
    totalSubGoals: number
    completedSubGoals: number
    totalQuizAnswered: number
    totalCodingSolved: number
    streakDays: number
    lastActivityAt: Date | null
    estimatedDays: number | null
    duration?: string | null
    overview: string | null
    createdAt: Date
    startedAt: Date | null
    completedAt: Date | null
    groupId: string | null
}

/** Minimal shape for home page goals (from home action) */
export interface PathfinderGoalSummary {
    id: string
    slug: string
    title: string
    category: PathfinderCategory
    status: PathfinderStatus
    progressPercent: number
    totalSubGoals: number
    completedSubGoals: number
    estimatedDays: number | null
    duration?: string | null
    focusAreas: string[]
}

export interface PathfinderGroup {
    id: string
    name: string
    emoji: string | null
    color: string | null
    description: string | null
    order: number
    _count?: { goals: number }
}

export interface PathfinderSubGoal {
    id: string
    title: string
    description: string | null
    isCompleted: boolean
    completedAt: Date | null
    quizCompleted: boolean
    codingCompleted: boolean
    aiQuizQuestions: QuizQuestion[] | null
    aiCodingProblem: CodingProblem | null
    createdAt: Date
}

export interface PathfinderDailySession {
    id: string
    date: Date
    goalId: string
    subGoals: PathfinderSubGoal[]
    totalQuizAnswered: number
    totalCodingSolved: number
    isCompleted: boolean
}

// =========================================
// Quiz & Coding Types
// =========================================

export interface QuizQuestion {
    question: string
    options: string[]
    correctAnswer: number
    explanation?: string
}

export interface CodingProblem {
    title: string
    description: string
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    starterCode?: string
    testCases?: PathfinderTestCase[]
    hints?: string[]
    solution?: string
}

export interface PathfinderTestCase {
    input: string
    expectedOutput: string
    isHidden?: boolean
}

export interface QuizAttempt {
    id: string
    subGoalId: string
    answers: number[]
    score: number
    totalQuestions: number
    completedAt: Date
}

export interface CodingSubmission {
    id: string
    subGoalId: string
    code: string
    language: string
    isCorrect: boolean
    feedback: string | null
    submittedAt: Date
}

// =========================================
// Verification Types
// =========================================

export interface PathfinderVerification {
    id: string
    goalId: string
    type: 'QUIZ' | 'CODING' | 'PROJECT' | 'MOCK_INTERVIEW'
    status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
    score: number | null
    maxScore: number | null
    feedback: string | null
    attemptCount: number
    lastAttemptAt: Date | null
    passedAt: Date | null
}

export interface VerificationQuiz {
    questions: QuizQuestion[]
    passingScore: number
    timeLimit?: number
}

export interface VerificationProject {
    title: string
    description: string
    requirements: string[]
    submissionUrl?: string
    feedback?: string
}

/** AI-generated verification content (from OpenAI assistant on verify) */
export interface VerificationAIPlan {
    subject?: string
    category?: string
    level?: string
    overview?: string
    learningObjectives?: string[]
    prerequisites?: string[]
    quizQuestions?: Array<{
        id: string
        question: string
        options: string[]
        correctAnswer: number
        explanation: string
        difficulty: string
        category: string
        codeSnippet?: string | null
    }>
    codingQuestions?: Array<{
        id: string
        title: string
        description: string
        difficulty: string
        category: string
        constraints: string[]
        examples: Array<{ input: string; output: string; explanation?: string }>
        hints: string[]
        starterCode: { javascript: string; python: string; java?: string }
        solution: { javascript: string; python: string; explanation: string; timeComplexity: string; spaceComplexity: string }
        testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>
    }>
    mockInterview?: {
        title: string
        description: string
        duration: number
        questionsCount: number
        knowledgeBase: string
    }
    minorProject?: { title: string; description: string; technologies: string[] } | null
    majorProject?: { title: string; description: string; technologies: string[]; features: string[] } | null
}

// =========================================
// Learning Plan Types (from OpenAI Assistant)
// =========================================

export interface LearningPlan {
    subject: string
    duration: number
    level: 'Beginner' | 'Intermediate' | 'Advanced'
    overview: string
    minorProject: ProjectPlan
    majorProject: ProjectPlan
    verification: VerificationPlan
}

export interface ProjectPlan {
    title: string
    description: string
    requirements?: string[]
}

export interface VerificationPlan {
    quizQuestions: QuizQuestion[]
    codingChallenges: CodingProblem[]
    mockInterviewTopics: string[]
}

// =========================================
// Props Types
// =========================================

export interface PathfinderDashboardProps {
    initialGoals: PathfinderGoal[]
    initialGroups: PathfinderGroup[]
}

export interface GoalDetailsProps {
    goal: PathfinderGoal & {
        verification?: PathfinderVerification | null
        learningPlan?: LearningPlan | null
    }
}

export interface DailyPracticeProps {
    goal: PathfinderGoal
    session: PathfinderDailySession | null
}

export interface CreateGoalSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (goalId: string, slug: string) => void
    groups?: PathfinderGroup[]
    onGroupCreated?: (group: PathfinderGroup) => void
}

export interface CreateGroupSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (group: PathfinderGroup) => void
}

export interface AssignGoalSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    goalId: string | null
    currentGroupId: string | null
    groups: PathfinderGroup[]
    onAssign?: (goalId: string, groupId: string | null) => void
}

// =========================================
// Configuration Types
// =========================================

export interface CategoryConfig {
    /**
     * Name in `@repo/ui/components/animated-icons`. This is what display
     * surfaces should render.
     */
    icon: AnimatedIconName
    /**
     * KEPT, but only for surfaces too small for a drawn icon - a 12px inline
     * chip, a plain-text notification. Emoji render differently on every OS and
     * cannot inherit `currentColor`, so a coloured one sits unchanged inside a
     * dark selected card. Prefer `icon`.
     */
    emoji: string
    color: string
    bg: string
}

export interface StatusConfig {
    label: string
    icon: React.ReactNode
    color: string
    bg: string
}

export const PATHFINDER_CATEGORIES: Record<PathfinderCategory, CategoryConfig> = {
    DSA: { icon: 'dsa', emoji: '🧮', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    WEB_DEVELOPMENT: { icon: 'web-dev', emoji: '🌐', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    FRONTEND: { icon: 'frontend', emoji: '🎨', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    BACKEND: { icon: 'backend', emoji: '⚙️', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    DEVOPS: { icon: 'devops', emoji: '🚀', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    AI_ML: { icon: 'ai-ml', emoji: '🤖', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    DATABASE: { icon: 'database', emoji: '🗄️', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    SYSTEM_DESIGN: { icon: 'system-design', emoji: '🏗️', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    MOBILE: { icon: 'mobile', emoji: '📱', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    INTERVIEW_PREP: { icon: 'interview-prep', emoji: '🎯', color: 'text-neutral-800', bg: 'bg-neutral-900/10' },
    OTHER: { icon: 'learning', emoji: '📚', color: 'text-neutral-600', bg: 'bg-neutral-500/10' },
}

// =========================================
// Form Input Types
// =========================================

export interface CreateGoalInput {
    title: string
    slug?: string
    category: PathfinderCategory
    level: PathfinderLevel
    focusAreas: string[]
    estimatedDays?: number
    duration?: 'ONE_WEEK' | 'FORTNIGHT' | 'ONE_MONTH' | 'TWO_MONTHS' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'CUSTOM' | null
    groupId?: string | null
}

export interface CreateGroupInput {
    name: string
    emoji?: string
    color?: string
    description?: string
}

export interface CreateSubGoalInput {
    sessionId: string
    title: string
    description?: string
}
