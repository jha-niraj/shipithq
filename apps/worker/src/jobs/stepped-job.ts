import { JobDurableObject, type StoredJob } from "./base"
import { resumeSteps, tickStep, type StepContext, type StepHost, type StepOutcome, type StepStorage } from "./stepped-core"

/*
 * A JobDurableObject that runs one step per alarm (plan/job-import JI-2). The
 * rules are in stepped-core.ts; this is the glue to Durable Object storage, the
 * background_job status the app polls, and a /resume route for a job paused on
 * "wait" (the student pasting a job's text).
 *
 * Subclasses implement `firstStep`, `initialState`, `runStep` and `labelFor`.
 * `/start` and `/status` are inherited unchanged from JobDurableObject.
 */
export abstract class SteppedJob<I, S> extends JobDurableObject<I> {
    protected abstract readonly firstStep: string
    protected abstract initialState(input: I): S
    protected abstract runStep(name: string, ctx: StepContext<I, S>): Promise<StepOutcome<S>>
    protected abstract labelFor(name: string, state: S): string
    /** Mark the job's own rows when it fails; the app still refunds from background_job. */
    protected async onFail(_message: string, _input: I): Promise<void> {}

    /** Never called: a stepped job runs through `alarm()` one step at a time. */
    protected async run(_job: StoredJob<I>): Promise<unknown> {
        throw new Error("A stepped job runs by step")
    }

    private storage(): StepStorage {
        return {
            get: <T,>(key: string) => this.ctx.storage.get<T>(key),
            put: (key, value) => this.ctx.storage.put(key, value),
            delete: async (key) => { await this.ctx.storage.delete(key) },
            setAlarm: (at) => this.ctx.storage.setAlarm(at),
        }
    }

    private host(): StepHost<I, S> {
        return {
            firstStep: this.firstStep,
            initialState: (input) => this.initialState(input),
            runStep: (name, ctx) => this.runStep(name, ctx),
            labelFor: (name, state) => this.labelFor(name, state),
            onFail: (message, input) => this.onFail(message, input),
        }
    }

    override async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)
        if (request.method === "POST" && url.pathname.endsWith("/resume")) {
            const body = (await request.json().catch(() => ({}))) as { step?: string }
            const resumed = await resumeSteps(this.storage(), body.step ?? this.firstStep, Date.now())
            return Response.json({ ok: resumed }, { status: resumed ? 200 : 409 })
        }
        return super.fetch(request)
    }

    override async alarm(): Promise<void> {
        const job = await this.ctx.storage.get<StoredJob<I>>("job")
        const r = await tickStep(this.storage(), this.host(), (status, progress, extra) => (job ? this.writeStatus(job.jobId, status, progress, extra) : Promise.resolve()), Date.now())
        if (r === "cleanup") await this.ctx.storage.deleteAll()
    }
}
