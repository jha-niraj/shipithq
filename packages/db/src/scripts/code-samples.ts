/**
 * Write the reference code samples (samples/<slug>/<stage>/) into the database for the read-only code viewer (plan/long-jobs-vercel LJV-3).
 *
 *   pnpm script code-samples                         preview: per file, add / change / remove / same
 *   pnpm script code-samples --apply                 write, then preview again (should be all "same")
 *   pnpm script code-samples --from <dir> [--apply]  read the long-jobs-on-vercel stages from <dir>
 *                                                    instead (a real repo laid out as <dir>/<stage>/)
 *
 * The samples and their stages are listed in SAMPLES below; a folder under samples/ that is
 * not listed is ignored. Files the viewer has no use for (node_modules, .next, lockfiles,
 * binaries) are skipped, and a file over 200 KB stops the run.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs"
import { join, relative, resolve, extname, basename } from "node:path"
import { and, eq, inArray } from "drizzle-orm"
import { db, withTransaction } from "../client"
import { codeSamples, codeSampleFiles, type CodeSampleStage } from "../schema"
import { requireMigrationsApplied } from "./_migrations-check"

const apply = process.argv.includes("--apply")
const fromArg = (() => {
    const i = process.argv.indexOf("--from")
    return i >= 0 ? process.argv[i + 1] : undefined
})()

const REPO_ROOT = resolve(import.meta.dirname, "../../../..")
const MAX_BYTES = 200 * 1024

type SampleSpec = { slug: string; title: string; summary: string; repoUrl: string | null; stages: CodeSampleStage[] }

const SAMPLES: SampleSpec[] = [
    {
        slug: "long-jobs-on-vercel",
        title: "Long jobs on Vercel",
        summary: "A weekly report in 10 steps of 15 seconds, run inline (stopped at 60 seconds) and as a Vercel Workflow.",
        repoUrl: null,
        stages: [
            { id: "inline", label: "Inline", note: "One route awaits every step, and the function is stopped at 60 seconds." },
            { id: "workflow", label: "With Workflow", note: "The same steps as a workflow: each step its own function, a run the page can come back to." },
        ],
    },
]

const SKIP_DIRS = new Set(["node_modules", ".next", ".swc", ".vercel", ".git", ".turbo", "out", "dist"])
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "next-env.d.ts", ".DS_Store"])
const LANGUAGE: Record<string, string> = {
    ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx", ".mjs": "js", ".json": "json",
    ".css": "css", ".md": "markdown", ".yaml": "yaml", ".yml": "yaml",
}
const TEXT_NAMES = new Set([".gitignore", ".env.example", "README"])

/** Key-sorted, because jsonb hands keys back in its own order. */
function canonical(v: unknown): string {
    const sort = (x: unknown): unknown => Array.isArray(x) ? x.map(sort)
        : x && typeof x === "object" ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, y]) => [k, sort(y)]))
        : x
    return JSON.stringify(sort(v))
}

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

type FileRow = { stage: string; path: string; language: string; content: string; lines: number }

function readStage(root: string, stage: string): FileRow[] {
    const out: FileRow[] = []
    const walk = (dir: string) => {
        for (const name of readdirSync(dir).sort()) {
            const full = join(dir, name)
            if (statSync(full).isDirectory()) {
                if (!SKIP_DIRS.has(name)) walk(full)
                continue
            }
            if (SKIP_FILES.has(name)) continue
            const language = LANGUAGE[extname(name)] ?? (TEXT_NAMES.has(basename(name)) ? "text" : null)
            if (!language) continue
            if (statSync(full).size > MAX_BYTES) throw new Error(`${full} is over 200 KB; the viewer is for reading code, not data`)
            const content = readFileSync(full, "utf8").replace(/\r\n/g, "\n")
            out.push({ stage, path: relative(root, full).split("\\").join("/"), language, content, lines: content.replace(/\n$/, "").split("\n").length })
        }
    }
    walk(root)
    return out
}

function authored(spec: SampleSpec): FileRow[] {
    const base = fromArg && spec.slug === "long-jobs-on-vercel" ? resolve(fromArg) : join(REPO_ROOT, "samples", spec.slug)
    return spec.stages.flatMap((s) => {
        const dir = join(base, s.id)
        if (!existsSync(dir)) throw new Error(`Stage folder missing: ${dir}`)
        return readStage(dir, s.id)
    })
}

