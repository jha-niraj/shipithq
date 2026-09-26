import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { generateAndSaveCoverLetter } from "@/actions/(main)/ai/cover-letter.action";
import { startProjectGeneration } from "@/actions/(main)/workers/projectsworker.action";
import { createPathfinderGoal } from "@/actions/(main)/pathfinder/goals.action";
import { resolveDestination, DESTINATION_IDS } from "@/lib/ai/destinations";
import {
    db, users, projectsV2, projectIdeas, userProjectV2Progress,
    pathfinderGoals, practiceModuleProgress, jobs, companies, resumeDraft,
    jobListed,
} from "@repo/db";

// ─────────────────────────────────────────────────────────────────────────────
// Agent tools for the ShipItHQ assistant.
//
// Design rules, all of which exist because the model decides when these run:
//
//  1. EVERY tool is scoped to the calling user's id, which the model never sees
//     and cannot pass. `userId` is bound by the route from the session, so a
//     hallucinated argument cannot read someone else's rows.
//  2. READ ONLY, with ONE deliberate exception. Nothing here writes, and nothing
//     takes a free-form SQL or path argument. A tool the model can be talked into
//     misusing is not a tool.
//
//     The exception is `create_cover_letter`, and it is marked `writes: true` so
//     the route can treat it differently rather than it being an ordinary-looking
//     entry that happens to spend money. What makes it safe enough:
//       - it requires a job description of real length, so it cannot fire on
//         "write me a cover letter" with nothing to write about
//       - it creates a row and dispatches a job the user can see and delete; it
//         cannot destroy or overwrite anything
//       - it costs credits, and the hold is taken by the same `startBackgroundJob`
//         path the button on /ai/coverletter uses, so an insufficient balance is
//         refused identically
//     Any FUTURE write tool needs the same three properties argued for it.
//  3. Results are capped and projected down to the few columns worth spending
//     tokens on. Returning a whole row would blow the context on jsonb blobs
//     (`stacks`, `assistantRaw`) that say nothing useful in a chat reply.
//  4. Every handler returns a plain object, never throws. A tool that throws
//     would abort the turn; a tool that returns `{ error }` lets the model
//     explain the problem.
// ─────────────────────────────────────────────────────────────────────────────

/** OpenAI function-tool shape. Kept local so this file has no SDK dependency. */
export interface ToolSpec {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, unknown>;
            required?: string[];
            additionalProperties: false;
        };
    };
}

type Handler = (args: Record<string, unknown>, userId: string) => Promise<unknown>;

/**
 * What a tool hands back beyond its JSON payload.
 *
 * `action` is a control the panel should render - see `ActionFrame` in protocol.ts. It is
 * returned separately from the model-facing result so the route can emit it verbatim: the
 * model never sees the href and so cannot mangle it.
 */
export interface ToolOutcome {
    /** Goes to the model as the tool message. */
    result: unknown;
    /** One control, from a tool that made one thing. */
    action?: { label: string; href: string; kind?: string };
    /** Several, from a tool that offers a choice of destinations. */
    actions?: Array<{ label: string; href: string; kind?: string }>;
}

/** Clamp a model-supplied count into a range we're willing to pay for. */
function limitArg(raw: unknown, fallback: number, max: number): number {
    const n = typeof raw === "number" ? Math.floor(raw) : Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(n, max);
}

function stringArg(raw: unknown, max = 120): string | null {
    if (typeof raw !== "string") return null;
    const s = raw.trim().slice(0, max);
    return s.length ? s : null;
}


// ── link_to ──────────────────────────────────────────────────────────────────
//
// Not a write, and not really a lookup: it turns an answer into somewhere to go.
//
// The model picks an id from `lib/ai/destinations.ts` and the route renders the href on that
// row as a button. The model never writes a path, because a model writing a URL is a model
// guessing one - it does not know this app's routes and will invent plausible ones.
//
// Up to three, because a reply ending in six buttons is a menu, and the point is a next step.

const linkTo: Handler = async (args) => {
    const raw = Array.isArray(args.destinations)
        ? args.destinations
        : args.destination != null
            ? [args.destination]
            : [];

    const resolved = raw
        .map((id) => resolveDestination(id))
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .slice(0, 3);

    if (!resolved.length) {
        return {
            error: "unknown_destination",
            message:
                "None of those ids exist. Pick from the enum on this tool, or answer without a button.",
        };
    }

    return {
        _summary: resolved.length === 1 ? "Found the page" : `Found ${resolved.length} pages`,
        destinations: resolved.map((d) => ({ id: d.id, label: d.label })),
        message: "The user is shown these as buttons. Do not repeat the links in your reply.",
        __actions: resolved.map((d) => ({ label: d.label, href: d.href, kind: "page" })),
    };
};

