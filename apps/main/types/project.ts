// ProjectV2 Types for ShipItHQ Platform
// This file contains all type definitions for the ProjectV2 system

import {
    projectV2VisibilityEnum,
    projectV2DifficultyEnum,
    userProjectV2StatusEnum,
    quizV2DifficultyEnum,
} from "@repo/db";

type ProjectV2Visibility = typeof projectV2VisibilityEnum.enumValues[number];
type ProjectV2Difficulty = typeof projectV2DifficultyEnum.enumValues[number];
type UserProjectV2Status = typeof userProjectV2StatusEnum.enumValues[number];
type QuizV2Difficulty = typeof quizV2DifficultyEnum.enumValues[number];

// ============================================================================
// Core Project Types
// ============================================================================

export interface ProjectV2Stack {
    frontend?: string | null
    backend?: string | null
    database?: string | null
    deployment?: string | null
}

// Enhanced Feature interface
export interface ProjectV2Feature {
    name: string
    description: string
    priority: 'must-have' | 'should-have' | 'nice-to-have'
    complexity: 'low' | 'medium' | 'high'
}

// Technical Requirements interface
export interface ProjectV2TechnicalRequirements {
    database: string
    authentication: string
    hosting: string
    thirdPartyAPIs: string[]
}

// Data Architecture interfaces
export interface ProjectV2DataModel {
    name: string
    purpose: string
    fields: Array<{
        name: string
        type: string
        required: boolean
        description: string
    }>
    relationships: string[]
}

export interface ProjectV2Endpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    path: string
    purpose: string
    requiresAuth: boolean
    requestExample?: string
    responseExample?: string
}

export interface ProjectV2DataArchitecture {
    models: ProjectV2DataModel[]
    endpoints: ProjectV2Endpoint[]
}

// Project Structure interface
export interface ProjectV2ProjectStructure {
    description: string
    tree: string  // ASCII tree representation
    keyFolders: Array<{
        path: string
        purpose: string
        exampleFiles: string[]
    }>
}

// Setup Guide interface
export interface ProjectV2SetupGuide {
    prerequisites: string[]
    environmentVariables: Array<{
        name: string
        purpose: string
        required: boolean
        exampleValue: string
    }>
    installationSteps: string[]
    verificationSteps: string[]
}

// Sprint interface
export interface ProjectV2Sprint {
    id: string
    sprintNumber: number
    name: string
    goal: string
    duration: string
    orderIndex: number
    tasks?: ProjectV2Task[]
}

// Page Layout interfaces
export interface ProjectV2PageLayout {
    type: 'single-column' | 'two-column' | 'dashboard' | 'split' | 'marketing-landing'
    sections: Array<{
        name: string
        purpose: string
        priority: number
    }>
}

export interface ProjectV2PageComponent {
    name: string
    type: 'form' | 'table' | 'card' | 'navigation' | 'modal' | 'list' | 'section'
    description: string
    interactivity: string[]
}

export interface ProjectV2Page {
    id: string
    name: string
    difficulty: string
    coreFeatures: string[]
    recommendedComponents: string[]
    orderIndex?: number
    // Enhanced fields
    route?: string | null
    purpose?: string | null
    estimatedTime?: string | null
    layout?: ProjectV2PageLayout | null
    components?: ProjectV2PageComponent[] | null
    userInteractions?: string[]
    dataNeeded?: string[]
}

export interface ProjectV2Creator {
    id: string
    name: string | null
    username: string | null
    email: string | null
}

export interface ProjectV2Progress {
    id: string
    userId: string
    projectId: string
    status: UserProjectV2Status
    progressPercentage: number
    tasksCompleted: number
    totalTasks: number
    startedAt: Date
    completedAt: Date | null
    lastAccessedAt: Date
    taskStatuses?: Array<{
        taskId: string
        status: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'
        completedAt?: Date | null
        notes?: string | null
    }>
}

export interface ProjectV2Basic {
    id: string
    slug: string
    title: string
    description: string
    shortDescription: string | null
    difficulty: ProjectV2Difficulty
    generationType: string // FULL_STACK | FRONTEND | PROGRAMS | AI_AGENT | OTHER
    visibility: ProjectV2Visibility
    estimatedHours: number
    technologies: string[]
    stacks: ProjectV2Stack | null
    includeAssessment: boolean
    totalViews: number
    totalStarted: number
    totalSubmissions: number
    createdAt: Date
    updatedAt: Date
}

