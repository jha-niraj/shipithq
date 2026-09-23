/**
 * Seed the platform with companies, their jobs, and public projects.
 *
 *     pnpm db:seed                  # companies, jobs, projects
 *     pnpm db:seed --applications=you@example.com
 *     pnpm db:seed --clear          # remove everything this script created
 *     pnpm db:seed --only=practice       # just the DSA practice catalogue
 *     pnpm db:seed --only=project-ideas  # just the curated project catalogue
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * Every layout decision in this product has been made against an empty database:
 * the jobs tabs all read (0), My Applications shows four zero tiles above an
 * empty state, and the projects catalogue is bare. Niraj, 2026-08-29: *"I wanted
 * to see the experience and all the feeling as the students will do."* You cannot
 * judge a job card until a job card has a company name in it.
 *
 * ── Three properties this script holds to ────────────────────────────────────
 *
 * 1. **Idempotent.** Every row is keyed on a stable `slug` and written with
 *    `onConflictDoUpdate`. Running it twice updates; it never duplicates. That
 *    matters because the natural way to use a seed is to run it, look, change the
 *    copy, and run it again.
 *
 * 2. **Reversible, and never touching real rows.** Seeded records are identifiable
 *    by their slugs, and `--clear` removes exactly those. It does not truncate a
 *    table, because a table may also hold rows a real user made.
 *
 * 3. **Refuses to run against production.** The check is on the connection
 *    string, and it fails closed: an unrecognised host is treated as production
 *    rather than assumed safe.
 *
 * ── The user-owned parts are opt-in ──────────────────────────────────────────
 * Companies, jobs and projects belong to the platform. Applications belong to a
 * PERSON, so they are only written when you name that person with
 * `--applications=<email>`. Seeding somebody's application history without being
 * asked would put rows in their account that they did not create.
 */

import { db } from "../client";
import { practiceProblem } from "../schema/practice";
import { DSA_CATALOGUE, SEEDED_SORT_ORDER_FLOOR } from "./practice-dsa";
import { PROJECT_IDEAS } from "./project-ideas";
import { BLUEPRINTS } from "./blueprints";
import { projectIdeas, projectV2Sprints, projectV2Tasks, userProjectV2Progress } from "../schema/projects";
import {
    companies,
    companyMembers,
    jobs,
    jobApplications,
    projectsV2,
    users,
} from "../index";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { COMPANIES, JOBS, PROJECTS } from "./data";

// ── Safety ───────────────────────────────────────────────────────────────────

/**
 * Fails CLOSED. An unfamiliar host is treated as production, because the cost of
 * being wrong in that direction is a missing seed, and in the other direction it
 * is rows in a live database.
 */
function assertNotProduction() {
    const url = process.env.DATABASE_URL ?? "";
    if (!url) throw new Error("DATABASE_URL is not set.");

    const safe =
        url.includes("localhost") ||
        url.includes("127.0.0.1") ||
        /-dev|-staging|-test|dev-|staging-/.test(url);

    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) {
        throw new Error(
            "Refusing to seed: DATABASE_URL does not look like a local or dev database.\n" +
            "If this really is a throwaway environment, set SEED_I_KNOW_WHAT_I_AM_DOING=1.",
        );
    }
}

/** Every slug this script owns, so `--clear` can remove exactly its own rows. */
const OWNED = {
    companies: COMPANIES.map((c) => c.slug),
    jobs: JOBS.map((j) => j.slug),
    projects: PROJECTS.map((p) => p.slug),
};

function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ── Seeding ──────────────────────────────────────────────────────────────────