// ── create_project ───────────────────────────────────────────────────────────
//
// Second write tool. Dispatches the SAME `project_generation` job the "Start building" sheet
// on /projects/ideas dispatches - the schema, the credit arithmetic and the worker are all
// unchanged, this is another caller of them.
//
// Cost is 13 credits public / 25 private, plus 30 with an assessment. Defaults are the cheap
// ones: a model choosing the expensive branch on the user's behalf is not a decision it
// should be making silently.

const createProject: Handler = async (args, userId) => {
    void userId; // startProjectGeneration reads the session itself.

    const title = stringArg(args.project_title, 160);
    const description = typeof args.project_description === "string" ? args.project_description.trim() : "";

    if (!title) return { error: "missing_title", message: "Ask the user which project to build." };
    if (description.length < 40) {
        return {
            error: "missing_description",
            message:
                "A project needs a real description to generate from - at least a few sentences. " +
                "If this came from a listed idea, pass that idea's description.",
        };
    }

    const GEN = ["FULL_STACK", "FRONTEND", "PROGRAMS", "AI/ML", "AI_AGENT", "APP", "OTHER"] as const;
    const DIFF = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
    const rawGen = stringArg(args.generation_type, 20)?.toUpperCase();
    const rawDiff = stringArg(args.difficulty, 20)?.toUpperCase();

    const stacks = (args.stacks && typeof args.stacks === "object" && !Array.isArray(args.stacks)
        ? args.stacks
        : {}) as Record<string, unknown>;
    const pick = (k: string) => (typeof stacks[k] === "string" ? (stacks[k] as string).slice(0, 60) : undefined);

    const res = await startProjectGeneration({
        projectTitle: title,
        projectDescription: description.slice(0, 4000),
        generationType: (GEN as readonly string[]).includes(rawGen ?? "") ? (rawGen as typeof GEN[number]) : "FULL_STACK",
        stacks: {
            frontend: pick("frontend"),
            backend: pick("backend"),
            database: pick("database"),
            deployment: pick("deployment"),
            aiProvider: pick("aiProvider"),
        },
        technologies: Array.isArray(args.technologies)
            ? (args.technologies as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 12)
            : [],
        difficulty: (DIFF as readonly string[]).includes(rawDiff ?? "") ? (rawDiff as typeof DIFF[number]) : "INTERMEDIATE",
        // Cheap branch by default - see the note above.
        visibility: args.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        includeAssessment: args.include_assessment === true,
        LearnsFocus: [],
        preferences: { generateNow: true },
    });

    if (!res.success) {
        return { error: "failed", message: res.error ?? "Could not start the project." };
    }

    return {
        status: "started",
        message:
            "The project is being generated in the background - sprints and tasks take a couple of minutes. " +
            "Tell the user it is building and that the button opens their projects. Do NOT invent a link.",
        __action: {
            label: `Open: ${title}`,
            href: "/projects/myprojects",
            kind: "project",
        },
    };
};

// ── create_goal ──────────────────────────────────────────────────────────────
//
// Third write tool. Public goals are free; private ones cost credits, so PUBLIC is the
// default for the same reason as above.

const createGoal: Handler = async (args, userId) => {
    void userId; // createPathfinderGoal reads the session itself.

    const title = stringArg(args.title, 160);
    if (!title) return { error: "missing_title", message: "Ask the user what the goal is." };

    const CATEGORIES = [
        "DSA", "WEB_DEVELOPMENT", "FRONTEND", "BACKEND", "DEVOPS",
        "AI_ML", "DATABASE", "SYSTEM_DESIGN", "MOBILE", "OTHER",
    ] as const;
    const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

    const rawCat = stringArg(args.category, 30)?.toUpperCase();
    const rawLevel = stringArg(args.level, 20)?.toUpperCase();

    const res = await createPathfinderGoal({
        title,
        category: ((CATEGORIES as readonly string[]).includes(rawCat ?? "") ? rawCat : "OTHER") as (typeof CATEGORIES)[number],
        level: ((LEVELS as readonly string[]).includes(rawLevel ?? "") ? rawLevel : "BEGINNER") as (typeof LEVELS)[number],
        focusAreas: Array.isArray(args.focus_areas)
            ? (args.focus_areas as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 8)
            : [],
        // Public is free. A private goal costs credits, which is not a charge to make on the
        // user's behalf without them asking for it.
        isPublic: args.is_public !== false,
        generateAIPlan: args.generate_plan === true,
    });

    if (!res.success) {
        return { error: "failed", message: res.error ?? "Could not create that goal." };
    }

    const slug = (res as { goal?: { slug?: string } }).goal?.slug;
    return {
        status: "created",
        title,
        message: "The goal is on their Pathfinder. Do NOT invent a link - the user gets a button.",
        __action: {
            label: `Open goal: ${title}`,
            href: slug ? `/pathfinder/${slug}` : "/pathfinder",
            kind: "goal",
        },
    };
};