export interface ProjectV2Full extends ProjectV2Basic {
    blueprintOverview: string
    // Enhanced Project Context
    vision?: string | null
    targetAudience?: string | null
    problemSolution?: string | null
    estimatedDuration?: string | null
    keyOutcomes: string[]
    // Features with priority/complexity
    features?: ProjectV2Feature[] | null
    // Technical Documentation
    technicalRequirements?: ProjectV2TechnicalRequirements | null
    dataArchitecture?: ProjectV2DataArchitecture | null
    projectStructure?: ProjectV2ProjectStructure | null
    setupGuide?: ProjectV2SetupGuide | null
    // Relations
    pages: ProjectV2Page[]
    creator: ProjectV2Creator
    progress?: ProjectV2Progress[]
    // Tasks are now accessed THROUGH sprints (Sprint → Tasks)
    sprints: ProjectV2Sprint[] // Required - tasks are nested in sprints
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'
export type TaskAssessmentType = 'QUIZ' | 'CODE' | 'NONE'
export type TaskResourceType = 'documentation' | 'article' | 'video' | 'tutorial'

export interface ProjectV2TaskProgress {
    status: TaskStatus
    notes: string | null
    completedAt: Date | null
}

// Learn structure for detailed learning content
export interface TaskLearn {
    title: string
    summary: string // 50-100 words
    keyPoints: string[] // 10-15 detailed bullet points
    commonMistakes: string[] // 3-5 pitfalls to avoid
    bestPractices: string[] // 5-8 industry standards
    realWorldUsage: string // How major companies use this
    securityConsiderations: string[] // 2-4 security implications
    relatedLearns: string[] // 3-5 related Learns
}

// Resource for external learning materials
export interface TaskResource {
    title: string
    url: string
    type: TaskResourceType
}

export interface ProjectV2Task {
    id: string
    title: string
    description: string[] // 3-7 practical steps
    successCriteria: string[]
    hints: string[] // 2-4 helpful tips
    estimatedMinutes: number
    difficulty: string
    order: number
    userProgress?: ProjectV2TaskProgress
    // Sprint-based organization
    sprintId?: string | null
    category?: string | null // setup, frontend, backend, database, testing, deployment, integration
    estimatedTime?: string | null
    checkpoints?: string[]
    relatedPages?: string[]
    dependencies?: string[]
    badges?: string[]
    tags?: string[]
    terminalCommand?: string | null
    orderIndex?: number
    criteria?: string[]
    // NEW: Enhanced learning content
    learningObjectives?: string[] // 3-5 skills user gains
    prerequisites?: string[] // Prior knowledge needed
    resources?: TaskResource[] // Verified external resources
    testingGuidelines?: string[] // 3-5 things to test
    Learns?: TaskLearn[] // Detailed learning Learns
    assessmentType?: TaskAssessmentType
}

export interface TasksColumns {
    todo: ProjectV2Task[]
    inProgress: ProjectV2Task[]
    completed: ProjectV2Task[]
}

export interface TasksPageData {
    projectTitle: string
    progress: ProjectV2Progress
    columns: TasksColumns
}

// ============================================================================
// Quiz Types
// ============================================================================

export interface QuizQuestion {
    id: string
    difficulty: QuizV2Difficulty
    prompt: string
    options: string[]
    /** The answer key, SERVER SIDE ONLY. The quiz page never sends these to the
     *  browser before the attempt is submitted; submitting returns them with the
     *  result. Optional here because the client's copy does not carry them. */
    correctAnswer?: number
    explanation?: string
    orderIndex: number
}

export interface Quiz {
    id: string
    totalQuestions: number
    questions: QuizQuestion[]
}

export interface QuizAttempt {
    id: string
    score: number
    correctAnswers: number
    totalQuestions: number
    timeSpent: number | null
    completedAt: Date | null
    createdAt: Date
}

export interface QuizAnswer {
    questionId: string
    selectedAnswer: number
    isCorrect: boolean
    correctAnswer: number
    explanation: string
}

export interface QuizResult {
    id: string
    score: number
    correctAnswers: number
    totalQuestions: number
    answers: QuizAnswer[]
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ProjectDetailsClientProps {
    project: ProjectV2Full
    currentUserId?: string | null
    userCredits?: number
    currentUser?: {
        id: string
        username?: string | null
        name?: string | null
    }
}

export interface TasksPageClientProps {
    project: {
        title: string
        slug: string
    }
    tasks: TasksColumns
    userProgress?: ProjectV2Progress
}

export interface QuizClientProps {
    project: {
        id: string
        slug: string
        title: string
        description: string
    }
    existingQuiz: Quiz | null
    userCredits: number
    previousAttempts: QuizAttempt[]
}

// ============================================================================
// Form Types
// ============================================================================

export interface ProjectGenerationFormData {
    projectTitle?: string
    projectDescription?: string
    generationType?: string
    technologies?: string[]
    LearnsFocus?: string[]
    stacks?: {
        frontend?: string
        backend?: string
        database?: string
        deployment?: string
        aiProvider?: string
    }
    preferences?: {
        generateNow?: boolean
        pagesPreset?: string
    }
    visibility?: string
    includeAssessment?: boolean
}

export interface ProjectSubmission {
    id: string
    userId: string
    projectId: string
    githubUrl: string
    liveUrl: string | null
    notes: string | null
    status: string // PENDING | APPROVED | REJECTED
    scores: Record<string, unknown> | null
    createdAt: Date
    updatedAt: Date
    submittedAt?: Date
    upvotes?: number
    project?: {
        id: string
        title: string
        slug: string
        difficulty: ProjectV2Difficulty
        technologies?: string[]
    }
    user?: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    }
}

// ============================================================================
// Utility Types
// ============================================================================

export interface StatusColumn {
    title: string
    status: TaskStatus
    tasks: ProjectV2Task[]
    color: string
    icon: React.ComponentType<{ className?: string }>
}

export interface DifficultyColor {
    BEGINNER: string
    INTERMEDIATE: string
    ADVANCED: string
}

export interface QuizDifficultyColor {
    EASY: string
    MEDIUM: string
    HARD: string
}

// ============================================================================
// Team Collaboration Types
// ============================================================================

export type ProjectMemberRole = 'ADMIN' | 'MEMBER'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
export type SprintSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProjectV2Member {
    id: string
    projectId: string
    userId: string
    role: ProjectMemberRole
    joinedAt: Date
    invitedBy?: string | null
    user: {
        id: string
        name: string | null
        username: string | null
        email: string
        image: string | null
    }
}

export interface ProjectV2SprintSuggestion {
    id: string
    projectId: string
    suggestedById: string
    sprintNumber: number
    name: string
    goal: string
    duration: string
    suggestedTasks?: ProjectV2Task[] | null
    status: SprintSuggestionStatus
    reviewedById?: string | null
    reviewedAt?: Date | null
    reviewNote?: string | null
    createdSprintId?: string | null
    createdAt: Date
    updatedAt: Date
    suggestedBy: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    }
    reviewedBy?: {
        id: string
        name: string | null
        username: string | null
    } | null
}

