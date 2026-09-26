/**
 * Seed ShipItHQ's platform pipelines and design prompts (plan/hiring-rounds HR-4).
 *
 *   pnpm script seed-pipelines            preview: prompts, pipelines, rounds and pool
 *                                         items to insert or update; writes nothing
 *   pnpm script seed-pipelines --apply    write it, then preview again (should be empty)
 *
 * Keys: design prompts by `key`, pipelines by `template_key`, rounds by
 * (pipeline, roundNumber), pool items by (round, kind, ref). A changed field is
 * an update; a new pool item is an insert. Nothing is ever deleted: past
 * attempts reference pool items and prompts. A prompt set to DRAFT by hand stays
 * DRAFT and is listed, as with the aptitude bank.
 *
 * Pools are filled from what exists when it runs:
 *   - aptitude: ShipItHQ's LIVE bank questions of the round's difficulties
 *   - DSA: active DSA practice problems with `judge_status = 'ready'`
 *   - design: ShipItHQ's LIVE design prompts of the round's difficulties
 * Re-running after the bank or catalogue grows adds the new items.
 *
 * Refuses to write when a definition is invalid or any pool would hold fewer
 * than `drawCount x 4` items (overview.md, "ShipItHQ's platform pipelines").
 */
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm"
import { db } from "../client"
import { requireMigrationsApplied } from "./_migrations-check"
import { aptitudeQuestions, designPrompts, hiringRoundPoolItems, interviewProcesses, interviewRounds, practiceProblem } from "../index"
import { DESIGN_PROMPTS, validateDesignPrompts, type DesignPromptSeed } from "../seed/design-prompts"
import { PLATFORM_PIPELINES, POOL_TO_DRAW_RATIO, validatePipelines, type PlatformRoundSeed, type PoolSource } from "../seed/hiring-pipelines"

const apply = process.argv.includes("--apply")

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

/**
 * Compare by content, not by key order: Postgres `jsonb` stores object keys in
 * its own order ({criterion, weight, lookFor} comes back as {weight, lookFor,
 * criterion}), so a plain JSON.stringify called every rubric "changed" after
 * a clean apply.
 */
function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical)
    if (v && typeof v === "object") {
        return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]))
    }
    return v ?? null
}
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

// ── Design prompts ───────────────────────────────────────────────────────────

const PROMPT_FIELDS = ["title", "prompt", "rubric", "difficulty"] as const

type PromptPlan = { insert: DesignPromptSeed[]; update: { p: DesignPromptSeed; changed: string[] }[]; draft: string[]; taken: string[] }

async function planPrompts(): Promise<PromptPlan> {
    const rows = await db.select().from(designPrompts).where(isNotNull(designPrompts.key))
    const byKey = new Map(rows.map((r) => [r.key as string, r]))
    const plan: PromptPlan = { insert: [], update: [], draft: [], taken: [] }
    for (const p of DESIGN_PROMPTS) {
        const row = byKey.get(p.key)
        if (!row) { plan.insert.push(p); continue }
        if (row.companyId !== null) { plan.taken.push(p.key); continue }
        const changed = PROMPT_FIELDS.filter((f) => !same(row[f], p[f]))
        if (changed.length) plan.update.push({ p, changed: [...changed] })
        else if (row.status !== "LIVE") plan.draft.push(p.key)
    }
    return plan
}

// ── Pipelines, rounds and pools ──────────────────────────────────────────────

const ROUND_FIELDS = [
    "roundType", "title", "description", "format", "gateMode", "passMark", "timeLimitMinutes",
    "drawCount", "cooldownHours", "responseMode", "topicsCovered", "rubric", "mockKnowledgeBase",
] as const

type RoundPlan = {
    round: PlatformRoundSeed
    action: "insert" | "update" | "same"
    changed: string[]
    /** Items the pool will hold after the run, and those it lacks now. */
    poolSize: number
    poolAdd: { kind: PoolSource["kind"]; refId: string }[]
    existingId: string | null
}