// ── create_cover_letter ──────────────────────────────────────────────────────
//
// The one tool that writes. See rule 2 at the top of this file for why it is allowed and
// what any future write tool has to argue.
//
// It does NOT generate the letter here. `generateAndSaveCoverLetter` creates the row and
// dispatches a `cover_letter` background job, exactly as the button on /ai/coverletter does -
// per the working agreement, anything that calls an LLM runs in apps/worker as a Durable
// Object, never in a request. So this returns "started", and the action button takes the user
// to the page that polls it.
//
// Credits are held by that same call at the `cover_letter_generate` price. Nothing about the
// money is re-implemented here, which is the point: there is one place that decides.

const MIN_JD_CHARS = 120;

const createCoverLetter: Handler = async (args, userId) => {
    const jobDescription = typeof args.job_description === "string" ? args.job_description.trim() : "";

    // A real posting, not a gesture at one. Without this the model will happily call the tool
    // on "make me a cover letter", spend the user's credits and produce a letter about
    // nothing. The number is a floor on "there is something here to work from", not a
    // judgement about quality.
    if (jobDescription.length < MIN_JD_CHARS) {
        return {
            error: "no_job_description",
            message:
                `A cover letter needs the job description itself - at least ${MIN_JD_CHARS} characters of it. ` +
                "Ask the user to paste the posting, then call this again.",
        };
    }

    const jobTitle = stringArg(args.job_title, 160) ?? "";
    const companyName = stringArg(args.company_name, 160) ?? "";
    const tone = stringArg(args.tone, 40) ?? "Professional";

    const res = await generateAndSaveCoverLetter({
        jobUrl: "",
        jobDescription: jobDescription.slice(0, 20000),
        jobTitle,
        companyName,
        tone,
        questions: [],
        answers: {},
    });

    if (!res.success) {
        // Insufficient credits is a normal outcome with a specific remedy, so it is worth
        // distinguishing rather than folding into a generic failure.
        if (res.code === "INSUFFICIENT_CREDITS") {
            return {
                error: "insufficient_credits",
                required: res.required,
                available: res.available,
                message:
                    `This costs ${res.required ?? "some"} credits and the user has ${res.available ?? 0}. ` +
                    "Tell them, and that they can top up on the purchase page. Do not retry.",
            };
        }
        return { error: "failed", message: res.error ?? "Could not start the cover letter." };
    }

    return {
        status: "started",
        cover_letter_id: res.coverLetterId,
        message:
            "The cover letter is being written in the background and takes about a minute. " +
            "Tell the user it is on its way and that the button opens it - do NOT write the letter yourself, " +
            "and do NOT invent a link.",
        // Consumed by the route, not by the model.
        __action: {
            label: jobTitle ? `Open cover letter: ${jobTitle}` : "Open cover letter",
            href: `/ai/coverletter?id=${res.coverLetterId}`,
            kind: "cover-letter",
        },
    };
};

/**
 * The sections a resume is missing, in the order worth fixing them.
 *
 * Ordered by what a recruiter notices first, not by how easy each is to fill in: a resume
 * with no experience and no projects has nothing to read, whereas a missing summary is a
 * polish item. Returning them ranked means the model's advice is ranked without it having to
 * decide the ranking.
 */
function resumeGaps(
    content: {
        experience?: unknown[];
        projects?: unknown[];
        education?: unknown[];
        skills?: Array<{ items?: string[] }>;
        certifications?: unknown[];
    },
    header: Record<string, string | null>,
): string[] {
    const gaps: string[] = [];
    const skillCount = (content.skills ?? []).reduce((n, g) => n + (g.items?.length ?? 0), 0);

    if (!(content.experience ?? []).length) gaps.push("work experience");
    if (!(content.projects ?? []).length) gaps.push("projects");
    if (skillCount < 5) gaps.push("skills (fewer than five listed)");
    if (!(content.education ?? []).length) gaps.push("education");
    if (!header.summary) gaps.push("a professional summary");
    if (!header.title) gaps.push("a headline");
    if (!header.location) gaps.push("location");
    if (!header.github && !header.linkedin) gaps.push("a GitHub or LinkedIn link");
    return gaps;
}

// ── get_my_profile ───────────────────────────────────────────────────────────

