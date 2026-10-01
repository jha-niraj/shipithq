/**
 * Write one curated project (its catalogue row, sprints, tasks and idea) from packages/db/src/seed, without touching the other projects (plan/long-jobs-vercel LJV-10).
 *
 *   pnpm script curated-project --slug=long-jobs-on-vercel            preview
 *   pnpm script curated-project --slug=long-jobs-on-vercel --apply    write, then preview again
 *
 * The full catalogue still seeds with `pnpm db:seed --only=project-blueprints`; this is for
 * adding or refreshing ONE project. Sprints are rewritten only while nobody has started the
 * project, the same rule as the full seed: a learner's statuses point at task ids.
 */
import { count, eq } from "drizzle-orm"
import { db } from "../client"
import { projectsV2, projectV2Sprints, projectV2Tasks, userProjectV2Progress, users, projectIdeas } from "../schema"
import { requireMigrationsApplied } from "./_migrations-check"
import { PROJECTS } from "../seed/data"
import { PROJECT_IDEAS } from "../seed/project-ideas"
import { BLUEPRINTS, SETUPS } from "../seed/blueprints"
import { seedProjectBlueprints, seedProjectIdeas, seedProjects } from "../seed/index"

const apply = process.argv.includes("--apply")
const slug = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

async function plan(s: string) {
    const entry = PROJECTS.find((p) => p.slug === s)
    const idea = PROJECT_IDEAS.find((i) => i.projectSlug === s)
    const sprints = BLUEPRINTS[s] ?? []
    const setup = SETUPS[s]
    const authored = {
        sprints: sprints.length + (setup ? 1 : 0),
        tasks: sprints.reduce((n, sp) => n + sp.tasks.length, 0) + (setup?.tasks.length ?? 0),
    }
    const [row] = await db.select({ id: projectsV2.id, title: projectsV2.title }).from(projectsV2).where(eq(projectsV2.slug, s))
    const stored = row
        ? {
            sprints: (await db.select({ n: count() }).from(projectV2Sprints).where(eq(projectV2Sprints.projectId, row.id)))[0]?.n ?? 0,
            tasks: (await db.select({ n: count() }).from(projectV2Tasks).where(eq(projectV2Tasks.projectV2Id, row.id)))[0]?.n ?? 0,
            started: ((await db.select({ n: count() }).from(userProjectV2Progress).where(eq(userProjectV2Progress.projectId, row.id)))[0]?.n ?? 0) > 0,
        }
        : null
    const [ideaRow] = idea ? await db.select({ id: projectIdeas.id, linked: projectIdeas.blueprintProjectId }).from(projectIdeas).where(eq(projectIdeas.projectTitle, idea.projectTitle)) : []
    return { entry, idea, authored, row, stored, ideaRow, hasBlueprint: sprints.length > 0 }
}

function print(s: string, p: Awaited<ReturnType<typeof plan>>) {
    if (!p.entry) return console.log(`  ! ${s} is not in seed/data.ts PROJECTS`)
    console.log(`  ${p.row ? "=" : "+"} project  ${s} "${p.entry.title}"${p.row ? " (row exists; catalogue fields are refreshed)" : ""}`)
    if (!p.hasBlueprint) console.log(`  ! no blueprint for ${s} in seed/blueprints/index.ts`)
    else if (p.stored?.started) console.log(`  = sprints  left alone: somebody has started it (${p.stored.sprints} sprints, ${p.stored.tasks} tasks stored)`)
    else {
        const same = p.stored && p.stored.sprints === p.authored.sprints && p.stored.tasks === p.authored.tasks
        console.log(`  ${same ? "~" : "+"} sprints  ${p.authored.sprints} sprints, ${p.authored.tasks} tasks${p.stored ? ` (stored: ${p.stored.sprints}, ${p.stored.tasks}; rewritten)` : ""}`)
    }
    if (!p.idea) console.log(`  ! no idea for ${s} in seed/project-ideas.ts`)
    else console.log(`  ${p.ideaRow ? "=" : "+"} idea     "${p.idea.projectTitle}"${p.ideaRow ? (p.ideaRow.linked && p.row && p.ideaRow.linked === p.row.id ? ", linked to the project" : ", not linked yet") : ""}`)
}

async function main() {
    if (!slug) {
        console.log("Usage: pnpm script curated-project --slug=<project slug> [--apply]")
        return
    }
    const h = host()
    if (/prod|production/i.test(h) && apply) throw new Error(`Refusing to write to ${h}: it looks like production. Seed production on purpose, not by accident.`)
    await requireMigrationsApplied()
    console.log(`Curated project on ${h} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`)
    const before = await plan(slug)
    print(slug, before)
    if (!before.entry || !apply) return apply ? undefined : console.log("\nRun with --apply to write it.")

    const owner =
        (await db.query.users.findFirst({ where: eq(users.role, "Admin"), columns: { id: true } })) ??
        (await db.query.users.findFirst({ orderBy: (u, { asc }) => [asc(u.createdAt)], columns: { id: true } }))
    if (!owner) throw new Error("No user in the database: a project needs an owner.")

    await seedProjects(owner.id, slug)
    const bp = await seedProjectBlueprints(slug)
    const ideas = await seedProjectIdeas(slug)
    console.log(`\nWritten: ${bp.sprints} sprints, ${bp.tasks} tasks${bp.skipped.length ? ` (skipped: ${bp.skipped.join(", ")})` : ""}; idea ${ideas.written ? "written" : "unchanged"}${ideas.linked ? " and linked" : ""}.\n\nPlanning again:\n`)
    const after = await plan(slug)
    print(slug, after)
    const ok = after.row && after.stored && after.stored.sprints === after.authored.sprints && after.stored.tasks === after.authored.tasks && after.ideaRow?.linked === after.row.id
    console.log(ok ? "\nDone: the database matches the blueprint." : "\nSomething differs; look above.")
}

main().then(() => process.exit(0), (e: unknown) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
})

