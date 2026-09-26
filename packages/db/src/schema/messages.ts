import { pgEnum, pgTable, primaryKey, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { users } from "./schema"
import { companies } from "./hiring"
import { jobs } from "./jobs"
import { hiringSends } from "./hiring-rounds"

/*
 * Messages between a company and a student (plan/inbox IN-1, plan/hiring-app
 * HA-10). One thread per (company, student), opened by the company for a
 * student who sent it results. Any member with "message candidates" can write;
 * read state is per person (`message_read`), so one member reading doesn't
 * clear it for the others.
 */

export const messageAuthorKindEnum = pgEnum("message_author_kind", ["COMPANY", "STUDENT"])

export const messageThreads = pgTable(
    "message_thread",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        /** Null once the student deleted their account: the company keeps the thread, marked "account deleted" (HR-21). */
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        studentDeletedAt: timestamp("student_deleted_at"),
        /** The send it began from, and its role: context for both sides. */
        sendId: text("send_id").references(() => hiringSends.id, { onDelete: "set null" }),
        jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
        subject: text("subject").notNull(),
        lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
        /** When the company last emailed the student about it / the student the company: at most one an hour. */
        lastEmailToStudentAt: timestamp("last_email_to_student_at"),
        lastEmailToCompanyAt: timestamp("last_email_to_company_at"),
        /** The send was withdrawn: the student can still read, the company can't write. */
        closedAt: timestamp("closed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("uq_message_thread_company_user").on(t.companyId, t.userId),
        index("idx_message_thread_user").on(t.userId),
        index("idx_message_thread_company_last").on(t.companyId, t.lastMessageAt),
    ],
)

export const messages = pgTable(
    "message",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        threadId: text("thread_id").notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
        authorKind: messageAuthorKindEnum("author_kind").notNull(),
        authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
        body: text("body").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("idx_message_thread_created").on(t.threadId, t.createdAt)],
)

/** How far each person has read a thread. */
export const messageReads = pgTable(
    "message_read",
    {
        threadId: text("thread_id").notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.threadId, t.userId] })],
)

export const messageThreadRelations = relations(messageThreads, ({ many, one }) => ({
    messages: many(messages),
    company: one(companies, { fields: [messageThreads.companyId], references: [companies.id] }),
    user: one(users, { fields: [messageThreads.userId], references: [users.id] }),
}))

export const messageRelations = relations(messages, ({ one }) => ({
    thread: one(messageThreads, { fields: [messages.threadId], references: [messageThreads.id] }),
}))