const getMyProfile: Handler = async (_args, userId) => {
    const [row] = await db
        .select({
            name: users.name,
            username: users.username,
            headline: users.headline,
            bio: users.bio,
            university: users.university,
            semester: users.semester,
            company: users.company,
            occupation: users.occupation,
            yearsOfExperience: users.yearsOfExperience,
            interests: users.interests,
            learningPreferences: users.learningPreferences,
            careerGoals: users.careerGoals,
            targetCompanies: users.targetCompanies,
            openToWork: users.openToWork,
            hasResume: users.hasResume,
            credits: users.credits,
            currentLevel: users.currentLevel,
            totalXp: users.totalXp,
            streak: users.streak,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!row) return { error: "Profile not found." };
    return row;
};

// ── get_my_resume ────────────────────────────────────────────────────────────

/**
 * The user's default resume, as structured content.
 *
 * This is the tool that makes "tailor this for me" work without the user pasting
 * their background into the chat. It reads the resume they marked as default;
 * failing that, their most recently updated one; failing that, the raw text
 * extracted from whatever they uploaded, which is all a user who has only ever
 * dropped in a PDF will have until the structuring job lands.
 *
 * Bullets are capped rather than returned whole: a long resume is several
 * thousand tokens of context on every turn that mentions it, and the tail of a
 * ten-bullet role is not what the model is reasoning about.
 */
const getMyResume: Handler = async (_args, userId) => {
    const [draft] = await db
        .select({
            name: resumeDraft.name,
            content: resumeDraft.content,
            isDefault: resumeDraft.isDefault,
            tailoredFor: resumeDraft.tailoredFor,
            updatedAt: resumeDraft.updatedAt,
        })
        .from(resumeDraft)
        .where(eq(resumeDraft.userId, userId))
        // Default first, then most recently touched - the same order
        // `getDefaultResumeDraft` uses, so the assistant and the app never
        // disagree about which resume is "theirs".
        .orderBy(desc(resumeDraft.isDefault), desc(resumeDraft.updatedAt))
        .limit(1);

    if (draft) {
        const content = (draft.content ?? {}) as {
            header?: Record<string, unknown>;
            experience?: Array<{ company?: string; role?: string; startDate?: string; endDate?: string; current?: boolean; bullets?: string[] }>;
            projects?: Array<{ name?: string; description?: string; technologies?: string[] }>;
            education?: Array<{ institution?: string; degree?: string; field?: string; endDate?: string }>;
            skills?: Array<{ category?: string; items?: string[] }>;
            certifications?: Array<{ name?: string; issuer?: string }>;
        };
        const header = (content.header ?? {}) as Record<string, string | null>;
        const gaps = resumeGaps(content, header);
        return {
            source: "resume",
            resumeName: draft.name,
            isDefault: draft.isDefault,
            tailoredFor: draft.tailoredFor,
            headline: header.title ?? null,
            summary: header.summary ?? null,
            location: header.location ?? null,
            experience: (content.experience ?? []).slice(0, 8).map((e) => ({
                company: e.company,
                role: e.role,
                startDate: e.startDate,
                endDate: e.current ? "Present" : e.endDate,
                bullets: (e.bullets ?? []).slice(0, 5),
            })),
            projects: (content.projects ?? []).slice(0, 6).map((p) => ({
                name: p.name,
                description: p.description,
                technologies: p.technologies,
            })),
            education: (content.education ?? []).slice(0, 4),
            skills: content.skills ?? [],
            certifications: (content.certifications ?? []).slice(0, 6),
            // What is MISSING, computed here rather than left to the model to notice.
            //
            // "Tell me about my resume" is almost always really "is my resume any good", and
            // the useful half of that answer is the gaps. Deriving it from the same rows the
            // summary came from means the two cannot disagree - and the model reading a list
            // of sections and inferring absence is exactly the sort of thing it gets subtly
            // wrong (it will call three bullet points "thorough").
            gaps,
            // The button only appears when there is something to go and DO. On a complete
            // resume "Complete your profile" is noise at best and wrong at worst.
            ...(gaps.length
                ? {
                    __action: {
                        label: "Complete your profile",
                        href: "/profile",
                        kind: "profile",
                    },
                }
                : {}),
        };
    }

    // No structured resume yet. The raw upload is still better than nothing, and
    // saying so lets the model explain why its answer is rougher than usual.
    const [row] = await db
        .select({ hasResume: users.hasResume, resumeText: users.resumeText })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (row?.resumeText) {
        return {
            source: "uploaded_text",
            note: "Raw text from the user's uploaded resume. It has not been parsed into sections yet, so treat the structure loosely.",
            text: row.resumeText.slice(0, 6000),
        };
    }

    return {
        source: "none",
        hasResume: row?.hasResume ?? false,
        note: "This user has no resume on ShipItHQ yet. Suggest they upload one or build one at /ai/resume before giving resume-specific advice.",
    };
};

// ── list_my_projects ─────────────────────────────────────────────────────────

const PROJECT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "COMPLETED"] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const listMyProjects: Handler = async (args, userId) => {
    const limit = limitArg(args.limit, 10, 25);
    const status = stringArg(args.status, 20)?.toUpperCase();
    const wanted = PROJECT_STATUSES.includes(status as ProjectStatus)
        ? (status as ProjectStatus)
        : null;

    const rows = await db
        .select({
            title: projectsV2.title,
            slug: projectsV2.slug,
            difficulty: projectsV2.difficulty,
            technologies: projectsV2.technologies,
            estimatedHours: projectsV2.estimatedHours,
            status: userProjectV2Progress.status,
            progressPercentage: userProjectV2Progress.progressPercentage,
            tasksCompleted: userProjectV2Progress.tasksCompleted,
            totalTasks: userProjectV2Progress.totalTasks,
            totalScore: userProjectV2Progress.totalScore,
            startedAt: userProjectV2Progress.startedAt,
        })
        .from(userProjectV2Progress)
        .innerJoin(projectsV2, eq(projectsV2.id, userProjectV2Progress.projectId))
        .where(
            wanted
                ? and(eq(userProjectV2Progress.userId, userId), eq(userProjectV2Progress.status, wanted))
                : eq(userProjectV2Progress.userId, userId),
        )
        .orderBy(desc(userProjectV2Progress.updatedAt))
        .limit(limit);

    return { count: rows.length, projects: rows };
};

