import { pgEnum, pgTable, text, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import { companies } from "./hiring"
import { companyRequests } from "./hiring-rounds"
import { interviewProcesses } from "./jobmock"

/*
 * A job a student pasted to practise its interview (plan/job-import). One row per
 * import, shared across students when public: the same public URL imported twice
 * is one row. The `job_import` worker job moves it through its statuses and, at
 * READY, points it at the IMPORTED pipeline it built.
 */

export const importedJobVisibilityEnum = pgEnum("imported_job_visibility", ["PUBLIC", "PRIVATE"])
export const importedJobStatusEnum = pgEnum("imported_job_status", [
    "QUEUED",
    "FETCHING",
    /** The link couldn't be read: waiting for the student to paste the text and the company name. */
    "NEEDS_TEXT",
    "EXTRACTING",
    "COMPANY",
    "PLANNING",
    "ROUNDS",
    "READY",
    "FAILED",
])

/** What the extract step read from the posting (strict schema, JI-3). */
export interface ImportedJobExtract {
    title: string
    /** `agency`: a staffing agency posting for an unnamed client; the job links to the agency. */
    company: { name: string; website: string | null; agency?: boolean }
    level: "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | null
    location: string | null
    skills: string[]
    requirements: string[]
    responsibilities: string[]
    /** The selection stages as the posting lists them ("Online assessment", "Take-home"), in order; empty if it doesn't. */
    process?: string[]
}

/** The five round types an imported pipeline can hold (the ones the run engine runs). */
export type ImportedRoundType = "APTITUDE" | "DSA" | "SYSTEM_DESIGN" | "VOICE_BEHAVIOURAL" | "VOICE_CULTURE"

/** One planned round (JI-5): what the plan step decided, and why. */
export interface ImportedJobPlanRound {
    type: ImportedRoundType
    title: string
    passMark: number
    gate: "HARD" | "ADVISORY"
    timeLimitMinutes: number
    drawCount: number
    /** DSA and system design: the level the round is pitched at. */
    difficulty: "EASY" | "MEDIUM" | "HARD" | null
    /** One line for the student: why this round is in this job's interview. */
    reason: string
}

/**
 * The plan step's output (JI-5). `notPractisable` keeps the rounds the posting
 * names that we can't run yet (a take-home, a low-level design round): shown to
 * the student, never silently dropped, and kept out of the pipeline because an
 * unrunnable round would lock every round after it.
 */
export interface ImportedJobPlan {
    rounds: ImportedJobPlanRound[]
    notPractisable: { name: string; reason: string }[]
}

export const importedJobs = pgTable(
    "imported_job",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        /** The link the student pasted; null when they pasted text only. */
        sourceUrl: text("source_url"),
        /** sha-256 of the normalised URL: the dedup key for public imports. */
        urlHash: text("url_hash"),
        /** The posting's text: pasted, or read from the link. Capped at the call site. */
        sourceText: text("source_text"),
        /** The company name the student typed with pasted text (the needs-text form). */
        companyNameHint: text("company_name_hint"),
        visibility: importedJobVisibilityEnum("visibility").notNull().default("PUBLIC"),
        /** Who imported it. A public import outlives its importer's account. */
        ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
        status: importedJobStatusEnum("status").notNull().default("QUEUED"),
        /** A human line for the current step ("Round 2 of 4"), written by each step. */
        step: text("step"),
        error: text("error"),
        extracted: jsonb("extracted").$type<ImportedJobExtract>(),
        /** The rounds planned from the posting (JI-5), including those we can't run yet. */
        plan: jsonb("plan").$type<ImportedJobPlan>(),
        companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
        /** The company request an unknown company became (HR-7); the job relinks when it's published. */
        companyRequestId: text("company_request_id").references(() => companyRequests.id, { onDelete: "set null" }),
        processId: text("process_id").references(() => interviewProcesses.id, { onDelete: "set null" }),
        /**
         * The company's own pipeline students practise instead (JI-9): its copy after
         * Adopt, or one it chose with Replace. Deleting that pipeline falls back to
         * `processId`.
         */
        companyProcessId: text("company_process_id").references(() => interviewProcesses.id, { onDelete: "set null" }),
        backgroundJobId: text("background_job_id"),
        /** Credits held for a private import (15); 0 for a public one. */
        cost: integer("cost").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        // One public import per link; private imports of the same link are each their owner's.
        uniqueIndex("uq_imported_job_public_url").on(table.urlHash).where(sql`visibility = 'PUBLIC' and url_hash is not null`),
        // One live private import per owner and link: a double click can't hold 15 credits twice (review, 2026-09-26).
        uniqueIndex("uq_imported_job_private_owner_url").on(table.ownerId, table.urlHash).where(sql`visibility = 'PRIVATE' and url_hash is not null and status <> 'FAILED'`),
        index("idx_imported_job_owner_created").on(table.ownerId, table.createdAt),
        index("idx_imported_job_company").on(table.companyId),
        index("idx_imported_job_request").on(table.companyRequestId),
    ],
)

export const importedJobsRelations = relations(importedJobs, ({ one }) => ({
    owner: one(users, { fields: [importedJobs.ownerId], references: [users.id] }),
    company: one(companies, { fields: [importedJobs.companyId], references: [companies.id] }),
    companyRequest: one(companyRequests, { fields: [importedJobs.companyRequestId], references: [companyRequests.id] }),
    process: one(interviewProcesses, { fields: [importedJobs.processId], references: [interviewProcesses.id] }),
}))
