import { and, eq, inArray, sql } from "drizzle-orm";
import { db, withTransaction } from "../client";
import { projectsV2, projectV2Sprints, projectV2Tasks, userProjectV2Progress, userTaskV2Statuses } from "../schema/projects";
import { users } from "../schema/schema";
import { BLUEPRINTS, SETUPS, type SeedSprint, type SeedTask } from "./blueprints";

/*
 * Setup (sprint 0) into every curated project AND every learner's copy of one
 * (plan/project-repos RP-3, RP-4), as a PLAN first and a write second.
 *
 * `planSetupSprints()` reads only, and says per project exactly what it would
 * change; `applySetupSprints(plan)` does those changes and nothing else. The
 * script `src/scripts/project-setup.ts` prints the plan by default and applies
 * it with --apply (Niraj, 2026-09-24: every data change ships as a script that
 * previews first).
 *
 * The blueprint reseed skips any project somebody has started, and replacing
 * sprints under a learner would orphan their statuses. So this is additive:
 * - no sprint 0 yet: insert it (order_index -1, so it sorts first and nothing
 *   is renumbered);
 * - sprint 0 there: update the tasks that differ from the blueprint, in place
 *   by position; insert missing ones; delete surplus ones only if nobody has
 *   touched them;
 * - sprint 1 task 1 still carrying its pre-Setup title: rewrite it in place,
 *   so its id and anyone's status on it survive;
 * - recount the progress rows whose totals change;
 * - bump `published_at` on a curated original that changed, or the snapshot
 *   rule would hide the new rows from the next person who enrols.
 */

type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];

const taskRow = (t: SeedTask, sprintId: string, projectId: string, orderIndex: number) => ({
    sprintId,
    projectV2Id: projectId,
    title: t.title,
    description: t.description,
    criteria: t.criteria,
    hints: t.hints,
    difficulty: t.difficulty,
    orderIndex,
    category: t.category,
    estimatedTime: t.estimatedTime,
});

export async function insertSetupSprint(tx: Tx, projectId: string, setup: SeedSprint) {
    const [row] = await tx
        .insert(projectV2Sprints)
        .values({ projectId, sprintNumber: 0, name: setup.name, goal: setup.goal, duration: setup.duration, orderIndex: -1, isApproved: true })
        .returning({ id: projectV2Sprints.id });
    if (row && setup.tasks.length) await tx.insert(projectV2Tasks).values(setup.tasks.map((t, j) => taskRow(t, row.id, projectId, j)));
}

/*
 * Sprint 1 task 1 as it read before Setup existed, per project (RP-4). A task
 * is rewritten only while it still carries one of these titles, so a copy whose
 * owner renamed it is left alone.
 */
const SUPERSEDED_FIRST_TASKS: Record<string, string> = {
    "expense-splitter": "Start the app with Prisma and a database",
    "job-board-with-matching": "Scaffold Next.js, Prisma and Tailwind",
    "personal-finance-tracker": "Stand up the app and a Postgres database",
    "realtime-collaboration-board": "Scaffold the app and the board route",
    "habit-tracker-weekly-review": "Make the starter yours",
    "markdown-notes-with-search": "Make the starter yours and model a note",
    "url-shortener-with-analytics": "Run a Node service against Postgres and Redis",
    "rate-limiter-service": "Stand up the Go service and Redis",
};

export interface ProgressChange {
    user: string
    status: string
    before: { done: number; total: number }
    after: { done: number; total: number }
}

export interface TargetPlan {
    slug: string
    /** The curated project whose Setup and blueprint apply (the original's slug). */
    source: string
    projectId: string
    /** The curated original, or a learner's copy of it. */
    isOriginal: boolean
    owner: string
    setup:
        | { kind: "insert"; tasks: number }
        | { kind: "refresh"; sprintId: string; sprintChanged: boolean; update: { id: string; index: number; title: string }[]; insert: number[]; remove: string[]; keptSurplus: number }
        | { kind: "same" }
    /** The sprint 1 task to rewrite in place, if it still has its old title. */
    rewriteFirst: { id: string; from: string; to: string } | null
    progress: ProgressChange[]
    bumpPublished: boolean
    changed: boolean
}

