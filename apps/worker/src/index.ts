import { purgeExpiredSends } from "@repo/db/hiring-purge"
import { createDb } from "./db"
import { isRunnableJobType, type Env, type RunnableJobType } from "./env"
import { verifyWorkerToken } from "./token"
import { jobStub } from "./jobs"

// Durable Object classes must be exported from the worker entry point for
// wrangler to bind them.
//
// This list is the FIFTH place a job type has to be registered, and the README's
// "four edits, all four or none" did not name it - which is how `ResumeStructure`
// came to be bound in wrangler.jsonc, given a `v2` migration tag, and left out of
// here. It is bound to a class the entry point does not export, so the binding
// has nothing behind it. Added below along with the three RES-9 jobs; the README
// now lists five edits.
//
// Keep this list in sync with `JOB_BINDINGS` in `env.ts`. If they ever disagree
// again the symptom is not a compile error - `jobStub` resolves a binding and the
// dispatch fails at runtime, after the app has already inserted the job row and
// held the user's credits.
export {
	ProjectGeneration,
	VerificationGeneration,
	SprintGeneration,
	ProjectQuiz,
	StandupVoice,
	ResumeStructure,
	ResumeTailor,
	CoverLetter,
	ResumeAtsScore,
	CoverLetterQuestions,
	ResumeImport,
	SubGoalGeneration,
	GoalCreation,
	InterviewPrepGeneration,
	PracticeTestsGenerate,
	PracticeMemoryUpdate,
	PracticeReflect,
	SprintQuiz,
	CompanyScrape,
	AptitudeGenerate,
	VoiceInterviewScore,
	JobImport,
} from "./jobs"

// ─────────────────────────────────────────────────────────────────────────────
// The ShipItHQ job worker.
//
// Every long-running operation in the product runs here, as a Durable Object
// that schedules an Alarm and does the work off the request path, writing
// progress to `background_job` so the app can poll it. Nothing in this worker
// does real work inside a fetch handler; a fetch only ever accepts a job.
//
// Dispatch is one generic route:
//
//     POST /api/v1/jobs   { type, jobId, input }   Bearer <signed token>
//
// The two original routes (`/api/v1/generateproject`, `/api/v1/generateverification`)
// are kept because apps/uni still calls the first one over plain HTTP. They are
// thin aliases onto the same dispatch.
// ─────────────────────────────────────────────────────────────────────────────

const cors = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
	"Access-Control-Allow-Headers": "Authorization,Content-Type",
}

function bearer(request: Request): string | null {
	const h = request.headers.get("Authorization") ?? ""
	return h.startsWith("Bearer ") ? h.slice(7) : null
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })
const unauthorized = () => json({ success: false, error: "Unauthorized" }, 401)

/**
 * Hand a job to its Durable Object.
 *
 * `userId` comes from the signed token and never from the request body - the
 * caller must not be able to run a job as somebody else.
 */
async function dispatch(
	env: Env,
	type: RunnableJobType,
	jobId: string,
	userId: string,
	input: unknown,
): Promise<Response> {
	const stub = jobStub(env, type, jobId)
	const res = await stub.fetch("https://do/start", {
		method: "POST",
		body: JSON.stringify({ jobId, userId, input }),
	})
	if (!res.ok) {
		return json({ success: false, error: `Job could not be started (${res.status})` }, 502)
	}
	return json({ success: true, jobId, type })
}

export default {
	/**
	 * The daily cron (wrangler.jsonc "triggers"): remove withdrawn and declined
	 * send data past its purge date (plan/hiring-rounds HR-21).
	 */
	async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil((async () => {
			const purged = await purgeExpiredSends(createDb(env.DATABASE_URL))
			console.log(`[cron] hiring send purge: ${purged} removed`)
		})())
	},

	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		if (request.method === "OPTIONS") return new Response(null, { headers: cors })
		if (url.pathname === "/health") return json({ ok: true })

		// ── Generic dispatch ──────────────────────────────────────────────────
		if (request.method === "POST" && url.pathname === "/api/v1/jobs") {
			const token = bearer(request)
			const payload = token ? await verifyWorkerToken(token, env.WORKER_SECRET) : null
			if (!payload || payload.action !== "start_job") return unauthorized()

			const body = (await request.json()) as { type?: string; jobId?: string; input?: unknown }
			if (!body?.jobId || !body?.type) {
				return json({ success: false, error: "Missing jobId or type" }, 400)
			}
			// The token is scoped to one job id. Without this check a token
			// issued for one job would start any number of others.
			if (payload.jobId && payload.jobId !== body.jobId) return unauthorized()
			if (!isRunnableJobType(body.type)) {
				return json({ success: false, error: `Unknown job type "${body.type}"` }, 400)
			}

			return dispatch(env, body.type, body.jobId, payload.userId, body.input ?? {})
		}

		// ── Legacy aliases (apps/uni dispatches to the first one) ─────────────
		if (request.method === "POST" && url.pathname === "/api/v1/generateproject") {
			const token = bearer(request)
			const payload = token ? await verifyWorkerToken(token, env.WORKER_SECRET) : null
			if (!payload || payload.action !== "generate_project") return unauthorized()

			const body = (await request.json()) as { jobId?: string; input?: unknown }
			if (!body?.jobId || !body?.input) {
				return json({ success: false, error: "Missing jobId or input" }, 400)
			}
			return dispatch(env, "project_generation", body.jobId, payload.userId, body.input)
		}

		if (request.method === "POST" && url.pathname === "/api/v1/generateverification") {
			const token = bearer(request)
			const payload = token ? await verifyWorkerToken(token, env.WORKER_SECRET) : null
			if (!payload || payload.action !== "generate_verification") return unauthorized()

			const body = (await request.json()) as { jobId?: string; goalId?: string }
			if (!body?.jobId || !body?.goalId) {
				return json({ success: false, error: "Missing jobId or goalId" }, 400)
			}
			return dispatch(env, "verification_generation", body.jobId, payload.userId, { goalId: body.goalId })
		}

		// ── Live phase straight from the DO ───────────────────────────────────
		// The app normally polls `background_job` instead; this is for the window
		// between dispatch and the first status write, and for debugging.
		const jobMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)$/)
		if (request.method === "GET" && jobMatch) {
			const token = bearer(request)
			const payload = token ? await verifyWorkerToken(token, env.WORKER_SECRET) : null
			if (!payload) return unauthorized()

			const type = url.searchParams.get("type")
			if (!isRunnableJobType(type)) {
				return json({ success: false, error: "A known ?type= is required" }, 400)
			}

			const res = await jobStub(env, type, jobMatch[1]!).fetch("https://do/status")
			const data = (await res.json()) as object
			return json({ success: true, ...data })
		}

		// ── Resume a stepped job paused on "wait" (plan/job-import: the student pasted the text) ──
		const resumeMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/resume$/)
		if (request.method === "POST" && resumeMatch) {
			const token = bearer(request)
			const payload = token ? await verifyWorkerToken(token, env.WORKER_SECRET) : null
			// Scoped like a start: this action, this one job.
			if (!payload || payload.action !== "resume_job" || payload.jobId !== resumeMatch[1]) return unauthorized()
			const body = (await request.json().catch(() => ({}))) as { type?: string; step?: string }
			if (!isRunnableJobType(body.type)) return json({ success: false, error: "A known type is required" }, 400)
			const res = await jobStub(env, body.type, resumeMatch[1]!).fetch("https://do/resume", { method: "POST", body: JSON.stringify({ step: body.step }) })
			return json({ success: res.ok }, res.ok ? 200 : 409)
		}

		return new Response("Not found", { status: 404, headers: cors })
	},
}
