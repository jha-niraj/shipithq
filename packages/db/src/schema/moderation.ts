import { pgEnum, pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import { companies } from "./hiring"

/*
 * Reporting and blocking (plan/hiring-rounds HR-24, DoD 20). Students report a
 * company or a job, either side reports a message, companies report a student.
 * Reports land in the admin console's queue. A student can block a company from
 * messaging them.
 */

export const reportTargetKindEnum = pgEnum("report_target_kind", ["COMPANY", "JOB", "MESSAGE", "STUDENT"])
export const reportStatusEnum = pgEnum("report_status", ["OPEN", "ACTIONED", "DISMISSED"])

export const reports = pgTable(
    "report",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        /** Who reported. Never shown to the other party (a company never learns who reported it). */
        reporterUserId: text("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
        /** Set when a company member reported, on the company's behalf. */
        reporterCompanyId: text("reporter_company_id").references(() => companies.id, { onDelete: "set null" }),
        targetKind: reportTargetKindEnum("target_kind").notNull(),
        /** A company, job, message or user id; not a foreign key, so a report outlives its target. */
        targetId: text("target_id").notNull(),
        /** The company the target belongs to (a job's, a message's thread's), for the queue's grouping. */
        targetCompanyId: text("target_company_id").references(() => companies.id, { onDelete: "set null" }),
        /** What the target said or was called when reported: a message's text, a job's title. */
        targetExcerpt: text("target_excerpt"),
        /** One of REPORT_REASONS for the target kind (`@repo/db/report-reasons`). */
        reason: text("reason").notNull(),
        details: text("details"),
        status: reportStatusEnum("status").notNull().default("OPEN"),
        resolvedByAdminId: text("resolved_by_admin_id"),
        resolutionNote: text("resolution_note"),
        resolvedAt: timestamp("resolved_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_report_status_created").on(table.status, table.createdAt),
        index("idx_report_target").on(table.targetKind, table.targetId),
        // One open report per reporter per target: a second click is the same report.
        uniqueIndex("uq_report_open").on(table.reporterUserId, table.targetKind, table.targetId).where(sql`status = 'OPEN'`),
    ],
)

/** A student stops a company from messaging them. */
export const companyBlocks = pgTable(
    "company_block",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [uniqueIndex("uq_company_block").on(table.userId, table.companyId)],
)

export const reportsRelations = relations(reports, ({ one }) => ({
    reporter: one(users, { fields: [reports.reporterUserId], references: [users.id] }),
}))

export const companyBlocksRelations = relations(companyBlocks, ({ one }) => ({
    user: one(users, { fields: [companyBlocks.userId], references: [users.id] }),
    company: one(companies, { fields: [companyBlocks.companyId], references: [companies.id] }),
}))
