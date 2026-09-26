import {
    pgTable,
    pgEnum,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users, xpTransactionPropsEnum } from "./schema";

// NOTE: The badge/achievements gamification feature was removed. This file now
// only retains the tables that are still used elsewhere: XP/levels (Projects
// awards XP; the level ledger) and social account connections (Settings →
// Integrations). The badge / userBadges / socialShares / achievementNotifications
// / userAchievementStats tables were dropped.

// ===========================
// Enums
// ===========================

export const socialProviderEnum = pgEnum("social_provider", [
    "TWITTER",
    "LINKEDIN",
]);

// ===========================
// Tables
// ===========================

export const levels = pgTable(
    "level",
    {
        id: serial("id").primaryKey(),
        level: integer("level").unique().notNull(),
        title: text("title").notNull(),
        description: text("description"),
        icon: text("icon"),
        color: text("color"),
        xpRequired: integer("xp_required").notNull(),
        xpReward: integer("xp_reward").notNull().default(0),
        creditsReward: integer("credits_reward").notNull().default(0),
        perks: jsonb("perks"),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_level_level").on(table.level),
    ],
);

export const userLevelProgress = pgTable(
    "user_level_progress",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        level: integer("level")
            .notNull()
            .references(() => levels.level, { onDelete: "cascade" }),
        xpEarned: integer("xp_earned").notNull().default(0),
        creditsEarned: integer("credits_earned").notNull().default(0),
        achievedAt: timestamp("achieved_at").notNull().defaultNow(),
        sharedToSocial: boolean("shared_to_social").notNull().default(false),
    },
    (table) => [
        uniqueIndex("uq_user_level_progress_user_id_level").on(table.userId, table.level),
        index("idx_user_level_progress_user_id").on(table.userId),
        index("idx_user_level_progress_level").on(table.level),
    ],
);

export const xpTransactions = pgTable(
    "xp_transaction",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        amount: integer("amount").notNull(),
        description: text("description").notNull(),
        type: xpTransactionPropsEnum("type").notNull().default("REWARD"),
        source: text("source"),
        sourceId: text("source_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_xp_transaction_user_id").on(table.userId),
        index("idx_xp_transaction_created_at").on(table.createdAt),
        index("idx_xp_transaction_type").on(table.type),
    ],
);

export const socialConnections = pgTable(
    "social_connection",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        provider: socialProviderEnum("provider").notNull(),
        providerAccountId: text("provider_account_id").notNull(),
        accessToken: text("access_token").notNull(),
        refreshToken: text("refresh_token"),
        tokenExpiresAt: timestamp("token_expires_at"),
        accountName: text("account_name"),
        accountHandle: text("account_handle"),
        accountImage: text("account_image"),
        isActive: boolean("is_active").notNull().default(true),
        lastUsedAt: timestamp("last_used_at"),
        connectedAt: timestamp("connected_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_social_connection_user_id_provider").on(table.userId, table.provider),
        index("idx_social_connection_user_id").on(table.userId),
        index("idx_social_connection_provider").on(table.provider),
    ],
);

// ===========================
// Relations
// ===========================

export const levelsRelations = relations(levels, ({ many }) => ({
    userProgress: many(userLevelProgress),
}));

export const userLevelProgressRelations = relations(userLevelProgress, ({ one }) => ({
    user: one(users, {
        fields: [userLevelProgress.userId],
        references: [users.id],
    }),
    levelInfo: one(levels, {
        fields: [userLevelProgress.level],
        references: [levels.level],
    }),
}));

export const xpTransactionsRelations = relations(xpTransactions, ({ one }) => ({
    user: one(users, {
        fields: [xpTransactions.userId],
        references: [users.id],
    }),
}));

export const socialConnectionsRelations = relations(socialConnections, ({ one }) => ({
    user: one(users, {
        fields: [socialConnections.userId],
        references: [users.id],
    }),
}));