async function seedCompanies(): Promise<Map<string, string>> {
    const bySlug = new Map<string, string>();

    for (const c of COMPANIES) {
        const [row] = await db
            .insert(companies)
            .values({
                slug: c.slug,
                name: c.name,
                description: c.description,
                industry: c.industry,
                companySize: c.companySize,
                foundedYear: c.foundedYear,
                headquarters: c.headquarters,
                city: c.city,
                state: c.state,
                country: c.country,
                website: c.website,
                culture: c.culture,
                benefits: c.benefits,
                techStack: c.techStack,
                responseRatePercent: c.responseRatePercent,
                avgTimeToHireDays: c.avgTimeToHireDays,
                interviewToOfferPercent: c.interviewToOfferPercent,
                totalHired: c.totalHired,
                // Seeded companies are VERIFIED, because an unverified company is
                // filtered out of the browse surfaces this seed exists to fill.
                verificationStatus: "VERIFIED",
                verifiedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: companies.slug,
                set: {
                    name: c.name,
                    description: c.description,
                    industry: c.industry,
                    companySize: c.companySize,
                    headquarters: c.headquarters,
                    culture: c.culture,
                    benefits: c.benefits,
                    techStack: c.techStack,
                    verificationStatus: "VERIFIED",
                },
            })
            .returning({ id: companies.id, slug: companies.slug });

        if (row) bySlug.set(row.slug, row.id);
    }

    return bySlug;
}

/**
 * `job.posted_by_id` is NOT NULL and references `company_member`, NOT `user`.
 *
 * That is the right model - a job is posted by somebody acting FOR a company,
 * not by a bare account - and it means each seeded company needs a member row
 * before any of its jobs can exist. The member is the platform owner account
 * wearing a recruiter hat, which is the honest answer: nobody at Lumen Labs
 * posted this.
 */
async function seedCompanyMembers(
    companyIds: Map<string, string>,
    userId: string,
    email: string,
): Promise<Map<string, string>> {
    const memberByCompanySlug = new Map<string, string>();

    for (const [slug, companyId] of companyIds) {
        const existing = await db
            .select({ id: companyMembers.id })
            .from(companyMembers)
            .where(
                and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)),
            )
            .limit(1);

        if (existing[0]) {
            memberByCompanySlug.set(slug, existing[0].id);
            continue;
        }

        const [row] = await db
            .insert(companyMembers)
            .values({
                userId,
                companyId,
                email,
                role: "RECRUITER",
                displayName: "Platform (seed)",
                inviteStatus: "ACCEPTED",
                acceptedAt: new Date(),
                isActive: true,
            })
            .returning({ id: companyMembers.id });

        if (row) memberByCompanySlug.set(slug, row.id);
    }

    return memberByCompanySlug;
}


async function seedJobs(
    companyIds: Map<string, string>,
    memberIds: Map<string, string>,
): Promise<number> {
    let n = 0;

    for (const j of JOBS) {
        const companyId = companyIds.get(j.companySlug);
        const postedById = memberIds.get(j.companySlug);
        if (!companyId || !postedById) {
            // A job whose company did not resolve would render "at undefined",
            // which is precisely the defect this seed is meant to expose.
            console.warn(`  ! skipping ${j.slug}: no company for ${j.companySlug}`);
            continue;
        }

        const published = daysAgo(j.publishedDaysAgo);

        await db
            .insert(jobs)
            .values({
                slug: j.slug,
                companyId,
                postedById,
                title: j.title,
                description: j.description,
                locationType: j.locationType,
                employmentType: j.employmentType,
                location: j.location,
                experienceMin: j.experienceMin,
                experienceMax: j.experienceMax,
                salaryMin: j.salaryMin,
                salaryMax: j.salaryMax,
                salaryCurrency: "INR",
                salaryDisclosed: true,
                skillsRequired: j.skillsRequired,
                skillsPreferred: j.skillsPreferred,
                requirements: j.requirements,
                responsibilities: j.responsibilities,
                benefits: j.benefits,
                featured: j.featured,
                // ACTIVE and PUBLIC, or the job exists and no browse query returns it.
                status: "ACTIVE",
                visibility: "PUBLIC",
                publishedAt: published,
                createdAt: published,
                expiresAt: daysAgo(j.publishedDaysAgo - 60),
                viewsCount: Math.round(40 + Math.random() * 600),
            })
            .onConflictDoUpdate({
                target: jobs.slug,
                set: {
                    title: j.title,
                    description: j.description,
                    companyId,
                    postedById,
                    skillsRequired: j.skillsRequired,
                    skillsPreferred: j.skillsPreferred,
                    requirements: j.requirements,
                    responsibilities: j.responsibilities,
                    benefits: j.benefits,
                    featured: j.featured,
                    status: "ACTIVE",
                    visibility: "PUBLIC",
                    publishedAt: published,
                },
            });
        n++;
    }

    return n;
}