type PipelinePlan = {
    templateKey: string
    name: string
    action: "insert" | "update" | "same"
    changed: string[]
    existingId: string | null
    rounds: RoundPlan[]
}

/** Pool candidates per source, as refIds. Design prompts in preview include those about to be inserted. */
async function poolCandidates(source: PoolSource, promptIdsByKey: Map<string, string>): Promise<{ kind: PoolSource["kind"]; refId: string }[]> {
    if (source.kind === "APTITUDE_QUESTION") {
        const rows = await db.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions).where(and(
            isNull(aptitudeQuestions.companyId),
            eq(aptitudeQuestions.status, "LIVE"),
            inArray(aptitudeQuestions.difficulty, source.difficulties),
        ))
        return rows.map((r) => ({ kind: source.kind, refId: r.id }))
    }
    if (source.kind === "PRACTICE_PROBLEM") {
        const rows = await db.select({ id: practiceProblem.id }).from(practiceProblem).where(and(
            eq(practiceProblem.module, "DSA"),
            eq(practiceProblem.isActive, true),
            eq(practiceProblem.judgeStatus, "ready"),
            eq(practiceProblem.difficulty, source.difficulty),
        ))
        return rows.map((r) => ({ kind: source.kind, refId: r.id }))
    }
    // Design prompts: the LIVE platform rows, plus seeds not inserted yet (preview only; keyed by "seed:<key>").
    const live = await db.select({ id: designPrompts.id, key: designPrompts.key }).from(designPrompts).where(and(
        isNull(designPrompts.companyId),
        eq(designPrompts.status, "LIVE"),
        inArray(designPrompts.difficulty, source.difficulties),
    ))
    const ids = live.map((r) => r.id)
    // A seed already in the database is counted above only if LIVE: a prompt set
    // to DRAFT by hand is not drawable, so it is not pooled.
    for (const p of DESIGN_PROMPTS) {
        if (source.difficulties.includes(p.difficulty) && !promptIdsByKey.has(p.key)) ids.push(`seed:${p.key}`)
    }
    return [...new Set(ids)].map((refId) => ({ kind: source.kind, refId }))
}

async function planPipelines(): Promise<PipelinePlan[]> {
    const promptRows = await db.select({ id: designPrompts.id, key: designPrompts.key }).from(designPrompts).where(isNotNull(designPrompts.key))
    const promptIdsByKey = new Map(promptRows.map((r) => [r.key as string, r.id]))

    const out: PipelinePlan[] = []
    for (const p of PLATFORM_PIPELINES) {
        const proc = await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.templateKey, p.templateKey) })
        const want = { name: p.name, description: p.description, ownerKind: "PLATFORM", companyId: null, isTemplate: true, isActive: true }
        const changed = proc ? (Object.keys(want) as (keyof typeof want)[]).filter((k) => !same(proc[k], want[k])) : []
        const plan: PipelinePlan = {
            templateKey: p.templateKey,
            name: p.name,
            action: !proc ? "insert" : changed.length ? "update" : "same",
            changed: [...changed],
            existingId: proc?.id ?? null,
            rounds: [],
        }
        const rows = proc ? await db.select().from(interviewRounds).where(eq(interviewRounds.processId, proc.id)) : []
        for (const r of p.rounds) {
            const row = rows.find((x) => x.roundNumber === r.roundNumber)
            const rChanged = row ? ROUND_FIELDS.filter((f) => !same(row[f], r[f])) : []
            let poolSize = 0
            let poolAdd: RoundPlan["poolAdd"] = []
            if (r.pool) {
                const candidates = await poolCandidates(r.pool, promptIdsByKey)
                const existing = row
                    ? await db.select({ kind: hiringRoundPoolItems.kind, refId: hiringRoundPoolItems.refId }).from(hiringRoundPoolItems).where(eq(hiringRoundPoolItems.roundId, row.id))
                    : []
                const have = new Set(existing.map((e) => `${e.kind}:${e.refId}`))
                poolAdd = candidates.filter((c) => !have.has(`${c.kind}:${c.refId}`))
                poolSize = new Set([...existing.map((e) => `${e.kind}:${e.refId}`), ...candidates.map((c) => `${c.kind}:${c.refId}`)]).size
            }
            plan.rounds.push({
                round: r,
                action: !row ? "insert" : rChanged.length ? "update" : "same",
                changed: [...rChanged],
                poolSize,
                poolAdd,
                existingId: row?.id ?? null,
            })
        }
        out.push(plan)
    }
    return out
}

