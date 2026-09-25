/**
 * Interview configuration types for the Hiring Platform
 * These types handle interview processes, rounds, and mock sessions
 */

// ============================================
// ENUMS (Mirror Prisma enums)
// ============================================

export type InterviewRoundType = 
    | "PHONE_SCREEN"
    | "TECHNICAL_CODING"
    | "SYSTEM_DESIGN"
    | "BEHAVIORAL"
    | "TAKE_HOME"
    | "PANEL"
    | "HIRING_MANAGER"
    | "CULTURE_FIT"
    | "HR_FINAL"
    | "CUSTOM"
    // Scored hiring rounds (plan/hiring-rounds HR-1); the builder offers them from HR-10.
    | "APTITUDE"
    | "DSA"
    | "VOICE_BEHAVIOURAL"
    | "VOICE_CULTURE"

export type InterviewFormat = 
    | "VOICE"
    | "VIDEO"
    | "IN_PERSON"
    | "TAKE_HOME"
    | "LIVE_CODING"
    | "WHITEBOARD"

export type JobMockSessionType = 
    | "VOICE"
    | "CODING"
    | "SYSTEM_DESIGN"
    | "BEHAVIORAL"

export type JobMockStatus = 
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED"

// ============================================
// INTERVIEW ROUND INTERFACES
// ============================================

export interface InterviewRoundInput {
    roundNumber: number
    roundType: InterviewRoundType
    title: string
    durationMinutes?: number
    format?: InterviewFormat
    description: string
    whatToExpect?: string[]
    sampleQuestions?: string[]
    evaluationCriteria?: string[]
    topicsCovered?: string[]
    tipsForCandidates?: string[]
    passRatePercent?: number
    daysToNextRound?: number
    hasMockInterview?: boolean
    mockKnowledgeBase?: string
}

export interface InterviewRound {
    id: string
    processId: string
    roundNumber: number
    roundType: InterviewRoundType
    title: string
    durationMinutes: number | null
    format: InterviewFormat
    description: string
    whatToExpect: string[]
    sampleQuestions: string[]
    evaluationCriteria: string[]
    topicsCovered: string[]
    tipsForCandidates: string[]
    passRatePercent: number | null
    daysToNextRound: number | null
    hasMockInterview: boolean
    mockKnowledgeBase: string | null
    createdAt: Date
    updatedAt: Date
}

// ============================================
// INTERVIEW PROCESS INTERFACES
// ============================================

export interface InterviewProcessInput {
    name: string
    description?: string
    isDefault?: boolean
    estimatedDurationWeeks?: number
    rounds: InterviewRoundInput[]
}

export interface InterviewProcess {
    id: string
    /** Null only for ShipItHQ's platform pipelines (plan/hiring-rounds HR-1). */
    companyId: string | null
    name: string
    description: string | null
    isDefault: boolean
    isActive: boolean
    estimatedDurationWeeks: number | null
    avgTimeToHireDays: number | null
    responseRatePercent: number | null
    applicationToInterviewPercent: number | null
    interviewToOfferPercent: number | null
    rounds: InterviewRound[]
    _count?: {
        jobs: number
    }
    createdAt: Date
    updatedAt: Date
}

export interface InterviewProcessStats {
    processCount: number
    totalRounds: number
    jobsWithProcess: number
}

// ============================================
// MOCK SESSION INTERFACES
// ============================================

export interface CreateMockSessionInput {
    userId: string
    companyId: string
    roundId: string
    jobId?: string
    sessionType?: JobMockSessionType
    scheduledFor?: Date
}

export interface MockSession {
    id: string
    userId: string
    companyId: string
    roundId: string
    jobId: string | null
    sessionType: JobMockSessionType
    status: JobMockStatus
    scheduledFor: Date | null
    startedAt: Date | null
    completedAt: Date | null
    durationSeconds: number | null
    overallScore: number | null
    createdAt: Date
    updatedAt: Date
}

export interface MockSessionFilters {
    userId?: string
    status?: JobMockStatus
}

export interface UpdateMockSessionData {
    status?: JobMockStatus
    startedAt?: Date
    completedAt?: Date
    durationSeconds?: number
    overallScore?: number
}

export interface MockStats {
    totalSessions: number
    completedSessions: number
    averageScore: number
    topPerformers: number
    sessionsByRound: Array<{
        roundType: string
        count: number
    }>
}
