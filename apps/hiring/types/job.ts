/**
 * Job-related types for the Hiring Platform
 * These types mirror Prisma enums and are used throughout the app
 */

// ============================================
// ENUMS (Mirror Prisma enums)
// ============================================

export type JobLocationType = "REMOTE" | "HYBRID" | "ONSITE"

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE"

export type JobStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "FILLED"

export type JobVisibility = "PUBLIC" | "INVITE_ONLY"

export type ApplicationStatus =
    | "INTERESTED"
    | "PREPARING"
    | "APPLIED"
    | "UNDER_REVIEW"
    | "SHORTLISTED"
    | "ASSIGNMENT_SENT"
    | "ASSIGNMENT_SUBMITTED"
    | "INTERVIEW_SCHEDULED"
    | "INTERVIEWED"
    | "OFFER_EXTENDED"
    | "HIRED"
    | "REJECTED"
    | "WITHDRAWN"

export type ApplicationActivityType =
    | "MOCK_INTERVIEW"
    | "AI_RESUME_REVIEW"
    | "Learn_REVIEW"
    | "PROJECT_PROGRESS"
    | "STUDIO_NOTE"
    | "SKILL_ASSESSMENT"
    | "ASSIGNMENT_PROGRESS"
    | "ASSIGNMENT_SUBMISSION"

// ============================================
// CUSTOM QUESTION TYPES
// ============================================

export type CustomQuestionType =
    | "text"        // Single line text input
    | "textarea"    // Multi-line text area
    | "select"      // Single select dropdown
    | "multiselect" // Multi-select dropdown/checkboxes
    | "radio"       // Radio button group
    | "checkbox"    // Checkbox (yes/no)
    | "number"      // Numeric input
    | "date"        // Date picker
    | "file"        // File upload

export interface CustomQuestion {
    id: string
    question: string
    type: CustomQuestionType
    required: boolean
    options?: string[]       // For select, multiselect, radio
    placeholder?: string
    minLength?: number       // For text/textarea
    maxLength?: number       // For text/textarea
    min?: number             // For number
    max?: number             // For number
    helperText?: string      // Additional context
    order: number
}

export interface CustomQuestionResponse {
    questionId: string
    answer: string | string[] | number | boolean
    answeredAt: string
}

// ============================================
// JOB INTERFACES
// ============================================

export interface AssignmentDetails {
    title: string
    description: string
    requirements: string[]
    resources: string[]
    deliverables: string[]
    [key: string]: string | string[] // Index signature for Prisma JSON compatibility
}

export interface CreateJobInput {
    title: string
    description: string
    department?: string
    requirements?: string[]
    responsibilities?: string[]
    benefits?: string[]
    location?: string
    locationType: JobLocationType
    employmentType: EmploymentType
    experienceMin?: number
    experienceMax?: number
    salaryMin?: number
    salaryMax?: number
    salaryCurrency?: string
    salaryDisclosed?: boolean
    skillsRequired?: string[]
    skillsPreferred?: string[]
    hasAssignment?: boolean
    assignmentDetails?: AssignmentDetails
    assignmentDeadlineDays?: number
    interviewProcessId?: string
    customQuestions?: CustomQuestion[]
    visibility?: JobVisibility
    status?: JobStatus
}

export interface Job {
    id: string
    companyId: string
    postedById: string
    title: string
    slug: string
    description: string
    requirements: string[]
    responsibilities: string[]
    benefits: string[]
    location: string | null
    locationType: JobLocationType
    employmentType: EmploymentType
    experienceMin: number | null
    experienceMax: number | null
    salaryMin: number | null
    salaryMax: number | null
    salaryCurrency: string
    salaryDisclosed: boolean
    skillsRequired: string[]
    skillsPreferred: string[]
    hasAssignment: boolean
    assignmentDetails: AssignmentDetails | null
    assignmentDeadlineDays: number | null
    interviewProcessId: string | null
    customQuestions: CustomQuestion[] | null
    visibility: JobVisibility
    status: JobStatus
    viewsCount: number
    applicationsCount: number
    publishedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export interface JobStats {
    total: number
    active: number
    paused: number
    draft: number
    closed: number
    totalViews: number
    totalApplications: number
}

// ============================================
// CANDIDATE / APPLICATION INTERFACES
// ============================================

export interface CandidateFilters {
    search?: string
    jobId?: string
    status?: string[]
    skills?: string[]
}

export interface Candidate {
    id: string
    applicationId: string
    userId: string
    name: string
    email: string
    image: string | null
    jobId: string
    jobTitle: string
    status: ApplicationStatus
    appliedAt: Date
    matchScore: number | null
    currentRound: number | null
    skills: string[]
    resumeUrl: string | null
}

export interface AssignmentSubmission {
    submissionUrl?: string
    score?: number
    feedback?: string
    codeLanguage?: string
}

// ============================================
// PREP PROGRESS INTERFACES
// ============================================

export interface BestScores {
    [roundType: string]: number
}

export interface RecommendedResource {
    title: string
    url: string
    type: string
    [key: string]: string // Index signature for Prisma JSON compatibility
}

export interface PrepProgressData {
    overallReadinessScore?: number
    roundsCompleted?: number
    totalRounds?: number
    lastPracticedAt?: Date
    totalPracticeSessionsIncrement?: number
    totalPracticeMinutesIncrement?: number
    bestScores?: BestScores
    nextRecommendedRound?: string
    recommendedResources?: RecommendedResource[]
}