// ── list_my_goals ────────────────────────────────────────────────────────────

const listMyGoals: Handler = async (args, userId) => {
    const limit = limitArg(args.limit, 10, 25);
    const includeCompleted = args.include_completed === true;

    const rows = await db
        .select({
            title: pathfinderGoals.title,
            slug: pathfinderGoals.slug,
            category: pathfinderGoals.category,
            level: pathfinderGoals.level,
            status: pathfinderGoals.status,
            progressPercent: pathfinderGoals.progressPercent,
            completedSubGoals: pathfinderGoals.completedSubGoals,
            totalSubGoals: pathfinderGoals.totalSubGoals,
            streakDays: pathfinderGoals.streakDays,
            targetDate: pathfinderGoals.targetDate,
            lastActivityAt: pathfinderGoals.lastActivityAt,
        })
        .from(pathfinderGoals)
        .where(
            includeCompleted
                ? eq(pathfinderGoals.userId, userId)
                : and(
                    eq(pathfinderGoals.userId, userId),
                    inArray(pathfinderGoals.status, ["ACTIVE", "VERIFICATION"]),
                ),
        )
        .orderBy(desc(pathfinderGoals.lastActivityAt))
        .limit(limit);

    return { count: rows.length, goals: rows };
};

// ── get_my_practice_stats ────────────────────────────────────────────────────

const getMyPracticeStats: Handler = async (_args, userId) => {
    const rows = await db
        .select({
            module: practiceModuleProgress.module,
            completed: practiceModuleProgress.completed,
            inProgress: practiceModuleProgress.inProgress,
            totalProblems: practiceModuleProgress.totalProblems,
            easyCompleted: practiceModuleProgress.easyCompleted,
            mediumCompleted: practiceModuleProgress.mediumCompleted,
            hardCompleted: practiceModuleProgress.hardCompleted,
            currentStreak: practiceModuleProgress.currentStreak,
            longestStreak: practiceModuleProgress.longestStreak,
            averageScore: practiceModuleProgress.averageScore,
            lastPracticedAt: practiceModuleProgress.lastPracticedAt,
        })
        .from(practiceModuleProgress)
        .where(eq(practiceModuleProgress.userId, userId));

    if (rows.length === 0) {
        return { modules: [], note: "The user has not started any practice module yet." };
    }
    return { modules: rows };
};

// ── search_project_ideas ─────────────────────────────────────────────────────

const searchProjectIdeas: Handler = async (args) => {
    const limit = limitArg(args.limit, 6, 15);
    const query = stringArg(args.query, 80);
    const technology = stringArg(args.technology, 40);
    const difficulty = stringArg(args.difficulty, 20)?.toUpperCase();

    // Only APPROVED ideas are visible platform-wide; the rest are queued for
    // moderation and must never surface through a chat answer.
    const filters = [eq(projectIdeas.status, "APPROVED")];
    if (technology) {
        filters.push(
            or(
                ilike(projectIdeas.technology, `%${technology}%`),
                sql`${technology} = ANY(${projectIdeas.technologies})`,
            )!,
        );
    }
    if (difficulty && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficulty)) {
        filters.push(eq(projectIdeas.difficulty, difficulty));
    }
    if (query) {
        filters.push(
            or(
                ilike(projectIdeas.projectTitle, `%${query}%`),
                ilike(projectIdeas.projectDescription, `%${query}%`),
            )!,
        );
    }

    // Every field `create_project` needs is selected here, so the model can go straight from
    // "here are three ideas" to building one without a second lookup or a round of questions.
    // The description is 900 chars rather than 280 for the same reason: 280 is enough to LIST
    // an idea and nowhere near enough to seed a generation from it, and asking the user to
    // re-describe an idea the assistant just showed them is the failure this fixes.
    const rows = await db
        .select({
            id: projectIdeas.id,
            title: projectIdeas.projectTitle,
            description: sql<string>`left(${projectIdeas.projectDescription}, 900)`,
            difficulty: projectIdeas.difficulty,
            technologies: projectIdeas.technologies,
            recruiterSignal: projectIdeas.recruiterSignal,
            buildCount: projectIdeas.buildCount,
        })
        .from(projectIdeas)
        .where(and(...filters))
        .orderBy(desc(projectIdeas.buildCount))
        .limit(limit);

    return { count: rows.length, ideas: rows };
};

