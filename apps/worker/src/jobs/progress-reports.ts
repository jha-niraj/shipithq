import { DurableObject } from "cloudflare:workers"
import { sendProgressEmail } from "@repo/email/progress"
import { frequenciesDue, runReportBatch, type ReportFrequency } from "@repo/db/progress"
import type { Env } from "../env"
import { createDb } from "../db"

/**
 * The scheduled progress reports (plan/progress PRG-10). The daily cron calls `start`
 * with today's date on the one instance named "daily"; the work runs in alarms, 20
 * users a batch, so no invocation runs long however many users there are. Not a
 * `JobDurableObject`: no user dispatched it, so there is no job row or credit hold.
 *
 * State: the day, the frequencies still to do, the cursor, and whether the retry pass
 * (for emails that failed) has run. Starting the same day twice is a no-op.
 */

type State = { day: string; queue: ReportFrequency[]; cursor: string | null; retried: boolean; failed: number }

const BATCH = 20

export class ProgressReports extends DurableObject<Env> {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)
        if (request.method !== "POST" || url.pathname !== "/start") return new Response("Not found", { status: 404 })
        const { day } = (await request.json()) as { day: string }
        const current = await this.ctx.storage.get<State>("state")
        if (current?.day === day) return Response.json({ started: false, reason: "already running or done for this day" })
        const queue = frequenciesDue(new Date(`${day}T00:00:00Z`))
        if (!queue.length) return Response.json({ started: false, reason: "no reports due" })
        await this.ctx.storage.put<State>("state", { day, queue, cursor: null, retried: false, failed: 0 })
        await this.ctx.storage.setAlarm(Date.now() + 1000)
        return Response.json({ started: true, queue })
    }

    async alarm(): Promise<void> {
        const state = await this.ctx.storage.get<State>("state")
        if (!state || !state.queue.length) return
        const frequency = state.queue[0]!
        const appUrl = this.env.APP_URL ?? "https://app.shipithq.com"
        const r = await runReportBatch(createDb(this.env.DATABASE_URL), {
            frequency,
            day: new Date(`${state.day}T00:00:00Z`),
            appUrl,
            send: (input) => sendProgressEmail(input, { apiKey: this.env.RESEND_API_KEY, from: this.env.RESEND_FROM_MAIL }),
            afterUserId: state.cursor,
            limit: BATCH,
        })
        console.log(`[progress-reports] ${state.day} ${frequency}: ${JSON.stringify(r)}`)
        const next: State = { ...state, cursor: r.lastUserId, failed: state.failed + r.failed }
        if (r.done) {
            if (next.failed > 0 && !next.retried) {
                // One more pass for this frequency: stored reports that were emailed are
                // skipped, the ones whose email failed are sent again.
                Object.assign(next, { cursor: null, retried: true, failed: 0 })
            } else {
                Object.assign(next, { queue: next.queue.slice(1), cursor: null, retried: false, failed: 0 })
            }
        }
        await this.ctx.storage.put("state", next)
        if (next.queue.length) await this.ctx.storage.setAlarm(Date.now() + (r.done ? 5_000 : 1_000))
    }
}
