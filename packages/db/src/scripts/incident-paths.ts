/**
 * Write each incident's hand-written Pathfinder path, a shared goal owned by the ShipItHQ account (plan/pathfinder PF-13).
 *
 * The paths are authored in apps/main/content/incidents/paths.ts. For each one this
 * previews whether the goal would be created, rewritten (its topics or notes changed)
 * or left alone, and whether the ShipItHQ owner account would be created. With
 * --apply it writes, then plans again.
 *
 *   pnpm script incident-paths            preview
 *   pnpm script incident-paths --apply    write, then preview again (should be all "same")
 *
 * A rewrite keeps the goal's id, so readers' copies (which point at it by
 * forked_from_id) stay linked; it replaces the days, topics and their notes.
 */
import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, withTransaction } from "../client";
import {
    users, pathfinderGoals, pathfinderVerifications, pathfinderDailySessions, pathfinderSubGoals, studios, studioSteps,
} from "../schema";
import { requireMigrationsApplied } from "./_migrations-check";
import { INCIDENT_PATHS, PATH_OWNER, type IncidentPath } from "../../../../apps/main/content/incidents/paths";
import { INCIDENT_CASES } from "../../../../apps/main/content/incidents/cases";
import { PATH_CASES } from "../../../../apps/main/content/incidents/path-cases";

const apply = process.argv.includes("--apply");
const OWNER_ID = "shipithq-official";
/** A fixed first day for the source goal; copies move day one to the day they are made. */
const FIRST_DAY = "2026-01-05";

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);
/** What the stored goal must match: its fields, and each day's topics with their notes. */
const authoredDigest = (p: IncidentPath) => hash({
    goal: [p.title, p.overview, p.category, p.level, p.learningObjectives, p.prerequisites],
    days: p.days.map((d) => d.map((t) => [t.title, t.summary, t.notes, (t.code ?? []).map((c) => [c.sample, c.stage, c.file, c.note])])),
});
async function storedDigest(goalId: string) {
    const g = await db.query.pathfinderGoals.findFirst({
        where: eq(pathfinderGoals.id, goalId),
        with: { dailySessions: { orderBy: [asc(pathfinderDailySessions.date)], with: { subGoals: { orderBy: [asc(pathfinderSubGoals.order)] } } } },
    });
    if (!g) return null;
    const ids = g.dailySessions.flatMap((d) => d.subGoals.map((t) => t.studioId)).filter((s): s is string => !!s);
    const steps = ids.length ? await db.select({ studioId: studioSteps.studioId, content: studioSteps.content }).from(studioSteps).where(and(inArray(studioSteps.studioId, ids), eq(studioSteps.type, "EXPLANATION"))) : [];
    const notes = new Map(steps.map((s) => [s.studioId, s.content]));
    // Code to read on the day (plan/long-jobs-vercel LJV-9): CODE steps naming a sample file.
    const codeRows = ids.length ? await db.select({ studioId: studioSteps.studioId, order: studioSteps.orderNumber, metadata: studioSteps.metadata }).from(studioSteps).where(and(inArray(studioSteps.studioId, ids), eq(studioSteps.type, "CODE"))) : [];
    const code = new Map<string, unknown[][]>();
    for (const r of codeRows.sort((a, b) => a.order - b.order)) {
        const m = (r.metadata ?? {}) as { sample?: string; stage?: string; file?: string; note?: string };
        if (!m.sample) continue;
        code.set(r.studioId, [...(code.get(r.studioId) ?? []), [m.sample, m.stage, m.file, m.note]]);
    }
    return hash({
        goal: [g.title, g.overview, g.category, g.level, g.learningObjectives, g.prerequisites],
        days: g.dailySessions.map((d) => d.subGoals.map((t) => [t.title, t.description, t.studioId ? notes.get(t.studioId) ?? null : null, t.studioId ? code.get(t.studioId) ?? [] : []])),
    });
}
const day = (i: number) => new Date(Date.parse(`${FIRST_DAY}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);

type Plan = { caseSlug: string; path: IncidentPath; action: "create" | "rewrite" | "same"; goalId: string | null; why: string };

async function owner() {
    return db.query.users.findFirst({ where: eq(users.email, PATH_OWNER.email), columns: { id: true, username: true } });
}

async function plan(): Promise<{ ownerAction: "create" | "exists"; plans: Plan[] }> {
    const who = await owner();
    const plans: Plan[] = [];
    const authored = Object.keys(INCIDENT_PATHS).sort().join(",");
    if (authored !== [...PATH_CASES].sort().join(",")) {
        throw new Error(`content/incidents/path-cases.ts (${PATH_CASES.join(", ")}) does not match the paths in paths.ts (${authored}).`);
    }
    for (const [caseSlug, path] of Object.entries(INCIDENT_PATHS)) {
        const learn = INCIDENT_CASES[caseSlug as keyof typeof INCIDENT_CASES]?.learn?.map((l) => l.title) ?? [];
        const titles = path.days.flat().map((t) => t.title);
        if (JSON.stringify(learn) !== JSON.stringify(titles)) {
            throw new Error(`The path for ${caseSlug} has drifted from the case's learn list.\n  learn: ${learn.join(" | ")}\n  path:  ${titles.join(" | ")}`);
        }
        const goal = who
            ? await db.query.pathfinderGoals.findFirst({
                where: and(eq(pathfinderGoals.userId, who.id), eq(pathfinderGoals.slug, path.slug)),
                columns: { id: true },
            })
            : undefined;
        const same = goal ? (await storedDigest(goal.id)) === authoredDigest(path) : false;
        plans.push({
            caseSlug, path,
            action: !goal ? "create" : same ? "same" : "rewrite",
            goalId: goal?.id ?? null,
            why: !goal ? "no goal yet" : same ? "matches the content" : "content changed",
        });
    }
    return { ownerAction: who ? "exists" : "create", plans };
}

