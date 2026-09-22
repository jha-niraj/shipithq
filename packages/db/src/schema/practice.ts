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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";
import type {
    DeletedConcept, JudgeLanguage, JudgeStatus, JudgeTest, LearnerConcept, LearnerMistake,
    PracticeMentorState, PracticeStage,
} from "../practice-types";

// ===========================
// Enums
// ===========================

export const practiceModuleEnum = pgEnum("practice_module", [
    "DSA",
    "SYSTEM_DESIGN",
    "WEB_FRONTEND",
    "WEB_BACKEND",
]);

export const practiceDifficultyEnum = pgEnum("practice_difficulty", [
    "EASY",
    "MEDIUM",
    "HARD",
]);

export const practiceSessionStatusEnum = pgEnum("practice_session_status", [
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
]);

export const practiceModeEnum = pgEnum("practice_mode", [
    "EXAM",
    "ASSIST",
]);

// ===========================
// Tables
// ===========================

export const practiceProblem = pgTable(
    "practice_problem",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        slug: text("slug").notNull().unique(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        module: practiceModuleEnum("module").notNull(),
        category: text("category").notNull(),
        difficulty: practiceDifficultyEnum("difficulty").notNull(),
        requirements: text("requirements").array().notNull().default([]),
        hints: text("hints").array().notNull().default([]),
        starterCode: text("starter_code"),
        starterCss: text("starter_css"),
        testCases: jsonb("test_cases"),
        tags: text("tags").array().notNull().default([]),
        sortOrder: integer("sort_order").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        // ── Judge assets (DSA) ──────────────────────────────────────────────
        // Generated once per problem by the `practice_tests_generate` job and
        // marked `ready` only after the reference solution passed every test in
        // the real container. `referenceSolution` and the hidden entries of
        // `judgeTests` must never be selected into anything a client renders:
        // `clientSafeProblem` in `@repo/db` is the only projection allowed out.
        // Plan: plan/practice-dsa (PD-1, PD-3, PD-4).
        functionSignature: text("function_signature"),
        harness: jsonb("harness").$type<Partial<Record<JudgeLanguage, string>>>(),
        judgeTests: jsonb("judge_tests").$type<JudgeTest[]>(),
        referenceSolution: jsonb("reference_solution").$type<Partial<Record<JudgeLanguage, string>>>(),
        judgeStatus: text("judge_status").$type<JudgeStatus>().notNull().default("none"),
        judgeError: text("judge_error"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_practice_problem_module_category").on(table.module, table.category),
        index("idx_practice_problem_module_difficulty").on(table.module, table.difficulty),
        index("idx_practice_problem_slug").on(table.slug),
    ],
);

export const practiceUserSession = pgTable(
    "practice_user_session",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        problemId: text("problem_id").notNull().references(() => practiceProblem.id, { onDelete: "cascade" }),
        module: practiceModuleEnum("module").notNull(),
        mode: practiceModeEnum("mode").notNull(),
        status: practiceSessionStatusEnum("status").notNull().default("IN_PROGRESS"),
        code: text("code"),
        cssCode: text("css_code"),
        canvasData: jsonb("canvas_data"),
        language: text("language").default("javascript"),
        attempts: integer("attempts").notNull().default(0),
        bestScore: integer("best_score").notNull().default(0),
        lastFeedback: text("last_feedback"),
        requirementsMet: jsonb("requirements_met"),
        totalTimeSeconds: integer("total_time_seconds").notNull().default(0),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        completedAt: timestamp("completed_at"),
        voiceUsed: boolean("voice_used").notNull().default(false),
        // Appended in place, never reordered or truncated from the front:
        // `memoryWatermark` is an index into it.
        chatHistory: jsonb("chat_history"),
        xpAwarded: integer("xp_awarded").notNull().default(0),
        // ── Guided session (DSA, ASSIST) ────────────────────────────────────
        // A `COMPLETED` session counts as `done` regardless of `stage`; rows that
        // predate this column keep the default and are read that way (PD-1).
        stage: text("stage").$type<PracticeStage>().notNull().default("understand"),
        mentorState: jsonb("mentor_state").$type<PracticeMentorState>(),
        // Index into `chatHistory` up to which `practice_memory_update` has
        // consolidated. Re-running the job from the same watermark is a no-op.
        memoryWatermark: integer("memory_watermark").notNull().default(0),
        // When `practice_set` was settled for this row. Null on rows created
        // before charging existed: they open free, never backfilled (PD-10).
        paidAt: timestamp("paid_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_practice_user_session_user_id_problem_id_mode").on(table.userId, table.problemId, table.mode),
        index("idx_practice_user_session_user_id_module").on(table.userId, table.module),
        index("idx_practice_user_session_user_id_problem_id").on(table.userId, table.problemId),
        index("idx_practice_user_session_user_id_module_status").on(table.userId, table.module, table.status),
    ],
);

