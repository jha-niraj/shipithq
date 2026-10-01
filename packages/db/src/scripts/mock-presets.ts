/**
 * Write the predefined ShipItHQ mock interviews (byAdmin, isPredefined) listed below, keyed on a stable predefinedId (plan/long-jobs-vercel LJV-11).
 *
 *   pnpm script mock-presets            preview: per mock, add / change (which fields) / same
 *   pnpm script mock-presets --apply    write, then preview again (should be all "same")
 *
 * A mock removed from the list is reported, never deleted: sessions point at it.
 */
import { eq, inArray } from "drizzle-orm"
import { db } from "../client"
import { mockInterviewVoice } from "../schema"
import { requireMigrationsApplied } from "./_migrations-check"

const apply = process.argv.includes("--apply")

type Preset = {
    predefinedId: string
    title: string
    description: string
    category: "TECHNICAL" | "SYSTEM_DESIGN"
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    duration: number
    questionsCount: number
    tags: string[]
    knowledgeBase: string
}

// Facts from Vercel's, Next.js's and the Workflow SDK's documentation, checked 2026-10-01,
// the same sources as the incident "The export that finished after it failed".
const PRESETS: Preset[] = [
    {
        predefinedId: "vercel-background-jobs",
        title: "Background jobs on Vercel",
        description: "Long-running work on Vercel: function time limits, why after() is not a background job, and durable execution with Vercel Workflows.",
        category: "TECHNICAL",
        level: "INTERMEDIATE",
        duration: 15,
        questionsCount: 5,
        tags: ["vercel", "serverless", "background-jobs", "workflows", "next.js"],
        knowledgeBase: `You are interviewing a developer about running work that takes longer than a request on Vercel. Ask one question at a time, start concrete, and push on reasoning, not recall. Use a scenario: a "year export" that takes 6 minutes, then 14 minutes as customers' data grows.

Facts to check answers against:
- Every Vercel Function invocation has a maximum duration. With Fluid compute (the default): Hobby 300 s default and maximum; Pro and Enterprise 300 s default, 800 s maximum, 1,800 s in beta set per function. Past it, Vercel ends the invocation with 504 FUNCTION_INVOCATION_TIMEOUT. The limit covers the whole request lifecycle, including streaming the response.
- maxDuration is set per route (export const maxDuration = 800 in an App Router route). Next.js writes it into a manifest at build time for the platform to enforce; next dev never stops a slow route, which is why it works locally.
- Raising maxDuration moves the limit; growing data reaches it again, and the user still has to hold the tab open because the response is the result.
- Next.js after() runs a callback once the response is finished, for the route's default or configured maximum duration. It changes when the user gets a reply, not how long the work may run. It keeps no record and nothing retries it, so work cut off inside it fails silently: no response is left to carry an error.
- Vercel Workflows (the open-source Workflow SDK, package "workflow"): "use workflow" marks an orchestrating function, "use step" a unit of work. Each step compiles into its own route and runs as its own function invocation; between steps the run is suspended. Inputs and outputs go into an event log; after a crash or a deploy the workflow function is replayed and finished steps return recorded results. A run has no maximum duration; each step is bounded by the function limit. The workflow function runs in a sandbox (no native fetch, setTimeout, fs, crypto): side effects belong in steps.
- start(workflow, args) returns a run id at once. getRun(id) gives status (pending, running, completed, failed, cancelled) and returnValue; steps can write progress with getWritable() and a route can read it with run.getReadable({ startIndex }).
- A step that throws is retried, 3 times by default, starting again from its first line, so side effects must be idempotent: check before acting, or use getStepMetadata().stepId as an idempotency key. FatalError stops retries (bad input, a 400); RetryableError retries after a given delay (a 429).
- Runs stay on the deployment they started on (skew protection), so a rollback leaves runs on the bad deployment retrying; cancel them from the Observability > Workflows tab or the CLI. Runs past 2,000 events replay slower and a replay over 240 s may be aborted: batch small items into each step.
- Charge credits when the result exists (in the last step), not when the button is pressed.

Good probes: why errors went to zero after moving work into after(); what bounds a 14-minute export split into 10 steps; what happens to a step that sent an email and then failed; what the page should store so the user can leave and come back (the run id); when after() is the right tool (a few seconds of side work).`,
    },
]

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

const FIELDS = ["title", "description", "category", "level", "duration", "questionsCount", "tags", "knowledgeBase"] as const

async function plan() {
    const rows = await db.select().from(mockInterviewVoice).where(inArray(mockInterviewVoice.predefinedId, PRESETS.map((p) => p.predefinedId)))
    const byId = new Map(rows.map((r) => [r.predefinedId, r]))
    return PRESETS.map((p) => {
        const row = byId.get(p.predefinedId)
        if (!row) return { preset: p, action: "add" as const, changed: [] as string[] }
        const changed: string[] = FIELDS.filter((f) => JSON.stringify(row[f]) !== JSON.stringify(p[f]))
        if (!row.byAdmin || !row.isPredefined || !row.isPublic) changed.push("flags")
        return { preset: p, action: changed.length ? ("change" as const) : ("same" as const), changed }
    })
}

function print(plans: Awaited<ReturnType<typeof plan>>) {
    for (const p of plans) console.log(`  ${p.action === "add" ? "+" : p.action === "change" ? "~" : "="} ${p.preset.predefinedId}  "${p.preset.title}"${p.changed.length ? ` (${p.changed.join(", ")})` : ""}`)
    return plans.filter((p) => p.action !== "same").length
}

async function main() {
    await requireMigrationsApplied()
    console.log(`Mock presets on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`)
    const plans = await plan()
    const n = print(plans)
    if (!n) return console.log("\nNothing to change.")
    if (!apply) return console.log("\nRun with --apply to write these.")
    for (const p of plans) {
        if (p.action === "same") continue
        const values = { ...p.preset, byAdmin: true, isPredefined: true, isPublic: true }
        if (p.action === "add") await db.insert(mockInterviewVoice).values(values)
        else await db.update(mockInterviewVoice).set(values).where(eq(mockInterviewVoice.predefinedId, p.preset.predefinedId))
    }
    console.log("\nWritten. Planning again:\n")
    const left = print(await plan())
    console.log(left ? "\nSomething is still pending; look above." : "\nNothing left: the database matches the presets.")
}

main().then(() => process.exit(0), (e: unknown) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
})
