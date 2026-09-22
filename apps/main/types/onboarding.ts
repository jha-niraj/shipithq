import type {
    OnboardingProfile, OnboardingTurn, OnboardingRunStatus, OnboardingLevel,
} from "@repo/db"
import type { OnboardingModuleKey } from "@/lib/onboarding/modules"

/** A run as the client sees it. Dates are ISO strings so the object survives the RSC boundary unchanged. */
export interface OnboardingRunView {
    id: string
    moduleKey: OnboardingModuleKey
    version: number
    status: OnboardingRunStatus
    turns: OnboardingTurn[]
    openQuestionCount: number
    profile: OnboardingProfile | null
    level: OnboardingLevel | null
    startedAt: string
    completedAt: string | null
}

export interface OnboardingState {
    /** The latest completed run, or null when the user has never finished one. */
    completed: OnboardingRunView | null
    /** A run that has been started and not finished, or null. */
    inProgress: OnboardingRunView | null
}

/** What `POST /api/onboarding/next` returns. */
export type OnboardingNextResponse =
    | { done: false; turn: OnboardingTurn }
    | { done: true; profile: OnboardingProfile; level: OnboardingLevel }