/**
 * Public catalogue projects.
 *
 * `visibility: 'PUBLIC'` is what separates the catalogue from a user's own work
 * (see PRJ-1) - without it these rows exist and the catalogue still reads empty.
 * `createdBy` is NOT NULL, so they are attributed to the first admin, or failing
 * that the oldest account.
 */
/**
 * A setup guide derived from the project's own stack.
 *
 * The Setup Guide tab reads `projects_v2.setup_guide`, and every seeded project
 * had none, so the tab said "No Setup Guide Available" on all ten (Niraj,
 * 2026-09-23: "even the projects that you created don't really have these pages
 * and setup guides"). Writing ten by hand would be ten chances to drift from the
 * stack the project actually declares; deriving it from `stacks` cannot drift.
 *
 * It says what is true for any project on that stack and nothing more: the tools
 * you need, the commands to get it running, and how you know it worked.
 */
function setupGuideFor(p: (typeof PROJECTS)[number]) {
    const frontend = p.stacks.frontend ?? "None";
    const backend = p.stacks.backend ?? "None";
    const database = p.stacks.database ?? "None";

    const node = /next|react|node|express|vue|svelte/i.test(`${frontend} ${backend}`);
    const go = /go\b/i.test(backend);
    const postgres = /postgres/i.test(database);
    const redis = /redis/i.test(`${database} ${p.technologies.join(" ")}`);
    const docker = /docker|clickhouse/i.test(p.technologies.join(" "));
    const localOnly = /localstorage|indexeddb|sqlite|none/i.test(database);

    const prerequisites = [
        node ? "Node.js 20 or newer, with pnpm or npm" : null,
        go ? "Go 1.22 or newer" : null,
        postgres ? "PostgreSQL 15 or newer, running locally or in Docker" : null,
        redis ? "Redis 7 or newer" : null,
        docker ? "Docker, for the services this project runs alongside" : null,
        "Git, and an editor you are comfortable debugging in",
    ].filter(Boolean) as string[];

    const environmentVariables = [
        postgres
            ? { name: "DATABASE_URL", purpose: "Where the database lives.", required: true, exampleValue: "postgresql://localhost:5432/" + p.slug.replace(/-/g, "_") }
            : null,
        redis
            ? { name: "REDIS_URL", purpose: "The cache or store this project measures itself against.", required: true, exampleValue: "redis://localhost:6379" }
            : null,
    ].filter(Boolean) as Array<{ name: string; purpose: string; required: boolean; exampleValue: string }>;

    const installationSteps = [
        `git clone <your repository> && cd ${p.slug}`,
        node ? "pnpm install" : go ? "go mod download" : "install the project's dependencies",
        environmentVariables.length ? "cp .env.example .env and fill in the values above" : null,
        postgres ? "Run the migrations, so the schema exists before the app starts" : null,
        node ? "pnpm dev" : go ? "go run ./cmd/server" : "Start the project",
    ].filter(Boolean) as string[];

    const verificationSteps = [
        localOnly
            ? "The app opens, and what you enter is still there after a hard refresh."
            : "The app opens and can read and write to the database.",
        "The first sprint's first task can be started without touching anything outside this list.",
    ];

    return { prerequisites, environmentVariables, installationSteps, verificationSteps };
}