function poolProblems(plans: PipelinePlan[]): string[] {
    const problems: string[] = []
    for (const p of plans) {
        for (const r of p.rounds) {
            if (!r.round.pool) continue
            const need = r.round.drawCount * POOL_TO_DRAW_RATIO
            if (r.poolSize < need) problems.push(`${p.templateKey} round ${r.round.roundNumber} (${r.round.title}): pool of ${r.poolSize}, needs at least ${need}`)
        }
    }
    return problems
}

function report(prompts: PromptPlan, plans: PipelinePlan[]): number {
    console.log(`Design prompts: + ${prompts.insert.length} to insert   ~ ${prompts.update.length} to update   = ${DESIGN_PROMPTS.length - prompts.insert.length - prompts.update.length - prompts.taken.length} unchanged`)
    for (const u of prompts.update) console.log(`  ~ ${u.p.key}: ${u.changed.join(", ")} changed`)
    for (const k of prompts.draft) console.log(`  = ${k}: matches but is DRAFT in the database (left as is; not pooled)`)
    for (const k of prompts.taken) console.log(`  ! ${k}: key belongs to a company's prompt (skipped)`)

    let pending = prompts.insert.length + prompts.update.length
    for (const p of plans) {
        const mark = { insert: "+", update: "~", same: "=" }[p.action]
        console.log(`\n${mark} ${p.name} (${p.templateKey})${p.changed.length ? `: ${p.changed.join(", ")} changed` : ""}`)
        if (p.action !== "same") pending++
        for (const r of p.rounds) {
            const m = { insert: "+", update: "~", same: "=" }[r.action]
            const pool = r.round.pool
                ? `pool ${String(r.poolSize).padStart(3)} (draw ${r.round.drawCount}, needs ${r.round.drawCount * POOL_TO_DRAW_RATIO})${r.poolAdd.length ? `, + ${r.poolAdd.length} items` : ""}`
                : "no pool (rubric + interviewer knowledge)"
            console.log(`   ${m} ${r.round.roundNumber}. ${r.round.title.padEnd(22)} ${r.round.gateMode.padEnd(8)} ${r.round.passMark}  ${String(r.round.timeLimitMinutes).padStart(2)} min  ${pool}${r.changed.length ? `  [${r.changed.join(", ")}]` : ""}`)
            if (r.action !== "same") pending++
            pending += r.poolAdd.length
        }
    }
    console.log(pending ? `\n${pending} change(s) pending.` : "\nNothing to change.")
    return pending
}

// ── Apply ────────────────────────────────────────────────────────────────────

async function writePrompts(plan: PromptPlan) {
    const now = new Date()
    if (plan.insert.length) {
        await db.insert(designPrompts)
            .values(plan.insert.map((p) => ({ key: p.key, companyId: null, title: p.title, prompt: p.prompt, rubric: p.rubric, difficulty: p.difficulty, status: "LIVE" as const, updatedAt: now })))
            .onConflictDoNothing()
    }
    for (const u of plan.update) {
        await db.update(designPrompts)
            .set({ title: u.p.title, prompt: u.p.prompt, rubric: u.p.rubric, difficulty: u.p.difficulty, status: "LIVE", updatedAt: now })
            .where(and(eq(designPrompts.key, u.p.key), isNull(designPrompts.companyId)))
    }
}

const roundValues = (r: PlatformRoundSeed) => ({
    roundType: r.roundType,
    title: r.title,
    description: r.description,
    durationMinutes: r.timeLimitMinutes,
    format: r.format,
    gateMode: r.gateMode,
    passMark: r.passMark,
    timeLimitMinutes: r.timeLimitMinutes,
    drawCount: r.drawCount,
    cooldownHours: r.cooldownHours,
    responseMode: r.responseMode,
    topicsCovered: r.topicsCovered,
    rubric: r.rubric,
    mockKnowledgeBase: r.mockKnowledgeBase,
    hasMockInterview: r.roundType.startsWith("VOICE_"),
    updatedAt: new Date(),
})

