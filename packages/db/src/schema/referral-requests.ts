import { pgEnum, pgTable, text, integer, jsonb, timestamp, boolean, index, uniqueIndex, check } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import { companies } from "./hiring"
import { jobs } from "./jobs"
import { importedJobs } from "./job-import"

/*
 * Verified referrals (plan/competition/skillmeet CMP-4). An employee proves they
 * work at a company with a code sent to their company email and opts in; students
 * ask for a referral on that company's jobs; the request goes to the referrer with
 * the fewest open ones. Free both ways; caps stop spam (decisions round 5).
 *
 * Not the `referral` table in credits.ts: that is the invite-credit programme.
 */

export const referralOfferStatusEnum = pgEnum("referral_offer_status", ["ACTIVE", "PAUSED"])
export const referralRequestStatusEnum = pgEnum("referral_request_status", ["OPEN", "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"])

/** An employee's verified opt-in to refer for their company. One per user. */
export const referralOffers = pgTable(
    "referral_offer",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        /** The company address the code went to; shown to no student. */
        workEmail: text("work_email").notNull(),
        verifiedAt: timestamp("verified_at").notNull(),
        /** Six months after verifying (CMP-4 edge case: employees who leave). */
        expiresAt: timestamp("expires_at").notNull(),
        status: referralOfferStatusEnum("status").notNull().default("ACTIVE"),
        /** For the tie-break: the longest since last assigned gets the next request. */
        lastAssignedAt: timestamp("last_assigned_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [index("idx_referral_offer_company_status").on(table.companyId, table.status)],
)

/** A pending code to a company address. The code is stored as a sha-256, never plain. */
export const referralOfferCodes = pgTable(
    "referral_offer_code",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        codeHash: text("code_hash").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        attempts: integer("attempts").notNull().default(0),
        sentAt: timestamp("sent_at").notNull().defaultNow(),
    },
)

/** What a student attached, fixed at the moment they asked. */
export interface ReferralAttachment {
    rounds: { title: string; type: string; best: number | null; passMark: number; cleared: boolean }[]
    projects: { title: string; githubUrl: string | null; liveUrl: string | null }[]
    /** The primary resume file is shared with the referrer (a signed link when they open it). */
    resume: boolean
}

export const referralRequests = pgTable(
    "referral_request",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        /** One of the two: a job on ShipItHQ, or a job a student imported (plan/job-import). */
        jobId: text("job_id").references(() => jobs.id, { onDelete: "cascade" }),
        importedJobId: text("imported_job_id").references(() => importedJobs.id, { onDelete: "cascade" }),
        /** The referrer it went to; set null if they delete their account (the request then expires). */
        offerId: text("offer_id").references(() => referralOffers.id, { onDelete: "set null" }),
        note: text("note").notNull(),
        attachment: jsonb("attachment").$type<ReferralAttachment>().notNull(),
        /** Whether the student's primary resume goes with it. */
        shareResume: boolean("share_resume").notNull().default(false),
        status: referralRequestStatusEnum("status").notNull().default("OPEN"),
        decidedAt: timestamp("decided_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        check("chk_referral_request_job", sql`${table.jobId} is not null or ${table.importedJobId} is not null`),
        // One request per student per job.
        uniqueIndex("uq_referral_request_job").on(table.studentId, sql`coalesce(${table.jobId}, ${table.importedJobId})`),
        index("idx_referral_request_offer_status").on(table.offerId, table.status),
        index("idx_referral_request_student_created").on(table.studentId, table.createdAt),
    ],
)

export const referralOffersRelations = relations(referralOffers, ({ one, many }) => ({
    user: one(users, { fields: [referralOffers.userId], references: [users.id] }),
    company: one(companies, { fields: [referralOffers.companyId], references: [companies.id] }),
    requests: many(referralRequests),
}))

export const referralRequestsRelations = relations(referralRequests, ({ one }) => ({
    student: one(users, { fields: [referralRequests.studentId], references: [users.id] }),
    company: one(companies, { fields: [referralRequests.companyId], references: [companies.id] }),
    job: one(jobs, { fields: [referralRequests.jobId], references: [jobs.id] }),
    importedJob: one(importedJobs, { fields: [referralRequests.importedJobId], references: [importedJobs.id] }),
    offer: one(referralOffers, { fields: [referralRequests.offerId], references: [referralOffers.id] }),
}))