async function seedProjects(ownerId: string): Promise<number> {
    let n = 0;

    for (const p of PROJECTS) {
        await db
            .insert(projectsV2)
            .values({
                slug: p.slug,
                title: p.title,
                shortDescription: p.shortDescription,
                description: p.description,
                technologies: p.technologies,
                generationType: p.generationType,
                difficulty: p.difficulty,
                estimatedHours: p.estimatedHours,
                blueprintOverview: p.blueprintOverview,
                recruiterSignal: p.recruiterSignal,
                keyOutcomes: p.keyOutcomes,
                stacks: p.stacks,
                // These two are NOT NULL and normally hold the generator's input and
                // its raw reply. A seeded project had neither, so they record that
                // rather than pretending to be model output.
                assistantEcho: { source: "seed", slug: p.slug },
                assistantRaw: { source: "seed", note: "Hand-written catalogue entry, not model output." },
                setupGuide: setupGuideFor(p),
                isPlatformSeeded: true,
                projectSource: "PLATFORM_SEEDED",
                visibility: "PUBLIC",
                guidedModeEnabled: true,
                totalViews: p.totalViews,
                totalStarted: p.totalStarted,
                createdBy: ownerId,
            })
            .onConflictDoUpdate({
                target: projectsV2.slug,
                set: {
                    title: p.title,
                    shortDescription: p.shortDescription,
                    description: p.description,
                    technologies: p.technologies,
                    difficulty: p.difficulty,
                    blueprintOverview: p.blueprintOverview,
                    recruiterSignal: p.recruiterSignal,
                    keyOutcomes: p.keyOutcomes,
                    setupGuide: setupGuideFor(p),
                    visibility: "PUBLIC",
                    isPlatformSeeded: true,
                },
            });
        n++;
    }

    return n;
}

/**
 * The sprints and tasks behind each curated project (plan/projects, PJ-11).
 *
 * Runs after `seedProjects`, because a sprint needs its project's id.
 *
 * REPLACES rather than upserts: the blueprint file is the source of truth, and
 * matching 20 tasks up by title to decide what moved is a worse problem than
 * writing them again. The delete cascades to the tasks.
 *
 * It will NOT touch a project somebody has already started. Replacing the
 * sprints under a user's feet would orphan their task statuses and reset the
 * progress that gates their quiz and mock interview, so a started project keeps
 * what it has and the seeder says so.
 */
async function seedProjectBlueprints(): Promise<{ projects: number; sprints: number; tasks: number; skipped: string[] }> {
    let projectCount = 0, sprintCount = 0, taskCount = 0;
    const skipped: string[] = [];

    for (const [slug, sprints] of Object.entries(BLUEPRINTS)) {
        const [project] = await db
            .select({ id: projectsV2.id })
            .from(projectsV2)
            .where(eq(projectsV2.slug, slug))
            .limit(1);
        if (!project) {
            skipped.push(`${slug} (no project row)`);
            continue;
        }

        const [started] = await db
            .select({ id: userProjectV2Progress.id })
            .from(userProjectV2Progress)
            .where(eq(userProjectV2Progress.projectId, project.id))
            .limit(1);
        if (started) {
            skipped.push(`${slug} (somebody has started it)`);
            continue;
        }

        await db.delete(projectV2Sprints).where(eq(projectV2Sprints.projectId, project.id));

        for (const [i, sprint] of sprints.entries()) {
            const [row] = await db
                .insert(projectV2Sprints)
                .values({
                    projectId: project.id,
                    sprintNumber: i + 1,
                    name: sprint.name,
                    goal: sprint.goal,
                    duration: sprint.duration,
                    orderIndex: i,
                    isApproved: true,
                })
                .returning({ id: projectV2Sprints.id });
            if (!row) continue;
            sprintCount++;

            if (sprint.tasks.length) {
                await db.insert(projectV2Tasks).values(
                    sprint.tasks.map((t, j) => ({
                        sprintId: row.id,
                        projectV2Id: project.id,
                        title: t.title,
                        description: t.description,
                        criteria: t.criteria,
                        hints: t.hints,
                        difficulty: t.difficulty,
                        orderIndex: j,
                        category: t.category,
                        estimatedTime: t.estimatedTime,
                    })),
                );
                taskCount += sprint.tasks.length;
            }
        }

        // No task total to write on the project: `total_tasks` lives on
        // `user_project_v2_progress`, per user, and is set when somebody starts.
        projectCount++;
    }

    return { projects: projectCount, sprints: sprintCount, tasks: taskCount, skipped };
}