async function writePipelines(plans: PipelinePlan[]) {
    for (const p of plans) {
        const seed = PLATFORM_PIPELINES.find((x) => x.templateKey === p.templateKey)!
        const values = { name: seed.name, description: seed.description, ownerKind: "PLATFORM" as const, companyId: null, isTemplate: true, isActive: true, updatedAt: new Date() }
        let processId = p.existingId
        if (!processId) {
            const [row] = await db.insert(interviewProcesses).values({ ...values, templateKey: seed.templateKey })
                .onConflictDoNothing().returning({ id: interviewProcesses.id })
            processId = row?.id ?? (await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.templateKey, seed.templateKey), columns: { id: true } }))?.id ?? null
            if (!processId) throw new Error(`Could not create ${seed.templateKey}`)
        } else if (p.action === "update") {
            await db.update(interviewProcesses).set(values).where(eq(interviewProcesses.id, processId))
        }

        for (const r of p.rounds) {
            let roundId = r.existingId
            if (!roundId) {
                const [row] = await db.insert(interviewRounds).values({ processId, roundNumber: r.round.roundNumber, ...roundValues(r.round) })
                    .onConflictDoNothing().returning({ id: interviewRounds.id })
                roundId = row?.id ?? (await db.query.interviewRounds.findFirst({
                    where: and(eq(interviewRounds.processId, processId), eq(interviewRounds.roundNumber, r.round.roundNumber)), columns: { id: true },
                }))?.id ?? null
                if (!roundId) throw new Error(`Could not create ${seed.templateKey} round ${r.round.roundNumber}`)
            } else if (r.action === "update") {
                await db.update(interviewRounds).set(roundValues(r.round)).where(eq(interviewRounds.id, roundId))
            }

            if (!r.round.pool) continue
            // Re-resolve now that prompts exist: "seed:<key>" placeholders become real ids.
            const promptRows = await db.select({ id: designPrompts.id, key: designPrompts.key }).from(designPrompts).where(isNotNull(designPrompts.key))
            const candidates = (await poolCandidates(r.round.pool, new Map(promptRows.map((x) => [x.key as string, x.id]))))
                .filter((c) => !c.refId.startsWith("seed:"))
            for (let i = 0; i < candidates.length; i += 100) {
                await db.insert(hiringRoundPoolItems)
                    .values(candidates.slice(i, i + 100).map((c) => ({ roundId: roundId!, kind: c.kind, refId: c.refId })))
                    .onConflictDoNothing()
            }
        }
    }
}

async function main() {
    console.log(`Database: ${host()}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)
    await requireMigrationsApplied()

    const definitionProblems = [...validateDesignPrompts(), ...validatePipelines()]
    console.log(definitionProblems.length ? `Definitions: ${definitionProblems.length} problem(s)` : "Definitions: no problems")
    for (const x of definitionProblems) console.log(`  x ${x}`)
    console.log("")

    const prompts = await planPrompts()
    const plans = await planPipelines()
    const pending = report(prompts, plans)
    const pools = poolProblems(plans)
    if (pools.length) {
        console.log(`\nPools: ${pools.length} too small`)
        for (const x of pools) console.log(`  x ${x}`)
    } else {
        console.log(`Pools: every pool holds at least ${POOL_TO_DRAW_RATIO}x its draw.`)
    }

    if (!apply || !pending) return
    if (definitionProblems.length || pools.length) {
        console.error("\nRefusing to write: fix the problems above first.")
        process.exit(1)
    }

    await writePrompts(prompts)
    await writePipelines(plans)

    console.log("\nWritten. Planning again:\n")
    const again = report(await planPrompts(), await planPipelines())
    if (again) process.exitCode = 1
}

main()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error)
        process.exit(1)
    })