export interface SetupPlan {
    targets: TargetPlan[]
    skipped: string[]
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What applying would do, per project and copy. Reads only. */
export async function planSetupSprints(): Promise<SetupPlan> {
    const targets: TargetPlan[] = [];
    const skipped: string[] = [];

    for (const [slug, setup] of Object.entries(SETUPS)) {
        const [original] = await db.select({ id: projectsV2.id, owner: users.email }).from(projectsV2)
            .innerJoin(users, eq(users.id, projectsV2.createdBy)).where(eq(projectsV2.slug, slug)).limit(1);
        if (!original) { skipped.push(`${slug} (no project row)`); continue; }
        const forks = await db.select({ id: projectsV2.id, slug: projectsV2.slug, owner: users.email }).from(projectsV2)
            .innerJoin(users, eq(users.id, projectsV2.createdBy)).where(eq(projectsV2.forkedFromId, original.id));
        const firstTask = BLUEPRINTS[slug]?.[0]?.tasks[0];
        const oldTitle = SUPERSEDED_FIRST_TASKS[slug];

        for (const target of [{ ...original, slug }, ...forks]) {
            const isOriginal = target.id === original.id;
            const [sprint0] = await db.select().from(projectV2Sprints)
                .where(and(eq(projectV2Sprints.projectId, target.id), eq(projectV2Sprints.sprintNumber, 0))).limit(1);

            let plan: TargetPlan["setup"];
            let taskDelta = 0;
            if (!sprint0) {
                plan = { kind: "insert", tasks: setup.tasks.length };
                taskDelta = setup.tasks.length;
            } else {
                const have = await db.select().from(projectV2Tasks).where(eq(projectV2Tasks.sprintId, sprint0.id));
                const byIndex = new Map(have.map((t) => [t.orderIndex, t]));
                const update: { id: string; index: number; title: string }[] = [];
                const insert: number[] = [];
                setup.tasks.forEach((t, j) => {
                    const row = byIndex.get(j);
                    if (!row) { insert.push(j); return; }
                    const differs = row.title !== t.title || !same(row.description, t.description) || !same(row.criteria, t.criteria)
                        || !same(row.hints, t.hints) || row.difficulty !== t.difficulty || row.category !== t.category || row.estimatedTime !== t.estimatedTime;
                    if (differs) update.push({ id: row.id, index: j, title: t.title });
                });
                const surplus = have.filter((t) => t.orderIndex >= setup.tasks.length).map((t) => t.id);
                const touched = surplus.length
                    ? (await db.select({ id: userTaskV2Statuses.taskId }).from(userTaskV2Statuses).where(inArray(userTaskV2Statuses.taskId, surplus))).map((x) => x.id)
                    : [];
                const remove = surplus.filter((id) => !touched.includes(id));
                const sprintChanged = sprint0.name !== setup.name || sprint0.goal !== setup.goal || sprint0.duration !== setup.duration || sprint0.orderIndex !== -1;
                plan = update.length || insert.length || remove.length || sprintChanged
                    ? { kind: "refresh", sprintId: sprint0.id, sprintChanged, update, insert, remove, keptSurplus: surplus.length - remove.length }
                    : { kind: "same" };
                taskDelta = insert.length - remove.length;
            }

            let rewriteFirst: TargetPlan["rewriteFirst"] = null;
            if (firstTask && oldTitle) {
                const [row] = await db.select({ id: projectV2Tasks.id }).from(projectV2Tasks)
                    .innerJoin(projectV2Sprints, eq(projectV2Sprints.id, projectV2Tasks.sprintId))
                    .where(and(eq(projectV2Sprints.projectId, target.id), eq(projectV2Sprints.sprintNumber, 1), eq(projectV2Tasks.title, oldTitle)))
                    .limit(1);
                if (row) rewriteFirst = { id: row.id, from: oldTitle, to: firstTask.title };
            }

            const progress: ProgressChange[] = [];
            if (taskDelta !== 0) {
                const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(projectV2Tasks)
                    .innerJoin(projectV2Sprints, eq(projectV2Sprints.id, projectV2Tasks.sprintId)).where(eq(projectV2Sprints.projectId, target.id));
                const rows = await db.select({ userId: userProjectV2Progress.userId, email: users.email, status: userProjectV2Progress.status })
                    .from(userProjectV2Progress).innerJoin(users, eq(users.id, userProjectV2Progress.userId))
                    .where(eq(userProjectV2Progress.projectId, target.id));
                for (const r of rows) {
                    const [{ done } = { done: 0 }] = await db.select({ done: sql<number>`count(*)::int` }).from(userTaskV2Statuses)
                        .where(and(eq(userTaskV2Statuses.projectId, target.id), eq(userTaskV2Statuses.userId, r.userId), eq(userTaskV2Statuses.status, "COMPLETED")));
                    progress.push({ user: r.email, status: r.status, before: { done, total }, after: { done, total: total + taskDelta } });
                }
            }

            const changed = plan.kind !== "same" || rewriteFirst !== null;
            targets.push({
                slug: target.slug,
                source: slug,
                projectId: target.id,
                isOriginal,
                owner: target.owner,
                setup: plan,
                rewriteFirst,
                progress,
                bumpPublished: isOriginal && changed,
                changed,
            });
        }
    }
    return { targets, skipped };
}

/** Does what the plan says, one transaction per project or copy. */
export async function applySetupSprints(plan: SetupPlan): Promise<number> {
    let written = 0;
    for (const t of plan.targets) {
        if (!t.changed) continue;
        const setup = SETUPS[t.source];
        if (!setup) throw new Error(`No Setup found for ${t.source}`);
        const firstTask = t.rewriteFirst ? BLUEPRINTS[t.source]?.[0]?.tasks[0] : null;

        await withTransaction(async (tx) => {
            if (t.setup.kind === "insert") {
                await insertSetupSprint(tx, t.projectId, setup);
            } else if (t.setup.kind === "refresh") {
                const r = t.setup;
                if (r.sprintChanged) {
                    await tx.update(projectV2Sprints).set({ name: setup.name, goal: setup.goal, duration: setup.duration, orderIndex: -1 }).where(eq(projectV2Sprints.id, r.sprintId));
                }
                for (const u of r.update) {
                    const { sprintId: _s, projectV2Id: _p, ...fields } = taskRow(setup.tasks[u.index]!, r.sprintId, t.projectId, u.index);
                    await tx.update(projectV2Tasks).set(fields).where(eq(projectV2Tasks.id, u.id));
                }
                for (const j of r.insert) await tx.insert(projectV2Tasks).values(taskRow(setup.tasks[j]!, r.sprintId, t.projectId, j));
                if (r.remove.length) await tx.delete(projectV2Tasks).where(inArray(projectV2Tasks.id, r.remove));
            }

            if (t.rewriteFirst && firstTask) {
                await tx.update(projectV2Tasks)
                    .set({ title: firstTask.title, description: firstTask.description, criteria: firstTask.criteria, hints: firstTask.hints, estimatedTime: firstTask.estimatedTime, category: firstTask.category, testPath: null })
                    .where(and(eq(projectV2Tasks.id, t.rewriteFirst.id), eq(projectV2Tasks.title, t.rewriteFirst.from)));
            }

            if (t.progress.length) {
                // Every progress row on this project, against the new total.
                await tx.execute(sql`
                    update user_project_v2_progress p set
                        total_tasks = x.total,
                        tasks_completed = x.done,
                        progress_percentage = case when x.total > 0 then x.done::real * 100 / x.total else 0 end,
                        status = case when p.status in ('NOT_STARTED', 'SUBMITTED') then p.status
                                      when x.total > 0 and x.done = x.total then 'COMPLETED'
                                      else 'IN_PROGRESS' end,
                        completed_at = case when x.total > 0 and x.done = x.total then p.completed_at else null end
                    from (
                        select q.id, t.total, coalesce(d.done, 0)::int as done
                        from user_project_v2_progress q
                        cross join (
                            select count(*)::int as total from project_v2_task k
                            join project_v2_sprint s on s.id = k.sprint_id where s.project_id = ${t.projectId}
                        ) t
                        left join (
                            select user_id, count(*)::int as done from user_task_v2_status
                            where project_id = ${t.projectId} and status = 'COMPLETED' group by user_id
                        ) d on d.user_id = q.user_id
                        where q.project_id = ${t.projectId}
                    ) x
                    where p.id = x.id`);
            }

            if (t.bumpPublished) await tx.update(projectsV2).set({ publishedAt: new Date() }).where(eq(projectsV2.id, t.projectId));
        });
        written++;
    }
    return written;
}
