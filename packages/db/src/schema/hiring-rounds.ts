import {
    pgTable,
    pgEnum,
    text,
    integer,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";
import { companies } from "./hiring";
import { jobs } from "./jobs";
import { interviewProcesses, interviewRounds } from "./jobmock";

// ─────────────────────────────────────────────────────────────────────────────
// Hiring rounds: a student's run through a job's pipeline, each scored attempt,
// and the result they send (plan/hiring-rounds HR-2), plus the aptitude question
// bank rounds draw from (HR-3).
// ─────────────────────────────────────────────────────────────────────────────

export const hiringRunStatusEnum = pgEnum("hiring_run_status", ["IN_PROGRESS", "COMPLETE", "SENT", "ABANDONED"]);
export const hiringAttemptStatusEnum = pgEnum("hiring_attempt_status", [
    "IN_PROGRESS",
    /** Handed in; scoring has not finished yet (AI-scored rounds). */
    "SUBMITTED",
    "SCORED",
    /** Scoring failed (the judge or the model was down): refunded, not a fail. */
    "NOT_SCORED",
]);
export const hiringSendStatusEnum = pgEnum("hiring_send_status", ["SENT", "VIEWED", "INVITED", "DECLINED", "WITHDRAWN"]);
export const hiringOutcomeEnum = pgEnum("hiring_outcome", ["INTERVIEWING", "OFFER", "HIRED", "NOT_SELECTED"]);

/** One student's pass through one job's pipeline. */
export const hiringRuns = pgTable(
    "hiring_run",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
        /** The pipeline as it was when the run started; rounds are read through it. */
        processId: text("process_id").references(() => interviewProcesses.id, { onDelete: "set null" }),
        status: hiringRunStatusEnum("status").notNull().default("IN_PROGRESS"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_hiring_run_user_id").on(table.userId),
        index("idx_hiring_run_job_id").on(table.jobId),
        // One run in progress per (student, job); a finished or sent run can be followed by a new one.
        uniqueIndex("uq_hiring_run_active").on(table.userId, table.jobId).where(sql`status = 'IN_PROGRESS'`),
    ],
);

/** Integrity signals recorded during an attempt (HR-13 onwards), shown to the company. */
export interface HiringAttemptIntegrity {
    pastes?: number
    tabLeaves?: number
    /** Seconds spent per drawn item, in draw order. */
    secondsPerItem?: number[]
    /** Voice rounds: silences longer than the threshold. */
    longSilences?: number
    /** ShipItHQ AI requests refused while the attempt was live (DoD 27). */
    aiBlocked?: number
}

/** One scored try at one round. */
export const hiringAttempts = pgTable(
    "hiring_attempt",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        runId: text("run_id").notNull().references(() => hiringRuns.id, { onDelete: "cascade" }),
        /** Set null if the round is later deleted: the attempt and its score stay. */
        roundId: text("round_id").references(() => interviewRounds.id, { onDelete: "set null" }),
        attemptNumber: integer("attempt_number").notNull(),
        /** What was asked, frozen when the attempt started: editing the pool later cannot change it. */
        drawnItems: jsonb("drawn_items").notNull().default([]),
        status: hiringAttemptStatusEnum("status").notNull().default("IN_PROGRESS"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        /** The server's deadline; answers saved after it are not scored. */
        endsAt: timestamp("ends_at"),
        submittedAt: timestamp("submitted_at"),
        /** 0-100. */
        score: integer("score"),
        /** Per question or per criterion. */
        breakdown: jsonb("breakdown"),
        /** AI-scored rounds: the rubric result the score came from. */
        aiRubricResult: jsonb("ai_rubric_result"),
        /** Voice or design rounds: where the transcript or diagram is kept. */
        transcriptRef: text("transcript_ref"),
        integrity: jsonb("integrity").$type<HiringAttemptIntegrity>().notNull().default({}),
        creditsHeld: integer("credits_held").notNull().default(0),
        /** A worker job id, when scoring runs in apps/worker. */
        workerJobId: text("worker_job_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_hiring_attempt_run_round").on(table.runId, table.roundId),
        // Two tabs cannot open two live attempts of the same round.
        uniqueIndex("uq_hiring_attempt_live").on(table.runId, table.roundId).where(sql`status = 'IN_PROGRESS'`),
    ],
);

/** A run a student sent to a company, with their consent (HR-17). */
export const hiringSends = pgTable(
    "hiring_send",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        runId: text("run_id").notNull().references(() => hiringRuns.id, { onDelete: "cascade" }),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
        /** Exactly what the company sees: a copy, so a later retake cannot change it. */
        snapshot: jsonb("snapshot").notNull(),
        /** Name, headline, education and the links the student chose. */
        profile: jsonb("profile").notNull(),
        consentText: text("consent_text").notNull(),
        consentedAt: timestamp("consented_at").notNull(),
        status: hiringSendStatusEnum("status").notNull().default("SENT"),
        companyMessage: text("company_message"),
        /** The decision's feedback, as the team sent it (DoD 28). */
        feedback: text("feedback"),
        decidedAt: timestamp("decided_at"),
        /** The student's email is shown to the company only from this moment (an invite). */
        emailRevealedAt: timestamp("email_revealed_at"),
        companyOutcome: hiringOutcomeEnum("company_outcome"),
        companyOutcomeAt: timestamp("company_outcome_at"),
        studentOutcome: hiringOutcomeEnum("student_outcome"),
        studentOutcomeAt: timestamp("student_outcome_at"),
        /** Withdrawn or declined: the snapshot is deleted after this (90 days; at once on account deletion). */
        purgeAfter: timestamp("purge_after"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_hiring_send_company_job").on(table.companyId, table.jobId),
        index("idx_hiring_send_user_id").on(table.userId),
        // One active send per (student, job).
        uniqueIndex("uq_hiring_send_active").on(table.userId, table.jobId).where(sql`status in ('SENT', 'VIEWED', 'INVITED')`),
    ],
);

// ── Aptitude question bank (HR-3) ────────────────────────────────────────────

export const aptitudeSectionEnum = pgEnum("aptitude_section", ["QUANT", "LOGICAL", "VERBAL"]);
export const aptitudeDifficultyEnum = pgEnum("aptitude_difficulty", ["EASY", "MEDIUM", "HARD"]);
export const aptitudeQuestionStatusEnum = pgEnum("aptitude_question_status", ["DRAFT", "LIVE"]);

/**
 * One multiple-choice aptitude question. `companyId` null: ShipItHQ's reviewed
 * bank. Set: a company's own AI-generated question, private to it, drawable only
 * once it approves it (status LIVE). A wrong question is set back to DRAFT,
 * never deleted: past attempts reference it.
 */
export const aptitudeQuestions = pgTable(
    "aptitude_question",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        /** Stable seed key for the bank ("quant-percentages-014"), so re-seeding upserts. */
        key: text("key").unique(),
        companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
        section: aptitudeSectionEnum("section").notNull(),
        topic: text("topic").notNull(),
        difficulty: aptitudeDifficultyEnum("difficulty").notNull(),
        prompt: text("prompt").notNull(),
        options: jsonb("options").$type<string[]>().notNull(),
        /** Index into `options`; never sent to the browser before the answer. */
        correctIndex: integer("correct_index").notNull(),
        explanation: text("explanation").notNull(),
        status: aptitudeQuestionStatusEnum("status").notNull().default("DRAFT"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_aptitude_question_company_section").on(table.companyId, table.section),
        index("idx_aptitude_question_status").on(table.status),
    ],
);

// ── Company profile drafts (HR-5) ────────────────────────────────────────────

export const companyProfileDraftStatusEnum = pgEnum("company_profile_draft_status", [
    /** The `company_scrape` job is reading the site. */
    "SCRAPING",
    /** Drafted; waiting for an admin to review it (HR-6). */
    "READY",
    /** The site could not be read; `error` holds Firecrawl's reason. */
    "FAILED",
    "PUBLISHED",
    "DISCARDED",
]);

/** One drafted profile field, and the page on the company's own domain it came from. */
export interface CompanyDraftField<T = string> {
    value: T
    sourceUrl: string
}

/** What the model drafts. Every field is optional: a site that says nothing about benefits has none. */
export interface CompanyDraftFields {
    name?: CompanyDraftField
    description?: CompanyDraftField
    industry?: CompanyDraftField
    size?: CompanyDraftField
    locations?: CompanyDraftField<string[]>
    techStack?: CompanyDraftField<string[]>
    culture?: CompanyDraftField
    benefits?: CompanyDraftField<string[]>
    careersUrl?: CompanyDraftField
}

/**
 * A company profile drafted from the company's own site by the `company_scrape`
 * worker job. Never the live company row: an admin reviews it field by field and
 * publishes it (HR-6). Created by the dispatcher in SCRAPING, so the job only
 * ever receives a pointer (its id).
 */
export const companyProfileDrafts = pgTable(
    "company_profile_draft",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        /** The confirmed, bare domain ("acme.io"). */
        domain: text("domain").notNull(),
        status: companyProfileDraftStatusEnum("status").notNull().default("SCRAPING"),
        fields: jsonb("fields").$type<CompanyDraftFields>().notNull().default({}),
        /** Every page that was read, so a reviewer can open the sources. */
        sourcePages: jsonb("source_pages").$type<{ url: string; title: string | null }[]>().notNull().default([]),
        /** Some pages failed: the draft is partial, and says so. */
        degraded: boolean("degraded").notNull().default(false),
        failedUrls: jsonb("failed_urls").$type<string[]>().notNull().default([]),
        /** Pages robots.txt told us not to read; never fetched. */
        robotsSkipped: jsonb("robots_skipped").$type<string[]>().notNull().default([]),
        error: text("error"),
        /** The student's request that asked for it (HR-7); the foreign key arrives with that table. */
        requestId: text("request_id"),
        /** Who dispatched it: an admin (HR-6) or the student behind the request. */
        createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
        /** Set when published. */
        companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
        workerJobId: text("worker_job_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_company_profile_draft_domain").on(table.domain),
        index("idx_company_profile_draft_status").on(table.status),
        // One draft being scraped per domain: a second request joins the first.
        uniqueIndex("uq_company_profile_draft_scraping").on(table.domain).where(sql`status = 'SCRAPING'`),
    ],
);