export const practiceModuleProgress = pgTable(
    "practice_module_progress",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        module: practiceModuleEnum("module").notNull(),
        totalProblems: integer("total_problems").notNull().default(0),
        completed: integer("completed").notNull().default(0),
        inProgress: integer("in_progress").notNull().default(0),
        totalXP: integer("total_xp").notNull().default(0),
        currentStreak: integer("current_streak").notNull().default(0),
        longestStreak: integer("longest_streak").notNull().default(0),
        lastPracticedAt: timestamp("last_practiced_at"),
        easyCompleted: integer("easy_completed").notNull().default(0),
        mediumCompleted: integer("medium_completed").notNull().default(0),
        hardCompleted: integer("hard_completed").notNull().default(0),
        averageScore: integer("average_score").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_practice_module_progress_user_id_module").on(table.userId, table.module),
        index("idx_practice_module_progress_user_id").on(table.userId),
        index("idx_practice_module_progress_module").on(table.module),
    ],
);

export const practiceLeaderboard = pgTable(
    "practice_leaderboard",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        module: practiceModuleEnum("module").notNull(),
        rank: integer("rank").notNull().default(0),
        totalXP: integer("total_xp").notNull().default(0),
        completed: integer("completed").notNull().default(0),
        averageScore: integer("average_score").notNull().default(0),
        streak: integer("streak").notNull().default(0),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_practice_leaderboard_user_id_module").on(table.userId, table.module),
        index("idx_practice_leaderboard_module").on(table.module),
        index("idx_practice_leaderboard_module_rank").on(table.module, table.rank),
    ],
);

export const practiceLearnerProfile = pgTable(
    "practice_learner_profile",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        module: practiceModuleEnum("module").notNull(),
        // What the mentor has observed across problems: concept entries with a
        // status and evidence, recurring mistakes, and the slugs the user deleted
        // so the consolidation job never brings them back (PD-8, PD-9).
        concepts: jsonb("concepts").$type<LearnerConcept[]>().notNull().default([]),
        mistakes: jsonb("mistakes").$type<LearnerMistake[]>().notNull().default([]),
        deletedSlugs: jsonb("deleted_slugs").$type<DeletedConcept[]>().notNull().default([]),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_practice_learner_profile_user_id_module").on(table.userId, table.module),
    ],
);

// ===========================
// Relations
// ===========================

export const practiceProblemRelations = relations(practiceProblem, ({ many }) => ({
    sessions: many(practiceUserSession),
}));

export const practiceUserSessionRelations = relations(practiceUserSession, ({ one }) => ({
    user: one(users, {
        fields: [practiceUserSession.userId],
        references: [users.id],
        relationName: "UserPracticeSessions",
    }),
    problem: one(practiceProblem, {
        fields: [practiceUserSession.problemId],
        references: [practiceProblem.id],
    }),
}));

export const practiceModuleProgressRelations = relations(practiceModuleProgress, ({ one }) => ({
    user: one(users, {
        fields: [practiceModuleProgress.userId],
        references: [users.id],
        relationName: "UserPracticeProgress",
    }),
}));

export const practiceLearnerProfileRelations = relations(practiceLearnerProfile, ({ one }) => ({
    user: one(users, {
        fields: [practiceLearnerProfile.userId],
        references: [users.id],
        relationName: "UserPracticeLearnerProfile",
    }),
}));

export const practiceLeaderboardRelations = relations(practiceLeaderboard, ({ one }) => ({
    user: one(users, {
        fields: [practiceLeaderboard.userId],
        references: [users.id],
        relationName: "UserPracticeLeaderboard",
    }),
}));
