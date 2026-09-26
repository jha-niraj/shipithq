/*
 * Where a student stands on each round of a run (plan/hiring-rounds HR-13).
 * Pure: no database, so the rules are the same wherever they are read.
 *
 * Rounds are taken in order. A round opens when the one before it is cleared:
 * a HARD round is cleared by a score at or above its pass mark, an ADVISORY
 * round by any scored attempt. A round can be retaken once its cool-down has
 * passed, to improve on it; each retake draws a new set.
 */

export type RoundStatus =
    /** An earlier round isn't cleared yet. */
    | "locked"
    /** Open: start an attempt. */
    | "available"
    /** An attempt is running (its timer is the server's). */
    | "in_progress"
    /** Tried recently; the next try opens at `availableAt`. */
    | "cooling_down"
    /** Cleared: HARD at or above the mark, or ADVISORY scored. Retakes open after the cool-down. */
    | "cleared"

export interface StateRound {
    id: string
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    cooldownHours: number
}

export interface StateAttempt {
    id: string
    roundId: string | null
    status: "IN_PROGRESS" | "SUBMITTED" | "SCORED" | "NOT_SCORED"
    score: number | null
    endsAt: Date | null
    submittedAt: Date | null
    startedAt: Date
}

export interface RoundState {
    roundId: string
    status: RoundStatus
    /** Best score so far on this round, or null. */
    best: number | null
    attempts: number
    /** The running attempt, when there is one. */
    liveAttemptId: string | null
    /** When a cool-down ends. */
    availableAt: Date | null
    /** Cleared, and the cool-down has passed: a retake can start now. */
    canRetake: boolean
    /** Cleared at some point, even while a retake is running. */
    isCleared: boolean
}

const cleared = (r: StateRound, best: number | null, scoredAny: boolean) =>
    r.gateMode === "HARD" ? best !== null && best >= r.passMark : scoredAny

export function roundStates(rounds: StateRound[], attempts: StateAttempt[], now: Date = new Date()): RoundState[] {
    const out: RoundState[] = []
    let open = true
    for (const r of rounds) {
        const mine = attempts.filter((a) => a.roundId === r.id)
        const scored = mine.filter((a) => a.status === "SCORED" && a.score !== null)
        const best = scored.length ? Math.max(...scored.map((a) => a.score!)) : null
        // Running, or handed in and waiting to be scored (an AI-assessed round whose
        // timer ran out while the tab was closed): both open the runner.
        const live = mine.find((a) => (a.status === "IN_PROGRESS" && (!a.endsAt || a.endsAt > now)) || a.status === "SUBMITTED") ?? null
        // The cool-down runs from the end of the last finished attempt. One that
        // wasn't scored (the judge or the AI failed, and it was refunded) doesn't
        // count: the student did nothing wrong.
        const finished = mine.filter((a) => a.status === "SCORED" || a.status === "SUBMITTED").map((a) => (a.submittedAt ?? a.endsAt ?? a.startedAt).getTime())
        const lastEnd = finished.length ? Math.max(...finished) : null
        const availableAt = lastEnd !== null && r.cooldownHours > 0 ? new Date(lastEnd + r.cooldownHours * 3_600_000) : null
        const cooling = availableAt !== null && availableAt > now
        const isCleared = cleared(r, best, scored.length > 0)

        let status: RoundStatus
        if (!open) status = "locked"
        else if (live) status = "in_progress"
        else if (isCleared) status = "cleared"
        else if (cooling) status = "cooling_down"
        else status = "available"

        out.push({
            roundId: r.id,
            status,
            best,
            attempts: mine.length,
            liveAttemptId: live?.id ?? null,
            availableAt: cooling ? availableAt : null,
            canRetake: status === "cleared" && !cooling && !live,
            isCleared,
        })
        // The next round opens only when this one is cleared.
        open = open && isCleared
    }
    return out
}

/** A run is complete when every round has been cleared (a retake in progress doesn't undo that). */
export function runComplete(states: RoundState[]): boolean {
    return states.length > 0 && states.every((s) => s.isCleared)
}
