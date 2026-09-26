/*
 * What a send carries (plan/hiring-rounds HR-17, HR-18): the snapshot of the
 * chosen attempts and the profile, as stored on `hiring_send` and shown to the
 * company. Types only, safe for any client; the student app builds them
 * (apps/main/lib/hiring/send.ts) and both apps render them. No imports, so
 * @repo/ui can use it through `@repo/db/hiring-send-types` alone.
 */

/** One turn of an interview transcript, as carried in a voice round's detail. */
export interface TranscriptTurn {
    role: "interviewer" | "candidate"
    text: string
    at?: string
}

export interface SentProfile {
    name: string
    headline: string
    education: { institution: string; degree: string | null; from: string; to: string | null }[]
    links: { kind: "resume" | "github" | "knowme" | "project"; label: string; url: string }[]
}

export interface SnapshotRound {
    roundId: string
    number: number
    title: string
    type: string
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    attempt: {
        number: number
        of: number
        score: number
        passed: boolean
        submittedAt: string
        /** Per type: aptitude sections, DSA problems and code, design rubric and answer, voice rubric and transcript. */
        detail: Record<string, unknown>
        integrity: { pastes: number; tabLeaves: number; secondsTotal: number; aiBlocked: number }
    }
}

export interface SendSnapshot {
    version: 1
    job: { title: string }
    company: { name: string }
    pipelineHash: string
    reusedFromJob: string | null
    rounds: SnapshotRound[]
    sentAt: string
}