/**
 * A believable application history for ONE named user.
 *
 * The statuses are spread across the pipeline on purpose: the applications page
 * groups into All / Active / Offers / Closed, and every one of those buckets
 * needs a row or the tabs cannot be told apart - which is the actual complaint.
 */
const APPLICATION_PLAN: { jobSlug: string; status: string; daysAgo: number }[] = [
    { jobSlug: "lumen-labs-backend-engineer-traces", status: "INTERVIEW_SCHEDULED", daysAgo: 9 },
    { jobSlug: "northwind-payments-backend-engineer", status: "UNDER_REVIEW", daysAgo: 5 },
    { jobSlug: "cobalt-security-rust-engineer", status: "OFFER_EXTENDED", daysAgo: 21 },
    { jobSlug: "verdant-health-fullstack-intern", status: "APPLIED", daysAgo: 2 },
    { jobSlug: "atlas-mobility-mobile-engineer", status: "REJECTED", daysAgo: 30 },
    { jobSlug: "quanta-retail-data-engineer", status: "SHORTLISTED", daysAgo: 12 },
    { jobSlug: "lumen-labs-frontend-engineer", status: "INTERESTED", daysAgo: 1 },
    { jobSlug: "cobalt-security-frontend-intern", status: "WITHDRAWN", daysAgo: 40 },
];

async function seedApplications(email: string): Promise<number> {
    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true, email: true },
    });

    if (!user) {
        console.warn(`  ! no user with email ${email} - skipping applications`);
        return 0;
    }

    const jobRows = await db
        .select({ id: jobs.id, slug: jobs.slug })
        .from(jobs)
        .where(inArray(jobs.slug, APPLICATION_PLAN.map((a) => a.jobSlug)));

    const jobIdBySlug = new Map(jobRows.map((r) => [r.slug, r.id]));
    let n = 0;

    for (const plan of APPLICATION_PLAN) {
        const jobId = jobIdBySlug.get(plan.jobSlug);
        if (!jobId) continue;

        const when = daysAgo(plan.daysAgo);

        // No unique constraint on (jobId, userId) to conflict against, so this
        // checks first. Re-running must not stack eight more applications.
        const existing = await db
            .select({ id: jobApplications.id })
            .from(jobApplications)
            .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, user.id)))
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(jobApplications)
                .set({ status: plan.status as never, appliedAt: when })
                .where(eq(jobApplications.id, existing[0]!.id));
        } else {
            await db.insert(jobApplications).values({
                jobId,
                userId: user.id,
                status: plan.status as never,
                appliedAt: when,
                createdAt: when,
                matchScore: Math.round(55 + Math.random() * 40),
            });
        }
        n++;
    }

    return n;
}

// ── Clearing ─────────────────────────────────────────────────────────────────

async function clear() {
    // Applications first: they reference jobs.
    const jobRows = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(inArray(jobs.slug, OWNED.jobs));

    if (jobRows.length > 0) {
        await db.delete(jobApplications).where(
            inArray(jobApplications.jobId, jobRows.map((r) => r.id)),
        );
    }

    await db.delete(jobs).where(inArray(jobs.slug, OWNED.jobs));
    await db.delete(projectsV2).where(inArray(projectsV2.slug, OWNED.projects));
    await db.delete(companies).where(inArray(companies.slug, OWNED.companies));

    console.log("Cleared every row this seed created.");
}

/**
 * The curated project catalogue the ideas page browses (plan/projects, PJ-2).
 *
 * Upserts on the title, so re-running edits the copy and never duplicates a row
 * or disturbs an idea somebody submitted. Not part of `--clear`: a generated
 * project points back at the idea it came from.
 */