// ── search_jobs ──────────────────────────────────────────────────────────────

const searchJobs: Handler = async (args) => {
    const limit = limitArg(args.limit, 6, 15);
    const query = stringArg(args.query, 80);
    const locationType = stringArg(args.location_type, 20)?.toUpperCase();

    // ACTIVE + PUBLIC only: drafts, paused/closed/filled roles and invite-only
    // postings are not the assistant's to hand out.
    const filters = [jobListed, eq(jobs.visibility, "PUBLIC")];
    if (query) {
        filters.push(
            or(ilike(jobs.title, `%${query}%`), ilike(jobs.description, `%${query}%`))!,
        );
    }
    if (locationType && ["REMOTE", "ONSITE", "HYBRID"].includes(locationType)) {
        filters.push(eq(jobs.locationType, locationType as "REMOTE" | "ONSITE" | "HYBRID"));
    }

    const rows = await db
        .select({
            title: jobs.title,
            slug: jobs.slug,
            company: companies.name,
            location: jobs.location,
            locationType: jobs.locationType,
            employmentType: jobs.employmentType,
            experienceMin: jobs.experienceMin,
            experienceMax: jobs.experienceMax,
            salaryMin: jobs.salaryMin,
            salaryMax: jobs.salaryMax,
            salaryCurrency: jobs.salaryCurrency,
            salaryDisclosed: jobs.salaryDisclosed,
            skillsRequired: jobs.skillsRequired,
        })
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(and(...filters))
        .orderBy(desc(jobs.featured), desc(jobs.createdAt))
        .limit(limit);

    // Undisclosed salary is a deliberate employer choice - strip the numbers
    // rather than let the model read them off the row and quote them.
    const jobsOut = rows.map(({ salaryDisclosed, salaryMin, salaryMax, ...rest }) => ({
        ...rest,
        salaryMin: salaryDisclosed ? salaryMin : null,
        salaryMax: salaryDisclosed ? salaryMax : null,
    }));

    return { count: jobsOut.length, jobs: jobsOut };
};

// ── Registry ─────────────────────────────────────────────────────────────────

interface Tool {
    spec: ToolSpec;
    handler: Handler;
    /**
     * Marks a tool that CHANGES something or spends credits, as opposed to the read-only
     * majority. Not consumed by the dispatcher - it exists so the exception is visible in the
     * table rather than hiding behind an ordinary-looking entry, and so a future audit can
     * ask "what can this agent do to my account" by grepping one word.
     */
    writes?: boolean;
}