function print(p: Awaited<ReturnType<typeof plan>>) {
    console.log(`  owner ${PATH_OWNER.email}: ${p.ownerAction === "create" ? "+ would be created (no password, cannot sign in)" : "exists"}`);
    for (const x of p.plans) {
        const topics = x.path.days.flat().length;
        console.log(`  ${x.action === "same" ? "=" : x.action === "create" ? "+" : "~"} ${x.caseSlug} -> "${x.path.title}" (${x.path.days.length} days, ${topics} topics): ${x.why}`);
    }
    return p.plans.filter((x) => x.action !== "same").length + (p.ownerAction === "create" ? 1 : 0);
}

async function write(p: Awaited<ReturnType<typeof plan>>) {
    if (p.ownerAction === "create") {
        await db.insert(users).values({
            id: OWNER_ID, name: PATH_OWNER.name, email: PATH_OWNER.email, username: PATH_OWNER.username,
            emailVerified: true, onboardingCompleted: true,
        } as typeof users.$inferInsert);
    }
    const who = (await owner())!;

    for (const x of p.plans.filter((y) => y.action !== "same")) {
        const { path } = x;
        await withTransaction(async (tx) => {
            let goalId = x.goalId;
            const fields = {
                title: path.title, overview: path.overview, category: path.category, level: path.level,
                learningObjectives: path.learningObjectives, prerequisites: path.prerequisites,
                estimatedDays: path.days.length, totalSubGoals: path.days.flat().length,
                isPublic: true, status: "ACTIVE" as const,
            };
            if (!goalId) {
                const [g] = await tx.insert(pathfinderGoals).values({ userId: who.id, slug: path.slug, startedAt: new Date(), ...fields }).returning({ id: pathfinderGoals.id });
                goalId = g!.id;
                await tx.insert(pathfinderVerifications).values({ goalId, quizStatus: "PENDING", codingStatus: "LOCKED", mockStatus: "LOCKED", projectStatus: "PENDING" });
            } else {
                await tx.update(pathfinderGoals).set(fields).where(eq(pathfinderGoals.id, goalId));
                const old = await tx.select({ studioId: pathfinderSubGoals.studioId }).from(pathfinderSubGoals).where(eq(pathfinderSubGoals.goalId, goalId));
                const ids = old.map((o) => o.studioId).filter((s): s is string => !!s);
                if (ids.length) await tx.delete(studios).where(inArray(studios.id, ids));
                await tx.delete(pathfinderDailySessions).where(eq(pathfinderDailySessions.goalId, goalId));
            }

            for (const [i, topics] of path.days.entries()) {
                const [session] = await tx.insert(pathfinderDailySessions).values({ goalId, userId: who.id, date: day(i), totalSubGoals: topics.length }).returning({ id: pathfinderDailySessions.id });
                for (const [order, topic] of topics.entries()) {
                    const [sub] = await tx.insert(pathfinderSubGoals).values({
                        goalId, sessionId: session!.id, title: topic.title, description: topic.summary,
                        source: "incident_path", order: order + 1, isContentLoaded: true,
                    }).returning({ id: pathfinderSubGoals.id });
                    const [studio] = await tx.insert(studios).values({
                        slug: `subgoal-${sub!.id}`, title: topic.title, description: topic.summary,
                        source: "PATHFINDER", sourceId: sub!.id, visibility: "PRIVATE", userId: who.id, stepCount: 1 + (topic.code?.length ?? 0),
                    }).returning({ id: studios.id });
                    await tx.insert(studioSteps).values({ studioId: studio!.id, orderNumber: 1, type: "EXPLANATION", content: topic.notes, source: "USER", metadata: {} });
                    // Each file to read that day: a CODE step the viewer renders read-only (LJV-9).
                    for (const [i, c] of (topic.code ?? []).entries()) {
                        await tx.insert(studioSteps).values({ studioId: studio!.id, orderNumber: 2 + i, type: "CODE", content: "", source: "USER", metadata: { sample: c.sample, stage: c.stage, file: c.file, note: c.note } });
                    }
                    await tx.update(pathfinderSubGoals).set({ studioId: studio!.id }).where(eq(pathfinderSubGoals.id, sub!.id));
                }
            }
        });
    }
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nIncident paths on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const p = await plan();
    const n = print(p);
    if (!apply) {
        console.log(n ? "\n  Preview only. Run with --apply to write these.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!n) { console.log("\n  Nothing to write.\n"); return; }
    await write(p);
    console.log("\n  Written. Checking again...\n");
    const left = print(await plan());
    console.log(left ? "\n  Something is still pending - read the lines above.\n" : "\n  Done: every path matches the content.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
