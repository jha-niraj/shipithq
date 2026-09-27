import { eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"
import { buildIncidentReport } from "./incident-report-core"

const { incidentRuns } = schema

/**
 * The review a recorded incident run ends with (plan/incidents INC-36). The reading,
 * the gpt-4o call and the quote check are in `incident-report-core.ts`; this saves it.
 */

interface ReportInput {
    /** Pointer only. Everything else is re-read. */
    runId: string
}

export class IncidentReport extends JobDurableObject<ReportInput> {
    protected readonly jobType: RunnableJobType = "incident_report"
    protected override get initialPhaseLabel() {
        return "Reading your run"
    }

    protected async run(job: StoredJob<ReportInput>, progress: ProgressFn): Promise<unknown> {
        const db = this.db()
        const { report, already } = await buildIncidentReport(db, job.input.runId, job.userId,
            (system, user) => chatJSON({ apiKey: this.env.OPENAI_API_KEY, model: modelFor("incidentRunReport"), system, user, temperature: 0.3, maxTokens: 2200, timeoutMs: 90_000 }),
            (p, label) => progress(p, label))
        if (already) return { runId: job.input.runId, already: true }
        await progress(95, "Saving")
        const [run] = await db.select({ endedAt: incidentRuns.endedAt }).from(incidentRuns).where(eq(incidentRuns.id, job.input.runId))
        await db.update(incidentRuns).set({ report, status: "REPORTED", reportedAt: new Date(), endedAt: run?.endedAt ?? new Date() })
            .where(eq(incidentRuns.id, job.input.runId))
        return { runId: job.input.runId, highlights: report.highlights.length, questions: report.questions.length }
    }
}