export const hiringRunsRelations = relations(hiringRuns, ({ one, many }) => ({
    user: one(users, { fields: [hiringRuns.userId], references: [users.id] }),
    job: one(jobs, { fields: [hiringRuns.jobId], references: [jobs.id] }),
    process: one(interviewProcesses, { fields: [hiringRuns.processId], references: [interviewProcesses.id] }),
    attempts: many(hiringAttempts),
    sends: many(hiringSends),
}));

export const hiringAttemptsRelations = relations(hiringAttempts, ({ one }) => ({
    run: one(hiringRuns, { fields: [hiringAttempts.runId], references: [hiringRuns.id] }),
    round: one(interviewRounds, { fields: [hiringAttempts.roundId], references: [interviewRounds.id] }),
}));

export const hiringSendsRelations = relations(hiringSends, ({ one }) => ({
    run: one(hiringRuns, { fields: [hiringSends.runId], references: [hiringRuns.id] }),
    user: one(users, { fields: [hiringSends.userId], references: [users.id] }),
    company: one(companies, { fields: [hiringSends.companyId], references: [companies.id] }),
    job: one(jobs, { fields: [hiringSends.jobId], references: [jobs.id] }),
}));

export const aptitudeQuestionsRelations = relations(aptitudeQuestions, ({ one }) => ({
    company: one(companies, { fields: [aptitudeQuestions.companyId], references: [companies.id] }),
}));