/** A rough +added -removed line count, for the preview only. */
function lineDelta(a: string, b: string): string {
    const before = new Set(a.split("\n"))
    const after = new Set(b.split("\n"))
    const added = [...after].filter((l) => !before.has(l)).length
    const removed = [...before].filter((l) => !after.has(l)).length
    return `+${added} -${removed}`
}

type Plan = {
    spec: SampleSpec
    sampleAction: "insert" | "update" | "same"
    sampleId: string | null
    add: FileRow[]
    change: (FileRow & { id: string; delta: string })[]
    remove: { id: string; stage: string; path: string }[]
    same: number
}

async function plan(): Promise<Plan[]> {
    const plans: Plan[] = []
    for (const spec of SAMPLES) {
        const files = authored(spec)
        const [existing] = await db.select().from(codeSamples).where(eq(codeSamples.slug, spec.slug))
        const sampleSame = existing
            && existing.title === spec.title && existing.summary === spec.summary && existing.repoUrl === spec.repoUrl
            && canonical(existing.stages) === canonical(spec.stages)
        const stored = existing ? await db.select().from(codeSampleFiles).where(eq(codeSampleFiles.sampleId, existing.id)) : []
        const byKey = new Map(stored.map((f) => [`${f.stage}/${f.path}`, f]))
        const p: Plan = { spec, sampleAction: !existing ? "insert" : sampleSame ? "same" : "update", sampleId: existing?.id ?? null, add: [], change: [], remove: [], same: 0 }
        for (const f of files) {
            const old = byKey.get(`${f.stage}/${f.path}`)
            byKey.delete(`${f.stage}/${f.path}`)
            if (!old) p.add.push(f)
            else if (old.content !== f.content || old.language !== f.language) p.change.push({ ...f, id: old.id, delta: lineDelta(old.content, f.content) })
            else p.same++
        }
        p.remove = [...byKey.values()].map((f) => ({ id: f.id, stage: f.stage, path: f.path }))
        plans.push(p)
    }
    return plans
}

function print(plans: Plan[]) {
    for (const p of plans) {
        console.log(`\n${p.spec.slug}: sample row ${p.sampleAction}`)
        p.add.forEach((f) => console.log(`  add     ${f.stage}/${f.path} (${f.lines} lines)`))
        p.change.forEach((f) => console.log(`  change  ${f.stage}/${f.path} (${f.delta})`))
        p.remove.forEach((f) => console.log(`  remove  ${f.stage}/${f.path}`))
        console.log(`  same    ${p.same} file(s)`)
    }
}

const pending = (plans: Plan[]) => plans.some((p) => p.sampleAction !== "same" || p.add.length || p.change.length || p.remove.length)

async function write(plans: Plan[]) {
    for (const p of plans) {
        await withTransaction(async (tx) => {
            const values = { slug: p.spec.slug, title: p.spec.title, summary: p.spec.summary, repoUrl: p.spec.repoUrl, stages: p.spec.stages, updatedAt: new Date() }
            let sampleId = p.sampleId
            if (!sampleId) [{ id: sampleId }] = await tx.insert(codeSamples).values(values).returning({ id: codeSamples.id })
            else if (p.sampleAction === "update" || p.add.length || p.change.length || p.remove.length) await tx.update(codeSamples).set(values).where(eq(codeSamples.id, sampleId))
            if (p.add.length) await tx.insert(codeSampleFiles).values(p.add.map((f) => ({ ...f, sampleId: sampleId! })))
            for (const f of p.change) await tx.update(codeSampleFiles).set({ language: f.language, content: f.content, lines: f.lines }).where(and(eq(codeSampleFiles.id, f.id), eq(codeSampleFiles.sampleId, sampleId!)))
            if (p.remove.length) await tx.delete(codeSampleFiles).where(inArray(codeSampleFiles.id, p.remove.map((f) => f.id)))
        })
    }
}

async function main() {
    await requireMigrationsApplied()
    console.log(`Code samples on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}${fromArg ? `, long-jobs-on-vercel from ${resolve(fromArg)}` : ""}`)
    const plans = await plan()
    print(plans)
    if (!pending(plans)) return console.log("\nNothing to change.")
    if (!apply) return console.log("\nRun with --apply to write these.")
    await write(plans)
    console.log("\nWritten. Planning again:")
    const again = await plan()
    print(again)
    console.log(pending(again) ? "\nSomething is still pending; look above." : "\nNothing left: the database matches the samples.")
}

main().then(() => process.exit(0), (e: unknown) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
})
