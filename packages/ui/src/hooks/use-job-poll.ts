"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Poll a background job until it finishes.
 *
 * Exists because both apps queued work to the worker and then never checked again - the toast said
 * "lessons appear here once the worker finishes" and nothing ever refetched, so the only way to see
 * output was a manual reload. That is the bug this closes, in one place, for admin and main.
 *
 * Deliberate choices:
 *  - **Stops.** It gives up after `maxAttempts` rather than polling a dead job forever, because a
 *    worker that never picked the job up will never answer and an infinite timer is a battery leak
 *    that outlives the page it was started from.
 *  - **Backs off.** The interval widens as attempts accumulate. A job that finishes in 3s should be
 *    seen almost instantly; one still running at 60s does not need to be asked every second.
 *  - **Skips while hidden.** `document.hidden` pauses the loop, so a tab left open in the background
 *    is not making requests nobody is looking at.
 *  - **Cancels on unmount** via the `alive` flag, so a late response cannot set state on a gone
 *    component or clobber a newer poll's result.
 */
export type JobPollStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED"

export interface JobPollState {
    status: JobPollStatus | null
    phase: string | null
    error: string | null
    /** True while the loop is still asking. False once settled or given up on. */
    polling: boolean
    /** True when the loop stopped because it ran out of attempts, not because the job settled. */
    timedOut: boolean
}

export function useJobPoll(opts: {
    jobId: string | null
    /** Fetch the job's current state. Return null if it cannot be read. */
    fetchStatus: (jobId: string) => Promise<{ status: string; phase: string | null; error: string | null } | null>
    /** Fired once, when the job reaches DONE - the moment to refetch whatever it produced. */
    onDone?: () => void
    onFailed?: (error: string | null) => void
    maxAttempts?: number
}): JobPollState {
    const { jobId, fetchStatus, onDone, onFailed, maxAttempts = 40 } = opts

    const [state, setState] = useState<JobPollState>({
        status: null, phase: null, error: null, polling: false, timedOut: false,
    })

    // Held in refs so changing a handler identity does not restart the poll - callers routinely
    // pass inline arrows, and without this the effect would tear down on every parent render.
    const onDoneRef = useRef(onDone)
    const onFailedRef = useRef(onFailed)
    const fetchRef = useRef(fetchStatus)
    useEffect(() => { onDoneRef.current = onDone; onFailedRef.current = onFailed; fetchRef.current = fetchStatus })

    useEffect(() => {
        if (!jobId) {
            setState({ status: null, phase: null, error: null, polling: false, timedOut: false })
            return
        }

        let alive = true
        let attempts = 0
        let timer: ReturnType<typeof setTimeout> | null = null

        const schedule = (ms: number) => { timer = setTimeout(() => { void tick() }, ms) }

        const tick = async () => {
            if (!alive) return

            // A hidden tab still counts down its attempts budget but makes no request.
            if (typeof document !== "undefined" && document.hidden) { schedule(2000); return }

            attempts++
            const res = await fetchRef.current(jobId).catch(() => null)
            if (!alive) return

            if (res) {
                const status = res.status as JobPollStatus
                setState({ status, phase: res.phase, error: res.error, polling: status === "PENDING" || status === "RUNNING", timedOut: false })
                if (status === "DONE") { onDoneRef.current?.(); return }
                if (status === "FAILED") { onFailedRef.current?.(res.error); return }
            }

            if (attempts >= maxAttempts) {
                setState(s => ({ ...s, polling: false, timedOut: true }))
                return
            }

            // 1s for the first few checks, then widening to 5s.
            schedule(attempts < 5 ? 1000 : attempts < 15 ? 2500 : 5000)
        }

        setState({ status: "PENDING", phase: null, error: null, polling: true, timedOut: false })
        schedule(800)

        return () => { alive = false; if (timer) clearTimeout(timer) }
    }, [jobId, maxAttempts])

    return state
}
