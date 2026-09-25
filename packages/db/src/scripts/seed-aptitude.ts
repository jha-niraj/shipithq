/**
 * Seed ShipItHQ's aptitude question bank (plan/hiring-rounds HR-3).
 *
 *   pnpm script seed-aptitude            preview: per section, what would be inserted,
 *                                    updated or left unchanged, plus any problem
 *                                    `validateBank` finds; nothing is written
 *   pnpm script seed-aptitude --apply    write it, then preview again (should be empty)
 *
 * Matches rows by `key`. A new key is inserted as LIVE with `companyId` null.
 * An existing bank row is updated only when its content differs, and is then
 * set LIVE (a fixed question goes back into rounds). A bank row whose content
 * matches is left alone even if it was set to DRAFT by hand.
 *
 * Never touched: rows with a `companyId` (a company's own questions, HR-11),
 * even if one somehow holds a bank key. Never deleted: a key that is in the
 * database but no longer in the bank is reported and left as is, because past
 * attempts reference it.
 *
 * Refuses to write while `validateBank` reports any problem.
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm"
import { db } from "../client"
import { aptitudeQuestions } from "../index"
import { APTITUDE_BANK, bankStats, validateBank, type AptitudeSeed, type AptitudeSection } from "../seed/aptitude"

const apply = process.argv.includes("--apply")
const SECTIONS: AptitudeSection[] = ["QUANT", "LOGICAL", "VERBAL"]
/** The columns the bank owns; a difference in any of them is an update. */
const FIELDS = ["section", "topic", "difficulty", "prompt", "options", "correctIndex", "explanation"] as const

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

type Stored = Pick<AptitudeSeed, (typeof FIELDS)[number]> & { key: string | null; companyId: string | null; status: "DRAFT" | "LIVE" }

type Plan = {
    insert: AptitudeSeed[]
    update: { q: AptitudeSeed; changed: string[] }[]
    unchanged: AptitudeSeed[]
    /** Bank rows in the database that match the bank but are DRAFT. */
    draft: string[]
    /** Bank keys held by a company's row: skipped. */
    taken: string[]
    /** Bank rows in the database whose key is not in the bank any more. */
    orphaned: string[]
}

function same(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}

async function plan(): Promise<Plan> {
    const rows = (await db
        .select({
            key: aptitudeQuestions.key,
            companyId: aptitudeQuestions.companyId,
            status: aptitudeQuestions.status,
            section: aptitudeQuestions.section,
            topic: aptitudeQuestions.topic,
            difficulty: aptitudeQuestions.difficulty,
            prompt: aptitudeQuestions.prompt,
            options: aptitudeQuestions.options,
            correctIndex: aptitudeQuestions.correctIndex,
            explanation: aptitudeQuestions.explanation,
        })
        .from(aptitudeQuestions)
        .where(isNotNull(aptitudeQuestions.key))) as Stored[]
    const byKey = new Map(rows.map((r) => [r.key as string, r]))
    const p: Plan = { insert: [], update: [], unchanged: [], draft: [], taken: [], orphaned: [] }
    for (const q of APTITUDE_BANK) {
        const row = byKey.get(q.key)
        if (!row) {
            p.insert.push(q)
            continue
        }
        if (row.companyId !== null) {
            p.taken.push(q.key)
            continue
        }
        const changed = FIELDS.filter((f) => !same(row[f], q[f]))
        if (changed.length) p.update.push({ q, changed: [...changed] })
        else {
            p.unchanged.push(q)
            if (row.status !== "LIVE") p.draft.push(q.key)
        }
    }
    const bankKeys = new Set(APTITUDE_BANK.map((q) => q.key))
    p.orphaned = rows.filter((r) => r.companyId === null && !bankKeys.has(r.key as string)).map((r) => r.key as string).sort()
    return p
}

function report(p: Plan): number {
    for (const s of SECTIONS) {
        const n = (xs: AptitudeSeed[]) => xs.filter((q) => q.section === s).length
        console.log(`  ${s.padEnd(8)} + ${String(n(p.insert)).padStart(3)} to insert   ~ ${String(n(p.update.map((u) => u.q))).padStart(3)} to update   = ${String(n(p.unchanged)).padStart(3)} unchanged`)
    }
    for (const u of p.update) console.log(`  ~ ${u.q.key}: ${u.changed.join(", ")} changed`)
    for (const k of p.draft) console.log(`  = ${k}: matches the bank but is DRAFT in the database (left as is)`)
    for (const k of p.taken) console.log(`  ! ${k}: key belongs to a company's question (skipped)`)
    for (const k of p.orphaned) console.log(`  ! ${k}: in the database but not in the bank (left as is)`)
    const pending = p.insert.length + p.update.length
    console.log(pending ? `\n${p.insert.length} to insert, ${p.update.length} to update.` : "\nNothing to change.")
    return pending
}

const row = (q: AptitudeSeed) => ({
    key: q.key,
    companyId: null,
    section: q.section,
    topic: q.topic,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    status: "LIVE" as const,
})

async function main() {
    console.log(`Database: ${host()}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)

    const stats = bankStats(APTITUDE_BANK)
    console.log(`Bank: ${APTITUDE_BANK.length} questions (${SECTIONS.map((s) => `${s} ${stats.perSection[s]}`).join(", ")})`)
    for (const s of SECTIONS) {
        console.log(`  ${s.padEnd(8)} ${(["EASY", "MEDIUM", "HARD"] as const).map((d) => `${d} ${stats.perDifficulty[`${s} ${d}`] ?? 0}`).join(", ")}`)
    }
    console.log(`Answer positions: ${stats.correctIndex.map((c, i) => `${"ABCD"[i]} ${c}`).join(", ")}`)
    const problems = validateBank(APTITUDE_BANK)
    if (problems.length) {
        console.log(`\nValidation: ${problems.length} problem(s)`)
        for (const x of problems) console.log(`  x ${x}`)
    } else {
        console.log("Validation: no problems")
    }
    console.log("")

    const p = await plan()
    const pending = report(p)
    if (!apply) return
    if (problems.length) {
        console.error("\nRefusing to write: fix the validation problems above first.")
        process.exit(1)
    }
    if (!pending) return

    for (let i = 0; i < p.insert.length; i += 50) {
        // A key a company row took in the meantime is skipped, never overwritten.
        await db.insert(aptitudeQuestions).values(p.insert.slice(i, i + 50).map(row)).onConflictDoNothing({ target: aptitudeQuestions.key })
    }
    for (const u of p.update) {
        const { key: _key, companyId: _companyId, ...set } = row(u.q)
        await db
            .update(aptitudeQuestions)
            .set(set)
            .where(and(eq(aptitudeQuestions.key, u.q.key), isNull(aptitudeQuestions.companyId)))
    }
    console.log(`\nWrote ${p.insert.length} insert(s) and ${p.update.length} update(s). Checking again:\n`)
    report(await plan())
}

main().then(() => process.exit(0), (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