export interface ProjectV2Invitation {
    id: string
    projectId: string
    invitedUserId?: string | null
    invitedEmail?: string | null
    invitedById: string
    role: ProjectMemberRole
    status: InvitationStatus
    inviteToken?: string | null
    expiresAt?: Date | null
    respondedAt?: Date | null
    createdAt: Date
    invitedUser?: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    } | null
    invitedBy: {
        id: string
        name: string | null
        username: string | null
    }
}

// Extended ProjectV2Full with team collaboration
export interface ProjectV2FullWithTeam extends ProjectV2Full {
    members?: ProjectV2Member[]
    sprintSuggestions?: ProjectV2SprintSuggestion[]
    invitations?: ProjectV2Invitation[]
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
}

export type ProjectApiResponse = ApiResponse<ProjectV2Full>
export type TasksApiResponse = ApiResponse<TasksPageData>
export type QuizApiResponse = ApiResponse<Quiz>
export type QuizAttemptApiResponse = ApiResponse<QuizResult>

export interface Suggestion {
    id: string
    title: string
    description: string
    type: string
    tags: string[]
    imageUrl?: string | null
    status: string
    addedToTasks: boolean
    suggestedBy: "CREATOR" | "ENROLLED_USER" | "VISITOR"
    addedByUsers: string[]
    adoptedByCurrentUser?: boolean | null
    createdAt: Date
    user: {
        id: string
        name?: string | null
        username?: string | null
        image?: string | null
    }
    task?: {
        id: string
        title: string
    } | null
}
/**
 * A task as the project detail page and the task board hold it.
 *
 * Lived in `components/projects/task-list-progress.tsx`, which was 738 lines of
 * task list that nothing rendered - a near-verbatim copy of the one in
 * `tasks-page-client.tsx`. The file is deleted (approved by Niraj, 2026-09-23);
 * only the shape it exported was ever used.
 */
export interface TaskItem {
    id: string
    title: string
    description: string[]
    criteria: string[]
    hints: string[]
    badges: string[]
    tags: string[]
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    terminalCommand: string | null
    status: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'
    completedAt: Date | null
    notes: string | null
    orderIndex: number
    sprintId?: string
    sprintName?: string
    sprintNumber?: number
    category?: string | null
    estimatedTime?: string | null
    checkpoints?: string[]
    relatedPages?: string[]
    dependencies?: string[]
}
