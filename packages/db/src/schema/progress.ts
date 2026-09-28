import { date, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";

/**
 * Progress reports (plan/progress PRG-1): how often a user wants one, and each report as
 * a stored snapshot. No row in `report_preference` means WEEKLY (Niraj, 2026-09-28:
 * weekly and on by default).
 */

export const reportFrequencyEnum = pgEnum("report_frequency", ["WEEKLY", "HALF_MONTHLY", "MONTHLY", "OFF"]);

export const reportPreferences = pgTable("report_preference", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    frequency: reportFrequencyEnum("frequency").notNull().default("WEEKLY"),
    /** In every email's unsubscribe link: turns reports off without signing in. */
    unsubscribeToken: text("unsubscribe_token").notNull().unique().$defaultFn(() => createId() + createId()),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export const progressReports = pgTable(
    "progress_report",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        frequency: reportFrequencyEnum("frequency").notNull(),
        /** Inclusive UTC days. */
        periodStart: date("period_start").notNull(),
        periodEnd: date("period_end").notNull(),
        /** The snapshot (`ReportSnapshot` in @repo/db/progress, versioned). Never recomputed. */
        data: jsonb("data").notNull(),
        /** Set while the owner shares it: `/reports/s/<token>` opens signed out. */
        shareToken: text("share_token").unique(),
        emailedAt: timestamp("emailed_at"),
        viewedAt: timestamp("viewed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        // A re-run of the job for the same period finds the report already there.
        uniqueIndex("uq_progress_report_user_frequency_start").on(table.userId, table.frequency, table.periodStart),
        index("idx_progress_report_user_created").on(table.userId, table.createdAt),
    ],
);

/**
 * Every badge a user has earned, platform-wide (plan/badges BDG-1). Keys are the
 * catalogue's (`@repo/db/badges`) or `incidents:<key>`. Earned once, kept. `seenAt` is
 * set when the toast has shown (BDG-8).
 */
export const userBadges = pgTable(
    "user_badge",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        badgeKey: text("badge_key").notNull(),
        earnedAt: timestamp("earned_at").notNull().defaultNow(),
        seenAt: timestamp("seen_at"),
    },
    (table) => [
        uniqueIndex("uq_user_badge_user_key").on(table.userId, table.badgeKey),
        index("idx_user_badge_user_earned").on(table.userId, table.earnedAt),
    ],
);