const TOOLS: Tool[] = [
    {
        spec: {
            type: "function",
            function: {
                name: "get_my_profile",
                description:
                    "Read the signed-in user's ShipItHQ profile: name, headline, university, experience, stated interests and career goals, credit balance, level, XP and streak. Call this before giving personalised advice instead of asking the user to repeat things they have already told the platform.",
                parameters: { type: "object", properties: {}, additionalProperties: false },
            },
        },
        handler: getMyProfile,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "get_my_resume",
                description:
                    "Read the signed-in user's default resume on ShipItHQ: work experience with bullet points, projects, education, skills and certifications. Call this whenever the answer depends on the user's actual background - tailoring a resume or cover letter, judging fit for a job, suggesting what to learn or build next, or preparing them for an interview. Prefer it over asking the user to describe their experience.",
                parameters: { type: "object", properties: {}, additionalProperties: false },
            },
        },
        handler: getMyResume,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "list_my_projects",
                description:
                    "List the projects the signed-in user has started on ShipItHQ, with progress, task counts and score. Use when the user asks what they are working on, what to finish next, or how far along something is.",
                parameters: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: [...PROJECT_STATUSES],
                            description: "Only return projects in this state. Omit for all.",
                        },
                        limit: { type: "number", description: "Max projects to return (default 10, max 25)." },
                    },
                    additionalProperties: false,
                },
            },
        },
        handler: listMyProjects,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "list_my_goals",
                description:
                    "List the signed-in user's Pathfinder learning goals with progress, sub-goal counts and streak. Active and in-verification goals only unless include_completed is true.",
                parameters: {
                    type: "object",
                    properties: {
                        include_completed: {
                            type: "boolean",
                            description: "Include completed, failed and abandoned goals too.",
                        },
                        limit: { type: "number", description: "Max goals to return (default 10, max 25)." },
                    },
                    additionalProperties: false,
                },
            },
        },
        handler: listMyGoals,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "get_my_practice_stats",
                description:
                    "Read the signed-in user's practice progress per module (DSA, system design, frontend, backend): problems completed by difficulty, streaks and average score. Use before recommending what to practise next.",
                parameters: { type: "object", properties: {}, additionalProperties: false },
            },
        },
        handler: getMyPracticeStats,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "search_project_ideas",
                description:
                    "Search ShipItHQ's approved project ideas by free text, technology and difficulty, ranked by upvotes. Use when the user asks what to build next. Prefer this over inventing project ideas, so the suggestion is something they can actually start on the platform.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Free-text match on title and description." },
                        technology: { type: "string", description: "A technology such as 'React' or 'Go'." },
                        difficulty: {
                            type: "string",
                            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
                            description: "Difficulty filter.",
                        },
                        limit: { type: "number", description: "Max ideas to return (default 6, max 15)." },
                    },
                    additionalProperties: false,
                },
            },
        },
        handler: searchProjectIdeas,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "search_jobs",
                description:
                    "Search published, publicly visible job postings on ShipItHQ by free text and location type. Use when the user asks about roles they could apply to.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Free-text match on job title and description." },
                        location_type: {
                            type: "string",
                            enum: ["REMOTE", "HYBRID", "ONSITE"],
                            description: "Location arrangement filter.",
                        },
                        limit: { type: "number", description: "Max jobs to return (default 6, max 15)." },
                    },
                    additionalProperties: false,
                },
            },
        },
        handler: searchJobs,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "create_cover_letter",
                description:
                    "Create a tailored cover letter for a specific job and start writing it. " +
                    "Call this ONLY when the user has given the actual job description text. " +
                    "This spends the user's credits, so never call it speculatively, never call it " +
                    "twice for the same job, and never call it to 'see what happens'. " +
                    "If the user wants a cover letter but has not pasted the posting, ask for it first.",
                parameters: {
                    type: "object",
                    properties: {
                        job_description: {
                            type: "string",
                            description:
                                "The full job description text, as the user provided it. Required, and must be " +
                                "the real posting - do not summarise it, invent it, or pass a placeholder.",
                        },
                        job_title: { type: "string", description: "The role title, if known." },
                        company_name: { type: "string", description: "The company name, if known." },
                        tone: {
                            type: "string",
                            description: "Writing tone. Defaults to Professional.",
                            enum: ["Professional", "Enthusiastic", "Concise", "Storytelling"],
                        },
                    },
                    required: ["job_description"],
                    additionalProperties: false,
                },
            },
        },
        handler: createCoverLetter,
        writes: true,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "link_to",
                description:
                    "Give the user a button to a page in ShipItHQ. Call this whenever your answer " +
                    "points at something they can go and DO - practice, an idea catalogue, the resume " +
                    "builder, buying credits. Never write a URL or a path in your reply; call this " +
                    "instead. Up to three, and only ones that follow from the answer.",
                parameters: {
                    type: "object",
                    properties: {
                        destinations: {
                            type: "array",
                            description: "Ids of the pages to offer, most relevant first. Max 3.",
                            items: { type: "string", enum: [...DESTINATION_IDS] },
                        },
                    },
                    required: ["destinations"],
                    additionalProperties: false,
                },
            },
        },
        handler: linkTo,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "create_project",
                description:
                    "Build a project for the user: creates it and starts generating its sprints and tasks. " +
                    "SPENDS CREDITS (13 public, 25 private, +30 with an assessment). " +
                    "Call this when the user picks one of the ideas you listed, or describes a project they want to build. " +
                    "Pass the idea's own title and description straight through - do not ask the user to repeat them, " +
                    "and do not re-list the ideas after calling this.",
                parameters: {
                    type: "object",
                    properties: {
                        project_title: { type: "string", description: "The project title." },
                        project_description: {
                            type: "string",
                            description:
                                "What the project is, in a few sentences. If this came from search_project_ideas, " +
                                "pass that idea's description verbatim.",
                        },
                        generation_type: {
                            type: "string",
                            enum: ["FULL_STACK", "FRONTEND", "PROGRAMS", "AI/ML", "AI_AGENT", "APP", "OTHER"],
                            description: "Shape of the build. Infer it from the technologies. Defaults to FULL_STACK.",
                        },
                        difficulty: {
                            type: "string",
                            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
                            description: "Defaults to INTERMEDIATE.",
                        },
                        technologies: {
                            type: "array",
                            items: { type: "string" },
                            description: "Technologies to build with, from the idea or from what the user asked for.",
                        },
                        stacks: {
                            type: "object",
                            description: "Named stack choices where they are known.",
                            properties: {
                                frontend: { type: "string" },
                                backend: { type: "string" },
                                database: { type: "string" },
                                deployment: { type: "string" },
                                aiProvider: { type: "string" },
                            },
                            additionalProperties: false,
                        },
                        visibility: {
                            type: "string",
                            enum: ["PUBLIC", "PRIVATE"],
                            description: "PUBLIC (13 credits) unless the user asks for private (25).",
                        },
                        include_assessment: {
                            type: "boolean",
                            description: "Adds 30 credits. Only true if the user asks for an assessment.",
                        },
                    },
                    required: ["project_title", "project_description"],
                    additionalProperties: false,
                },
            },
        },
        handler: createProject,
        writes: true,
    },
    {
        spec: {
            type: "function",
            function: {
                name: "create_goal",
                description:
                    "Add a Pathfinder goal for the user. Public goals are free; private ones cost credits. " +
                    "Use this after list_my_goals shows they have fewer than three, and you have suggested some and " +
                    "they picked one. Create ONE goal per call, and only goals the user actually agreed to.",
                parameters: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "What they want to achieve." },
                        category: {
                            type: "string",
                            enum: [
                                "DSA", "WEB_DEVELOPMENT", "FRONTEND", "BACKEND", "DEVOPS",
                                "AI_ML", "DATABASE", "SYSTEM_DESIGN", "MOBILE", "OTHER",
                            ],
                        },
                        level: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] },
                        focus_areas: {
                            type: "array",
                            items: { type: "string" },
                            description: "A few specific topics inside the goal.",
                        },
                        is_public: {
                            type: "boolean",
                            description: "Defaults to true, which is free. False costs credits.",
                        },
                        generate_plan: {
                            type: "boolean",
                            description: "Have AI break the goal into subgoals. Only if the user asks.",
                        },
                    },
                    required: ["title", "category", "level"],
                    additionalProperties: false,
                },
            },
        },
        handler: createGoal,
        writes: true,
    },
];

