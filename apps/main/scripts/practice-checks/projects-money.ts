// The money and ordering paths in the projects module (plan/projects,
// sweep-2026-09-23 / PJ-7). Run like the other checks:
//
//   node --env-file=.env \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ./scripts/practice-checks/css.mjs \
//     scripts/practice-checks/projects-money.ts
//
// Covers: sprint numbers under a unique index and a personal sprint, the mock
// interview hold (charged, refunded when the call recorded nothing, kept when it
// connected), the stale-session sweep, and progress recalculation on the action
// the sprints page now calls.

import { and, eq, inArray } from "drizzle-orm"
import {
    db, users, creditHolds, creditTransactions, projectsV2, projectV2Sprints, projectV2Tasks,
    userProjectV2Progress,
} from "@repo/db"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }

const ownerId = `e2e${crypto.randomUUID().replace(/-/g, "")}`
const otherId = `e2e${crypto.randomUUID().replace(/-/g, "")}`

// Some projects actions resolve the user by EMAIL, not id, so both travel
// together - see the `@repo/auth` stub in shims.mjs.
const emailOf = (id: string) => `${id}@e2e.shipithq.test`
const asUser = (id: string) => {
    process.env.E2E_USER_ID = id
    process.env.E2E_USER_EMAIL = emailOf(id)
}

const sprintFor = (name: string) => ({
    name,
    goal: "A goal",
    duration: "1 week",
    tasks: [{
        title: `${name} task`,
        description: ["Do the thing"],
        successCriteria: ["It is done"],
        hints: [],
        estimatedMinutes: 30,
        difficulty: "BEGINNER" as const,
        category: null,
        estimatedTime: null,
        checkpoints: [],
        relatedPages: [],
        dependencies: [],
        badges: [],
        tags: [],
        terminalCommand: null,
        orderIndex: 0,
    }],
})

let projectId = ""
asUser(ownerId)

