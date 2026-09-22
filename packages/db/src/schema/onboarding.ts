import {
    pgTable,
    text,
    integer,
    jsonb,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";
import type { OnboardingProfile, OnboardingTurn } from "../onboarding-types";

// ===========================
// Module onboarding
// ===========================
//
// One row per attempt ("run") at a sub-module's adaptive onboarding, keyed by
// user, module key and version. The module key is text, not an enum, so the
// next sub-module needs a config entry in the app and no migration. The app's
// `ONBOARDING_MODULES` config is the source of truth for valid keys.
//
// `turns` is appended in place as the run progresses. It is never rewritten
// from the front except by the "change an earlier answer" action, which
// truncates it. See plan/module-onboarding/tasks.md (MO-1, MO-8).

export const moduleOnboarding = pgTable(
    "module_onboarding",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        moduleKey: text("module_key").notNull(),
        version: integer("version").notNull().default(1),
        // 'in_progress' | 'completed'
        status: text("status").notNull().default("in_progress"),
        turns: jsonb("turns").$type<OnboardingTurn[]>().notNull().default([]),
        openQuestionCount: integer("open_question_count").notNull().default(0),
        profile: jsonb("profile").$type<OnboardingProfile>(),
        level: text("level"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        completedAt: timestamp("completed_at"),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_module_onboarding_user_module_version").on(table.userId, table.moduleKey, table.version),
        index("idx_module_onboarding_user_module_status").on(table.userId, table.moduleKey, table.status),
    ],
);

export const moduleOnboardingRelations = relations(moduleOnboarding, ({ one }) => ({
    user: one(users, {
        fields: [moduleOnboarding.userId],
        references: [users.id],
        relationName: "UserModuleOnboarding",
    }),
}));
