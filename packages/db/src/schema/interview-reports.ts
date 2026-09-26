import { pgEnum, pgTable, text, integer, date, timestamp, index, uniqueIndex, check, type AnyPgColumn } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import { companies } from "./hiring"
import { aptitudeQuestions, companyRequests } from "./hiring-rounds"
import { importedJobs } from "./job-import"
import { practiceProblem } from "./practice"

/*
 * Interview reports (plan/competition/skillmeet CMP-1): a student records the
 * rounds and questions of a real interview. They are the source of CMP-2's
 * frequency ranking. The public only ever sees aggregates ("reported 4 times");
 * a single report is shown to its author and to admins, never to anyone else.
 */

export const interviewReportStatusEnum = pgEnum("interview_report_status", ["PENDING", "APPROVED", "REJECTED"])
export const interviewReportOutcomeEnum = pgEnum("interview_report_outcome", ["OFFER", "REJECTED", "NO_RESPONSE", "WITHDREW", "IN_PROCESS"])
/** What a student can say a round was. Maps onto our round types in CMP-2; LLD and take-home have no runner yet. */
export const interviewReportRoundTypeEnum = pgEnum("interview_report_round_type", [
    "ONLINE_ASSESSMENT", "APTITUDE", "DSA", "LLD", "SYSTEM_DESIGN", "TAKE_HOME", "TECHNICAL", "BEHAVIOURAL", "HIRING_MANAGER", "HR", "OTHER",
])

/** The role groups reports are counted in (CMP-2, decisions round 4). */
export const interviewReportRoleFamilyEnum = pgEnum("interview_report_role_family", [
    "SOFTWARE", "FRONTEND", "BACKEND", "FULL_STACK", "MOBILE", "DATA_ML", "DEVOPS_SRE", "QA", "PRODUCT", "DESIGN", "OTHER",
])
export const interviewReportLevelEnum = pgEnum("interview_report_level", ["INTERN", "ENTRY", "MID", "SENIOR"])

export const interviewReports = pgTable(
    "interview_report",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        /** Set null when the account is deleted: the aggregate it fed outlives it. */
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
        /** A company still under review (HR-7); moved to `companyId` when it's published. */
        // Cascade, not set null: a report must keep a company or a request (the check below).
        companyRequestId: text("company_request_id").references(() => companyRequests.id, { onDelete: "cascade" }),
        /** The imported job it was filed from, if any (plan/job-import). */
        importedJobId: text("imported_job_id").references(() => importedJobs.id, { onDelete: "set null" }),
        /** The role as the student typed it ("SDE 1, Backend"). */
        role: text("role").notNull(),
        /** Normalised for grouping ("sde 1 backend"): CMP-2 groups a company's reports by this. */
        roleKey: text("role_key").notNull(),
        /** With `level`, the group a report is counted in (CMP-2); the student picks, the admin may correct. */
        roleFamily: interviewReportRoleFamilyEnum("role_family").notNull().default("OTHER"),
        level: interviewReportLevelEnum("level").notNull().default("ENTRY"),
        /** The first day of the month it happened; only the month is asked for. */
        interviewedOn: date("interviewed_on").notNull(),
        outcome: interviewReportOutcomeEnum("outcome").notNull(),
        status: interviewReportStatusEnum("status").notNull().default("PENDING"),
        /** Told to the student when rejected. */
        rejectReason: text("reject_reason"),
        reviewedBy: text("reviewed_by"),
        reviewedAt: timestamp("reviewed_at"),
        /** Credits paid on approval (10, or 0 past the month's five). */
        creditsRewarded: integer("credits_rewarded").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        check("chk_interview_report_company", sql`${table.companyId} is not null or ${table.companyRequestId} is not null`),
        // One report of one interview: the same student, company, role and month.
        uniqueIndex("uq_interview_report_once").on(table.userId, sql`coalesce(${table.companyId}, ${table.companyRequestId})`, table.roleKey, table.interviewedOn).where(sql`${table.userId} is not null`),
        index("idx_interview_report_company_status").on(table.companyId, table.status),
        index("idx_interview_report_request").on(table.companyRequestId),
        index("idx_interview_report_status_created").on(table.status, table.createdAt),
        index("idx_interview_report_user_created").on(table.userId, table.createdAt),
    ],
)

export const interviewReportRounds = pgTable(
    "interview_report_round",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        reportId: text("report_id").notNull().references(() => interviewReports.id, { onDelete: "cascade" }),
        /** 1-based, in the order the student took them. */
        position: integer("position").notNull(),
        roundType: interviewReportRoundTypeEnum("round_type").notNull(),
        title: text("title"),
        minutes: integer("minutes"),
    },
    (table) => [uniqueIndex("uq_interview_report_round_position").on(table.reportId, table.position)],
)

export const interviewReportQuestions = pgTable(
    "interview_report_question",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        roundId: text("round_id").notNull().references(() => interviewReportRounds.id, { onDelete: "cascade" }),
        reportId: text("report_id").notNull().references(() => interviewReports.id, { onDelete: "cascade" }),
        position: integer("position").notNull(),
        text: text("text").notNull(),
        /** Normalised, so the same question worded the same way counts once per report (CMP-2 ranks by it). */
        questionKey: text("question_key").notNull(),
        practiceProblemId: text("practice_problem_id").references(() => practiceProblem.id, { onDelete: "set null" }),
        aptitudeQuestionId: text("aptitude_question_id").references(() => aptitudeQuestions.id, { onDelete: "set null" }),
        /** An admin said it's the same as this earlier question (CMP-2): it counts toward that one. */
        sameAsId: text("same_as_id").references((): AnyPgColumn => interviewReportQuestions.id, { onDelete: "set null" }),
    },
    (table) => [
        index("idx_interview_report_question_round").on(table.roundId),
        index("idx_interview_report_question_key").on(table.questionKey),
    ],
)

export const interviewReportsRelations = relations(interviewReports, ({ one, many }) => ({
    user: one(users, { fields: [interviewReports.userId], references: [users.id] }),
    company: one(companies, { fields: [interviewReports.companyId], references: [companies.id] }),
    companyRequest: one(companyRequests, { fields: [interviewReports.companyRequestId], references: [companyRequests.id] }),
    rounds: many(interviewReportRounds),
}))

export const interviewReportRoundsRelations = relations(interviewReportRounds, ({ one, many }) => ({
    report: one(interviewReports, { fields: [interviewReportRounds.reportId], references: [interviewReports.id] }),
    questions: many(interviewReportQuestions),
}))

export const interviewReportQuestionsRelations = relations(interviewReportQuestions, ({ one }) => ({
    round: one(interviewReportRounds, { fields: [interviewReportQuestions.roundId], references: [interviewReportRounds.id] }),
}))