async function seedProjectIdeas(): Promise<{ written: number; linked: number; removed: number }> {
    const existing = await db
        .select({ id: projectIdeas.id, title: projectIdeas.projectTitle })
        .from(projectIdeas);
    const byTitle = new Map(existing.map((r) => [r.title, r.id]));

    let written = 0;
    for (const idea of PROJECT_IDEAS) {
        const values = {
            projectTitle: idea.projectTitle,
            projectDescription: idea.projectDescription,
            difficulty: idea.difficulty,
            technologies: idea.technologies,
            categories: idea.categories,
            primaryLanguageOrFramework: idea.primaryLanguageOrFramework,
            // Curated, approved and visible; `generationType` is what the generator
            // reads when a user builds from it.
            generationType: "CURATED",
            ideaType: "TECHNOLOGY_SPECIFIC" as const,
            isPlatformCurated: true,
            status: "APPROVED" as const,
            overview: idea.projectDescription,
        };
        const id = byTitle.get(idea.projectTitle);
        if (id) await db.update(projectIdeas).set(values).where(eq(projectIdeas.id, id));
        else await db.insert(projectIdeas).values(values);
        written++;
    }

    /*
     * Point each idea at the project it opens.
     *
     * `blueprint_project_id` and `has_blueprint_generated` already existed for
     * exactly this - an idea that has been turned into a project. Setting them is
     * what makes the Explore card say "Build this" and link to the project
     * instead of offering to generate one (plan/projects, PJ-8 and PJ-11).
     */
    let linked = 0;
    for (const idea of PROJECT_IDEAS) {
        const [project] = await db
            .select({ id: projectsV2.id })
            .from(projectsV2)
            .where(eq(projectsV2.slug, idea.projectSlug))
            .limit(1);
        if (!project) continue;
        await db
            .update(projectIdeas)
            .set({
                blueprintProjectId: project.id,
                hasBlueprintGenerated: true,
                blueprintGeneratedAt: new Date(),
            })
            .where(eq(projectIdeas.projectTitle, idea.projectTitle));
        linked++;
    }

    /*
     * Everything else goes. Niraj, 2026-09-23: "keep the 10 only on the platform
     * and delete the rest, this list should be crisp."
     *
     * Scoped to PLATFORM-CURATED rows, so an idea a user submitted is left alone
     * even though nothing in the product creates one today.
     */
    const keep = PROJECT_IDEAS.map((i) => i.projectTitle);
    const removed = await db
        .delete(projectIdeas)
        .where(and(eq(projectIdeas.isPlatformCurated, true), notInArray(projectIdeas.projectTitle, keep)))
        .returning({ id: projectIdeas.id });

    return { written, linked, removed: removed.length };
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * The DSA practice catalogue (plan/practice-dsa PD-11).
 *
 * Upserts statement fields only, on slug. Never touches judge columns (tests
 * are generated and validated separately) or `isActive`, so re-running after
 * generation keeps every problem's tests. A row with a sortOrder below the
 * seeded floor is a user's own problem that shares a slug: it is reported and
 * left alone.
 *
 * Deliberately NOT part of `--clear`: deleting a problem cascades to every
 * user's practice session on it.
 */
async function seedPracticeDsa(): Promise<{ written: number; skipped: string[] }> {
    const existing = await db
        .select({ slug: practiceProblem.slug, sortOrder: practiceProblem.sortOrder })
        .from(practiceProblem);
    const userOwned = new Set(existing.filter((r) => r.sortOrder < SEEDED_SORT_ORDER_FLOOR).map((r) => r.slug));

    const skipped: string[] = [];
    let written = 0;
    for (const p of DSA_CATALOGUE) {
        if (userOwned.has(p.slug)) {
            skipped.push(p.slug);
            continue;
        }
        const statement = {
            title: p.title,
            description: p.description,
            category: p.category,
            difficulty: p.difficulty,
            requirements: p.requirements,
            hints: p.hints,
            tags: p.tags,
            sortOrder: p.sortOrder,
        };
        await db
            .insert(practiceProblem)
            .values({ slug: p.slug, module: "DSA", isActive: true, ...statement })
            .onConflictDoUpdate({ target: practiceProblem.slug, set: statement });
        written++;
    }
    return { written, skipped };
}

async function main() {
    assertNotProduction();

    const args = process.argv.slice(2);
    if (args.includes("--clear")) {
        await clear();
        return;
    }

    if (args.includes("--only=project-ideas")) {
        const r = await seedProjectIdeas();
        console.log(`  projects   ${r.written} curated ideas, ${r.linked} linked to a project, ${r.removed} removed`);
        return;
    }

    // The ten curated projects with their sprints and tasks, without touching
    // companies, jobs or practice (plan/projects, PJ-11).
    if (args.includes("--only=project-blueprints")) {
        const owner =
            (await db.query.users.findFirst({ where: eq(users.role, "Admin"), columns: { id: true } })) ??
            (await db.query.users.findFirst({ orderBy: (u, { asc }) => [asc(u.createdAt)], columns: { id: true } }));
        if (!owner) {
            console.warn("  ! no user in the database - projects need an owner");
            return;
        }
        const projectCount = await seedProjects(owner.id);
        console.log(`  projects   ${projectCount} catalogue projects`);
        const bp = await seedProjectBlueprints();
        console.log(`  blueprints ${bp.projects} projects, ${bp.sprints} sprints, ${bp.tasks} tasks${bp.skipped.length ? ` (skipped: ${bp.skipped.join(", ")})` : ""}`);
        const ideas = await seedProjectIdeas();
        console.log(`  ideas      ${ideas.written} written, ${ideas.linked} linked, ${ideas.removed} removed`);
        return;
    }

    if (args.includes("--only=practice")) {
        const r = await seedPracticeDsa();
        console.log(`  practice   ${r.written} DSA problems${r.skipped.length ? ` (left alone, user-owned: ${r.skipped.join(", ")})` : ""}`);
        return;
    }

    console.log("Seeding...\n");

    // Resolved FIRST: `job.posted_by_id` and `projects_v2.created_by` are both
    // NOT NULL, so nothing below can be written without an owning account.
    // Prefer an admin; fall back to the oldest account so a fresh environment
    // still seeds.
    const owner =
        (await db.query.users.findFirst({
            // "Admin", not "ADMIN". The role enum is title-case (Student, Admin,
            // HR, UNI) while every other enum in this schema is SCREAMING_CASE,
            // and Postgres rejects the wrong casing rather than ignoring it.
            where: eq(users.role, "Admin"),
            columns: { id: true, email: true },
        })) ??
        (await db.query.users.findFirst({
            orderBy: (u, { asc }) => [asc(u.createdAt)],
            columns: { id: true, email: true },
        }));

    if (!owner) {
        console.warn("  ! no user in the database - cannot seed jobs or projects");
        return;
    }

    const companyIds = await seedCompanies();
    console.log(`  companies  ${companyIds.size}`);

    const memberIds = await seedCompanyMembers(companyIds, owner.id, owner.email ?? "seed@shipithq.local");
    console.log(`  members    ${memberIds.size}`);

    const jobCount = await seedJobs(companyIds, memberIds);
    console.log(`  jobs       ${jobCount}`);

    const projectCount = await seedProjects(owner.id);
    console.log(`  projects   ${projectCount}`);

    const blueprints = await seedProjectBlueprints();
    console.log(`  blueprints ${blueprints.projects} projects, ${blueprints.sprints} sprints, ${blueprints.tasks} tasks${blueprints.skipped.length ? ` (skipped: ${blueprints.skipped.join(", ")})` : ""}`);

    const ideas = await seedProjectIdeas();
    console.log(`  ideas      ${ideas.written} curated, ${ideas.linked} linked to a project, ${ideas.removed} removed`);

    const practice = await seedPracticeDsa();
    console.log(`  practice   ${practice.written} DSA problems${practice.skipped.length ? ` (left alone, user-owned: ${practice.skipped.join(", ")})` : ""}`);

    const appArg = args.find((a) => a.startsWith("--applications="));
    if (appArg) {
        const email = appArg.split("=")[1] ?? "";
        const appCount = await seedApplications(email);
        console.log(`  applications ${appCount}  (${email})`);
    } else {
        console.log("  applications skipped - pass --applications=<email> to add them");
    }

    console.log("\nDone.");
}

main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
        console.error("\nSeed failed:", error);
        process.exit(1);
    });