try {
    await db.insert(users).values([
        { id: ownerId, name: "Money Owner", email: emailOf(ownerId), emailVerified: true, onboardingCompleted: true, credits: 500 },
        { id: otherId, name: "Money Other", email: emailOf(otherId), emailVerified: true, onboardingCompleted: true, credits: 500 },
    ] as (typeof users.$inferInsert)[])

    const [project] = await db.insert(projectsV2).values({
        slug: `e2e-money-${crypto.randomUUID().slice(0, 8)}`,
        title: "Money Test Project",
        description: "A project for the money checks.",
        generationType: "AI_GENERATED",
        difficulty: "BEGINNER",
        visibility: "PUBLIC",
        blueprintOverview: "Overview",
        stacks: {},
        assistantEcho: {},
        assistantRaw: {},
        includeAssessment: true,
        createdBy: ownerId,
    } as typeof projectsV2.$inferInsert).returning()
    projectId = project!.id

    const { addSprintToProject } = await import("@/actions/(main)/projects/sprint-generation.action")

    // ── Sprint numbering ──────────────────────────────────────────────────────
    const concurrent = await Promise.all([
        addSprintToProject(projectId, sprintFor("One")),
        addSprintToProject(projectId, sprintFor("Two")),
        addSprintToProject(projectId, sprintFor("Three")),
    ])
    check("three sprints added at once all succeed", concurrent.every((r) => r.success), concurrent.map((r) => r.error ?? "ok").join(", "))

    let sprints = await db.select({ id: projectV2Sprints.id, sprintNumber: projectV2Sprints.sprintNumber, orderIndex: projectV2Sprints.orderIndex })
        .from(projectV2Sprints).where(eq(projectV2Sprints.projectId, projectId))
    check("they get three distinct sprint numbers", new Set(sprints.map((s) => s.sprintNumber)).size === 3, sprints.map((s) => s.sprintNumber).join(","))
    check("the numbers run 1, 2, 3", [...sprints.map((s) => s.sprintNumber)].sort((a, b) => a - b).join(",") === "1,2,3")

    // A stranger cannot write into somebody else's project at all (the access
    // guard added 2026-09-23). Someone who has STARTED it can, and their sprint
    // is personal - and it still takes a number on the shared project.
    asUser(otherId)
    const stranger = await addSprintToProject(projectId, sprintFor("Stranger"))
    check("a stranger cannot add a sprint to a project they are not on", !stranger.success, stranger.error ?? "it was allowed")

    await db.insert(userProjectV2Progress).values({ userId: otherId, projectId, status: "IN_PROGRESS", totalTasks: 0 } as typeof userProjectV2Progress.$inferInsert)
    const personal = await addSprintToProject(projectId, sprintFor("Personal"))
    check("someone enrolled gets a personal sprint", personal.success && personal.data?.isPersonal === true, personal.error ?? "")

    asUser(ownerId)
    const afterPersonal = await addSprintToProject(projectId, sprintFor("Four"))
    check("the creator can still add one after a personal sprint took a number", afterPersonal.success, afterPersonal.error ?? "")
    sprints = await db.select({ id: projectV2Sprints.id, sprintNumber: projectV2Sprints.sprintNumber, orderIndex: projectV2Sprints.orderIndex })
        .from(projectV2Sprints).where(eq(projectV2Sprints.projectId, projectId))
    check("every sprint number is still unique", new Set(sprints.map((s) => s.sprintNumber)).size === sprints.length, sprints.map((s) => s.sprintNumber).join(","))
    check("every order index is still unique", new Set(sprints.map((s) => s.orderIndex)).size === sprints.length)

    // ── Task status recalculates progress ─────────────────────────────────────
    const tasks = await db.select({ id: projectV2Tasks.id }).from(projectV2Tasks)
        .where(inArray(projectV2Tasks.sprintId, sprints.map((s) => s.id)))
    await db.insert(userProjectV2Progress).values({ userId: ownerId, projectId, status: "IN_PROGRESS", totalTasks: tasks.length } as typeof userProjectV2Progress.$inferInsert)

    const { updateTaskStatus } = await import("@/actions/(main)/projects/project.action")
    const ticked = await updateTaskStatus(tasks[0]!.id, "COMPLETED")
    check("ticking a task succeeds", ticked.success, ticked.error ?? "")
    const [progressRow] = await db.select().from(userProjectV2Progress)
        .where(and(eq(userProjectV2Progress.userId, ownerId), eq(userProjectV2Progress.projectId, projectId)))
    check("the project's progress moved", (progressRow?.tasksCompleted ?? 0) === 1, `tasksCompleted=${progressRow?.tasksCompleted}`)
    check("the percentage moved with it", (progressRow?.progressPercentage ?? 0) > 0, `${progressRow?.progressPercentage}`)

    // The sprint-completion call and the old mock interview's credit hold were
    // checked here until 2026-09-24, when their actions were deleted: sprint and
    // final quizzes and mock interviews moved to worker jobs whose credits are
    // held and settled by the job system (plan/project-workspace WS-12..14).
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    if (projectId) {
        // Sprints reference their creator without a cascade, so they go before
        // the users even though the project would take them with it.
        await db.delete(projectV2Sprints).where(eq(projectV2Sprints.projectId, projectId)).catch((e) => console.log(`sprint cleanup failed: ${e}`))
        await db.delete(projectsV2).where(eq(projectsV2.id, projectId)).catch((e) => console.log(`project cleanup failed: ${e}`))
    }
    // Holds and ledger rows do not cascade from the user, so they go first.
    await db.delete(creditHolds).where(inArray(creditHolds.userId, [ownerId, otherId])).catch(() => {})
    await db.delete(creditTransactions).where(inArray(creditTransactions.userId, [ownerId, otherId])).catch(() => {})
    await db.delete(users).where(inArray(users.id, [ownerId, otherId])).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