export const TOOL_SPECS: ToolSpec[] = TOOLS.map((t) => t.spec);

/**
 * Names of the tools that change something or spend credits.
 *
 * Exported so the route can enforce "once per turn" on them. The tool descriptions and the
 * system prompt both say not to call these twice, and the model did it anyway - two
 * `create_project` calls in one round, which is two charges for one project. A sentence in a
 * prompt is guidance; this is the control.
 */
export const WRITE_TOOLS: ReadonlySet<string> = new Set(
    TOOLS.filter((t) => t.writes).map((t) => t.spec.function.name),
);

const HANDLERS = new Map(TOOLS.map((t) => [t.spec.function.name, t.handler]));

/**
 * Run one tool call on behalf of `userId` and return the JSON string that goes
 * back to the model as the tool message.
 *
 * Never throws: an unknown name, malformed arguments and a failed query all come
 * back as `{ error }` so the model can say what went wrong and carry on.
 */
export async function runTool(
    name: string,
    rawArgs: string,
    userId: string,
): Promise<ToolOutcome> {
    const handler = HANDLERS.get(name);
    if (!handler) return { result: { error: `Unknown tool "${name}".` } };

    let args: Record<string, unknown> = {};
    if (rawArgs?.trim()) {
        try {
            const parsed: unknown = JSON.parse(rawArgs);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                args = parsed as Record<string, unknown>;
            }
        } catch {
            return { result: { error: "Tool arguments were not valid JSON." } };
        }
    }

    try {
        const raw = await handler(args, userId);

        // A handler signals a control for the panel with `__action`. It is STRIPPED before
        // the result goes to the model: the model has no use for the href, and every token
        // of it is a token it might decide to paraphrase into a link of its own.
        // `__actions` (plural) for a tool that offers several - `link_to` does. Same
        // stripping rule: the hrefs never reach the model.
        if (raw && typeof raw === "object" && !Array.isArray(raw) && "__actions" in raw) {
            const { __actions, ...rest } = raw as Record<string, unknown>;
            const list = Array.isArray(__actions) ? __actions : [];
            const actions = list
                .map((a) => a as { label?: unknown; href?: unknown; kind?: unknown })
                .filter(
                    (a) =>
                        typeof a.href === "string" &&
                        typeof a.label === "string" &&
                        a.href.startsWith("/") &&
                        !a.href.startsWith("//"),
                )
                .map((a) => ({
                    label: a.label as string,
                    href: a.href as string,
                    kind: typeof a.kind === "string" ? a.kind : undefined,
                }));
            return { result: rest, actions };
        }

        if (raw && typeof raw === "object" && !Array.isArray(raw) && "__action" in raw) {
            const { __action, ...rest } = raw as Record<string, unknown>;
            const a = __action as { label?: unknown; href?: unknown; kind?: unknown } | undefined;
            const href = typeof a?.href === "string" ? a.href : null;
            const label = typeof a?.label === "string" ? a.label : null;
            return {
                result: rest,
                // Internal paths only. Belt and braces - these hrefs are written in this
                // file, not by the model, but the panel is the thing that navigates and a
                // rule enforced in one place is worth having in both.
                action:
                    href && label && href.startsWith("/") && !href.startsWith("//")
                        ? { label, href, kind: typeof a?.kind === "string" ? a.kind : undefined }
                        : undefined,
            };
        }

        return { result: raw };
    } catch (error: unknown) {
        console.error(`[ai/tools] ${name} failed:`, error);
        return { result: { error: "That lookup failed. Answer without it." } };
    }
}
