import {
    pgTable,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users, activityTypeEnum } from "./schema";

// ===========================
// Tables
// ===========================

export const dailyActivities = pgTable(
    "daily_activity",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        date: date("date").unique().notNull(),
        hasActivity: boolean("has_activity").notNull().default(false),
        totalXpEarned: integer("total_xp_earned").notNull().default(0),
        totalCreditsEarned: integer("total_credits_earned").notNull().default(0),
        totalTimeSpent: integer("total_time_spent").notNull().default(0),
        activitiesCount: integer("activities_count").notNull().default(0),
        isStreakDay: boolean("is_streak_day").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_daily_activity_user_id_date").on(table.userId, table.date),
        index("idx_daily_activity_user_id").on(table.userId),
        index("idx_daily_activity_date").on(table.date),
        index("idx_daily_activity_user_id_date").on(table.userId, table.date),
        index("idx_daily_activity_is_streak_day").on(table.isStreakDay),
    ],
);

export const activityEntries = pgTable(
    "activity_entry",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        dailyActivityId: text("daily_activity_id")
            .notNull()
            .references(() => dailyActivities.id, { onDelete: "cascade" }),
        activityType: activityTypeEnum("activity_type").notNull(),
        title: text("title").notNull(),
        description: text("description"),
        xpEarned: integer("xp_earned").notNull().default(0),
        creditsEarned: integer("credits_earned").notNull().default(0),
        timeSpent: integer("time_spent").notNull().default(0),
        metadata: jsonb("metadata"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_activity_entry_user_id").on(table.userId),
        index("idx_activity_entry_daily_activity_id").on(table.dailyActivityId),
        index("idx_activity_entry_activity_type").on(table.activityType),
        index("idx_activity_entry_user_id_created_at").on(table.userId, table.createdAt),
    ],
);

export const userStats = pgTable(
    "user_stats",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .unique()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        currentStreak: integer("current_streak").notNull().default(0),
        longestStreak: integer("longest_streak").notNull().default(0),
        totalSpeakingTime: integer("total_speaking_time").notNull().default(0),
        weeklyTalkingTime: integer("weekly_talking_time").notNull().default(0),
        totalConversations: integer("total_conversations").notNull().default(0),
        weeklyConversations: integer("weekly_conversations").notNull().default(0),
        lastActivityDate: timestamp("last_activity_date"),
        weekStartDate: timestamp("week_start_date").notNull().defaultNow(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_user_stats_user_id").on(table.userId),
    ],
);

export const streakRewards = pgTable(
    "streak_reward",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        streakDays: integer("streak_days").notNull(),
        creditsAwarded: integer("credits_awarded").notNull(),
        awardedAt: timestamp("awarded_at").notNull().defaultNow(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_streak_reward_user_id_streak_days").on(table.userId, table.streakDays),
        index("idx_streak_reward_user_id").on(table.userId),
    ],
);

export const userAchievements = pgTable(
    "user_achievement",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        achievementType: text("achievement_type").notNull(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        badgeIcon: text("badge_icon").notNull(),
        badgeColor: text("badge_color").notNull(),
        creditsAwarded: integer("credits_awarded").notNull().default(0),
        unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_user_achievement_user_id").on(table.userId),
        index("idx_user_achievement_achievement_type").on(table.achievementType),
    ],
);

// ===========================
// Relations
// ===========================

export const dailyActivitiesRelations = relations(dailyActivities, ({ one, many }) => ({
    user: one(users, {
        fields: [dailyActivities.userId],
        references: [users.id],
    }),
    activities: many(activityEntries),
}));

export const activityEntriesRelations = relations(activityEntries, ({ one }) => ({
    user: one(users, {
        fields: [activityEntries.userId],
        references: [users.id],
    }),
    dailyActivity: one(dailyActivities, {
        fields: [activityEntries.dailyActivityId],
        references: [dailyActivities.id],
    }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
    user: one(users, {
        fields: [userStats.userId],
        references: [users.id],
    }),
}));

export const streakRewardsRelations = relations(streakRewards, ({ one }) => ({
    user: one(users, {
        fields: [streakRewards.userId],
        references: [users.id],
    }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
    user: one(users, {
        fields: [userAchievements.userId],
        references: [users.id],
    }),
}));
