import {
    pgTable,
    text,
    integer,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";

// ===========================
// Tables
// ===========================

/**
 * Every kind of work that runs on a Cloudflare Worker Durable Object.
 *
 * Declared in one place and imported by BOTH the app and the workers, because a
 * job written with a type string the poller does not recognise is a job nobody
 * can ever observe finishing - it just sits at `queued` forever.
 */
// Every value here is a job the worker can actually RUN. That is the invariant,
// and it did not hold: five types - project_assessment, project_mock,
// resource_generation, task_details and voice_transcription - were declared here
// with no Durable Object behind them and, as it turned out, no dispatch site
// anywhere in the app either. Removed 2026-08-28.
//
// A declared-but-unbound type is not harmless. `startBackgroundJob` accepts it,
// writes the row, holds the credits, and only then does `jobStub` fail to
// resolve a binding - so the user pays for a job that can never run. Keep this
// list and `JOB_BINDINGS` in apps/worker/src/env.ts in agreement.
export const JOB_TYPES = [
    "project_generation",
    "project_quiz",
    "sprint_generation",
    "standup_voice",
    "verification_generation",
    "subgoal_generation",
    "goal_creation",
    // The two halves of a mock interview: waiting for ElevenLabs to produce the
    // transcript, then scoring it. Separate job types because they are separate
    // waits with separate failure modes - a transcript can arrive and the
    // scoring still fail, and the user should be told which.
    "mock_conversation",
    "mock_feedback",
    // Turning an uploaded resume's raw extracted text into structured content.
    // A job rather than an inline call because it runs behind an upload the user
    // is not watching - at onboarding they have already moved on by the time it
    // finishes.
    "resume_structure",
    // Resume and cover letter. Both were inline `gpt-4o` calls over a whole resume
    // plus a whole job description - among the longest completions in the product,
    // on request paths that could not hold them.
    "resume_tailor",
    "cover_letter",
    // The last three inline model calls in the resume module, moved 2026-08-27
    // (plan/resume/tasks.md:RES-9). The imports are the reason this batch is not
    // optional: before a model is called at all, a profile import makes up to
    // four Exa fetches carrying a 10s livecrawl timeout each, plus six GitHub
    // REST round trips. That is someone else's API, minutes of it, on a request
    // that had already taken 20 credits.
    "resume_ats_score",
    "cover_letter_questions",
    "resume_import",
    "interview_prep_generation",
    // Guided DSA practice (plan/practice-dsa). Test generation validates a
    // reference solution in the code executor; memory consolidation and the
    // closing reflection are model calls that must not sit on a chat turn.
    "practice_tests_generate",
    "practice_memory_update",
    "practice_reflect",
    // The workspace's Project AI (plan/project-workspace WS-15). No longer run:
    // it replies inline since WS-22 (2026-09-24). Kept so past job rows still
    // have a valid type.
    "project_ai",
    // A sprint's quiz (plan/project-workspace WS-12): ten questions from the
    // sprint's tasks and the learner's own notes on them.
    "sprint_quiz",
    // A sprint's mock interview (plan/project-workspace WS-13): one job type,
    // three steps - open (holds the session's credits), each turn, feedback.
    "sprint_mock",
    // Reading a company's own site into a draft profile (plan/hiring-rounds
    // HR-5): a Firecrawl map and up to 12 page scrapes, then one model pass.
    "company_scrape",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

/**
 * The status vocabulary actually in use - read off the code, not invented:
 *
 *   waiting    written by the app when it inserts the row, before dispatch
 *              (`projectsworker.action.ts`)
 *   active     written by the worker on start and on every progress tick
 *              (`project-generator.ts:29,58`)
 *   completed  worker, on success (`:60`)
 *   failed     worker, on error (`:66`)
 *
 * `completed` and `failed` are terminal - a poller must stop on either, or it
 * will spin forever against a job that will never change again.
 */
export const JOB_STATUSES = ["waiting", "active", "completed", "failed"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/** True once the job will never change again. */
export function isTerminalJobStatus(status: string): boolean {
    return status === "completed" || status === "failed";
}

export const backgroundJobs = pgTable(
    "background_job",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        jobId: text("job_id").notNull().unique(),
        // Which kind of work this row represents. Added because the table was
        // built when project generation was the only writer; the moment a second
        // job type appeared, nothing could tell them apart - not the status
        // poller, not an admin view, not a retry. Stored as text rather than a
        // pgEnum so adding a job type is a code change, not a migration.
        type: text("type").notNull().default("project_generation").$type<JobType>(),
        status: text("status").notNull().$type<JobStatus>(),
        progress: integer("progress").notNull().default(0),
        // Free-form per job type. Keep it small - a pointer (ids) rather than a
        // payload, so the worker re-reads current data instead of acting on a
        // snapshot that may be minutes stale by the time the alarm fires.
        input: jsonb("input").notNull(),
        result: jsonb("result"),
        error: text("error"),
        userId: text("user_id").references(() => users.id),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_background_job_job_id").on(table.jobId),
        index("idx_background_job_status").on(table.status),
        index("idx_background_job_user_id").on(table.userId),
        // The poller's query shape: "this user's jobs of this type in this state".
        index("idx_background_job_user_type_status").on(table.userId, table.type, table.status),
    ],
);

// ===========================
// Relations
// ===========================

export const backgroundJobsRelations = relations(backgroundJobs, ({ one }) => ({
    user: one(users, {
        fields: [backgroundJobs.userId],
        references: [users.id],
        relationName: "BackgroundJobs",
    }),
}));
