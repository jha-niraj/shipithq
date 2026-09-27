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
    date,
    real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";

// ===========================
// Enums
// ===========================

export const pathfinderCategoryEnum = pgEnum("pathfinder_category", [
    "DSA",
    "WEB_DEVELOPMENT",
    "FRONTEND",
    "BACKEND",
    "DEVOPS",
    "AI_ML",
    "DATABASE",
    "SYSTEM_DESIGN",
    "MOBILE",
    // Goals generated FROM a job description - see plan/interview-prep/. A
    // category rather than a boolean flag, so these filter, sort and render
    // through the machinery every other category already uses.
    "INTERVIEW_PREP",
    "OTHER",
]);

export const pathfinderLevelEnum = pgEnum("pathfinder_level", [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
]);

export const pathfinderStatusEnum = pgEnum("pathfinder_status", [
    "ACTIVE",
    "VERIFICATION",
    "COMPLETED",
    "FAILED",
    "ABANDONED",
]);

export const pathfinderGoalDurationEnum = pgEnum("pathfinder_goal_duration", [
    "ONE_WEEK",
    "FORTNIGHT",
    "ONE_MONTH",
    "TWO_MONTHS",
    "THREE_MONTHS",
    "SIX_MONTHS",
    "CUSTOM",
]);

export const verificationSectionStatusEnum = pgEnum("verification_section_status", [
    "LOCKED",
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "FAILED",
]);

/**
 * What KIND of thing a sub-goal is.
 *
 * `TOPIC` is the default and is what every sub-goal was before interview prep
 * existed: a subject to study. The other three arrive from a job description and
 * are questions to answer.
 *
 * A column rather than a naming convention on `title`, because a convention
 * cannot be filtered or counted. Not called `type`: this table already has
 * `source`, and `type` beside `source` reads as though one describes the other.
 */
export const pathfinderSubGoalKindEnum = pgEnum("pathfinder_sub_goal_kind", [
    "TOPIC",
    "TECHNICAL",
    "BEHAVIORAL",
    "CODING",
]);

export const subGoalStatusEnum = pgEnum("sub_goal_status", [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "SKIPPED",
]);

// ===========================
// Tables
// ===========================

export const pathfinderGroups = pgTable(
    "pathfinder_group",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        emoji: text("emoji").default("📁"),
        color: text("color").default("#525252"),
        description: text("description"),
        order: integer("order").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_pfg_user_id_name").on(table.userId, table.name),
        index("idx_pfg_user_id").on(table.userId),
    ],
);

export const pathfinderGoals = pgTable(
    "pathfinder_goal",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        groupId: text("group_id").references(() => pathfinderGroups.id, { onDelete: "set null" }),
        title: text("title").notNull(),
        slug: text("slug").notNull(),
        category: pathfinderCategoryEnum("category").notNull(),
        level: pathfinderLevelEnum("level").notNull(),
        focusAreas: text("focus_areas").array().notNull().default([]),
        targetDate: timestamp("target_date"),
        duration: pathfinderGoalDurationEnum("duration"),
        isPublic: boolean("is_public").notNull().default(false),
        forkedFromId: text("forked_from_id"),
        creditPrice: integer("credit_price"),
        overview: text("overview"),
        // Provenance for INTERVIEW_PREP goals. Without these the job description
        // that produced the questions is lost the moment generation finishes, so
        // the goal can never be regenerated or explained. Null for every other
        // category.
        sourceJobDescription: text("source_job_description"),
        sourceCompanyUrl: text("source_company_url"),
        sourceCompanyInfo: jsonb("source_company_info"),
        estimatedDays: integer("estimated_days"),
        estimatedHours: integer("estimated_hours"),
        learningObjectives: text("learning_objectives").array().notNull().default([]),
        prerequisites: text("prerequisites").array().notNull().default([]),
        status: pathfinderStatusEnum("status").notNull().default("ACTIVE"),
        progressPercent: integer("progress_percent").notNull().default(0),
        totalSubGoals: integer("total_sub_goals").notNull().default(0),
        completedSubGoals: integer("completed_sub_goals").notNull().default(0),
        totalQuizAnswered: integer("total_quiz_answered").notNull().default(0),
        totalCodingSolved: integer("total_coding_solved").notNull().default(0),
        streakDays: integer("streak_days").notNull().default(0),
        lastActivityAt: timestamp("last_activity_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
        startedAt: timestamp("started_at"),
        verificationStartedAt: timestamp("verification_started_at"),
        completedAt: timestamp("completed_at"),
    },
    (table) => [
        uniqueIndex("idx_pfgoal_user_id_slug").on(table.userId, table.slug),
        index("idx_pfgoal_user_id").on(table.userId),
        index("idx_pfgoal_group_id").on(table.groupId),
        index("idx_pfgoal_status").on(table.status),
        index("idx_pfgoal_category").on(table.category),
        index("idx_pfgoal_created_at").on(table.createdAt),
    ],
);

export const pathfinderDailySessions = pgTable(
    "pathfinder_daily_session",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        userId: text("user_id").notNull(),
        date: date("date").notNull(),
        totalSubGoals: integer("total_sub_goals").notNull().default(0),
        completedSubGoals: integer("completed_sub_goals").notNull().default(0),
        totalQuizQuestions: integer("total_quiz_questions").notNull().default(0),
        correctQuizAnswers: integer("correct_quiz_answers").notNull().default(0),
        totalCodingProblems: integer("total_coding_problems").notNull().default(0),
        solvedCodingProblems: integer("solved_coding_problems").notNull().default(0),
        totalTimeMinutes: integer("total_time_minutes").notNull().default(0),
        notes: text("notes"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_pfds_goal_id_date").on(table.goalId, table.date),
        index("idx_pfds_goal_id").on(table.goalId),
        index("idx_pfds_user_id").on(table.userId),
        index("idx_pfds_date").on(table.date),
    ],
);

export const pathfinderSubGoals = pgTable(
    "pathfinder_sub_goal",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        sessionId: text("session_id")
            .notNull()
            .references(() => pathfinderDailySessions.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        source: text("source").notNull().default("text"),
        // Defaults to TOPIC so every sub-goal that predates interview prep keeps
        // its meaning. notNull on purpose: a nullable kind would put a null
        // branch in every read site forever.
        kind: pathfinderSubGoalKindEnum("kind").notNull().default("TOPIC"),
        voiceTranscript: text("voice_transcript"),
        status: subGoalStatusEnum("status").notNull().default("PENDING"),
        order: integer("order").notNull().default(0),
        isAIGenerated: boolean("is_ai_generated").notNull().default(false),
        isContentLoaded: boolean("is_content_loaded").notNull().default(false),
        aiCodingProblem: jsonb("ai_coding_problem"),
        hasCoding: boolean("has_coding").notNull().default(false),
        // studioId is a soft FK to Studio (defined in studio.ts) - no .references() to avoid circular imports
        studioId: text("studio_id").unique(),
        quizCompleted: boolean("quiz_completed").notNull().default(false),
        quizScore: integer("quiz_score"),
        codingCompleted: boolean("coding_completed").notNull().default(false),
        codingPassed: boolean("coding_passed").notNull().default(false),
        codingProgress: jsonb("coding_progress"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
        completedAt: timestamp("completed_at"),
    },
    (table) => [
        index("idx_pfsg_goal_id").on(table.goalId),
        index("idx_pfsg_session_id").on(table.sessionId),
        index("idx_pfsg_status").on(table.status),
    ],
);

export const pathfinderVerifications = pgTable(
    "pathfinder_verification",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .unique()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        overallScore: integer("overall_score"),
        passed: boolean("passed").notNull().default(false),
        quizStatus: verificationSectionStatusEnum("quiz_status").notNull().default("PENDING"),
        codingStatus: verificationSectionStatusEnum("coding_status").notNull().default("LOCKED"),
        mockStatus: verificationSectionStatusEnum("mock_status").notNull().default("LOCKED"),
        projectStatus: verificationSectionStatusEnum("project_status").notNull().default("LOCKED"),
        quizScore: integer("quiz_score"),
        codingScore: integer("coding_score"),
        mockScore: integer("mock_score"),
        projectComplete: boolean("project_complete").notNull().default(false),
        quizAttempts: integer("quiz_attempts").notNull().default(0),
        codingAttempts: integer("coding_attempts").notNull().default(0),
        mockAttempts: integer("mock_attempts").notNull().default(0),
        verificationCreditsCharged: integer("verification_credits_charged").notNull().default(0),
        generatedPlan: jsonb("generated_plan"),
        mockInterviewId: text("mock_interview_id"),
        mockSessionId: text("mock_session_id"),
        projectType: text("project_type"),
        projectId: text("project_id"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        quizCompletedAt: timestamp("quiz_completed_at"),
        codingCompletedAt: timestamp("coding_completed_at"),
        mockCompletedAt: timestamp("mock_completed_at"),
        projectCompletedAt: timestamp("project_completed_at"),
        completedAt: timestamp("completed_at"),
    },
    (table) => [
        index("idx_pfv_goal_id").on(table.goalId),
    ],
);

export const pathfinderQuizAttempts = pgTable(
    "pathfinder_quiz_attempt",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        userId: text("user_id").notNull(),
        quizType: text("quiz_type").notNull(),
        dayNumber: integer("day_number"),
        score: integer("score").notNull(),
        correctCount: integer("correct_count").notNull(),
        totalQuestions: integer("total_questions").notNull(),
        timeTaken: integer("time_taken").notNull(),
        answers: jsonb("answers").notNull(),
        startedAt: timestamp("started_at").notNull(),
        completedAt: timestamp("completed_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_pfqa_goal_id").on(table.goalId),
        index("idx_pfqa_user_id").on(table.userId),
        index("idx_pfqa_quiz_type").on(table.quizType),
    ],
);

export const pathfinderCodingSubmissions = pgTable(
    "pathfinder_coding_submission",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        userId: text("user_id").notNull(),
        submissionType: text("submission_type").notNull(),
        dayNumber: integer("day_number"),
        problemId: text("problem_id").notNull(),
        code: text("code").notNull(),
        language: text("language").notNull(),
        passed: boolean("passed").notNull().default(false),
        testsPassed: integer("tests_passed").notNull().default(0),
        totalTests: integer("total_tests").notNull().default(0),
        executionTime: integer("execution_time"),
        testResults: jsonb("test_results"),
        submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_pfcs_goal_id").on(table.goalId),
        index("idx_pfcs_user_id").on(table.userId),
        index("idx_pfcs_problem_id").on(table.problemId),
    ],
);

export const pathfinderUsageLedger = pgTable(
    "pathfinder_usage_ledger",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        userId: text("user_id").notNull(),
        action: text("action").notNull(),
        provider: text("provider").notNull(),
        inputTokens: integer("input_tokens").notNull().default(0),
        outputTokens: integer("output_tokens").notNull().default(0),
        creditsCost: integer("credits_cost").notNull().default(0),
        deducted: boolean("deducted").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_pful_goal_id").on(table.goalId),
        index("idx_pful_user_id").on(table.userId),
        index("idx_pful_created_at").on(table.createdAt),
    ],
);

export const pathfinderGoalPurchases = pgTable(
    "pathfinder_goal_purchase",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        goalId: text("goal_id")
            .notNull()
            .references(() => pathfinderGoals.id, { onDelete: "cascade" }),
        buyerId: text("buyer_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        creditsPaid: integer("credits_paid").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("idx_pfgp_goal_id_buyer_id").on(table.goalId, table.buyerId),
        index("idx_pfgp_goal_id").on(table.goalId),
        index("idx_pfgp_buyer_id").on(table.buyerId),
    ],
);

// ===========================
// Relations
// ===========================

export const pathfinderGroupsRelations = relations(pathfinderGroups, ({ one, many }) => ({
    user: one(users, {
        fields: [pathfinderGroups.userId],
        references: [users.id],
        relationName: "UserPathfinderGroups",
    }),
    goals: many(pathfinderGoals),
}));

export const pathfinderGoalsRelations = relations(pathfinderGoals, ({ one, many }) => ({
    user: one(users, {
        fields: [pathfinderGoals.userId],
        references: [users.id],
        relationName: "UserPathfinderGoals",
    }),
    group: one(pathfinderGroups, {
        fields: [pathfinderGoals.groupId],
        references: [pathfinderGroups.id],
        relationName: "GroupGoals",
    }),
    subGoals: many(pathfinderSubGoals),
    dailySessions: many(pathfinderDailySessions),
    verification: one(pathfinderVerifications),
    quizAttempts: many(pathfinderQuizAttempts),
    codingSubmissions: many(pathfinderCodingSubmissions),
    usageLedger: many(pathfinderUsageLedger),
    purchases: many(pathfinderGoalPurchases),
}));

export const pathfinderDailySessionsRelations = relations(pathfinderDailySessions, ({ one, many }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderDailySessions.goalId],
        references: [pathfinderGoals.id],
    }),
    subGoals: many(pathfinderSubGoals),
}));

export const pathfinderSubGoalsRelations = relations(pathfinderSubGoals, ({ one }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderSubGoals.goalId],
        references: [pathfinderGoals.id],
    }),
    session: one(pathfinderDailySessions, {
        fields: [pathfinderSubGoals.sessionId],
        references: [pathfinderDailySessions.id],
    }),
}));

export const pathfinderVerificationsRelations = relations(pathfinderVerifications, ({ one }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderVerifications.goalId],
        references: [pathfinderGoals.id],
    }),
}));

export const pathfinderQuizAttemptsRelations = relations(pathfinderQuizAttempts, ({ one }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderQuizAttempts.goalId],
        references: [pathfinderGoals.id],
    }),
}));

export const pathfinderCodingSubmissionsRelations = relations(pathfinderCodingSubmissions, ({ one }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderCodingSubmissions.goalId],
        references: [pathfinderGoals.id],
    }),
}));

export const pathfinderUsageLedgerRelations = relations(pathfinderUsageLedger, ({ one }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderUsageLedger.goalId],
        references: [pathfinderGoals.id],
    }),
}));

export const pathfinderGoalPurchasesRelations = relations(pathfinderGoalPurchases, ({ one }) => ({
    goal: one(pathfinderGoals, {
        fields: [pathfinderGoalPurchases.goalId],
        references: [pathfinderGoals.id],
    }),
    buyer: one(users, {
        fields: [pathfinderGoalPurchases.buyerId],
        references: [users.id],
        relationName: "PathfinderGoalPurchases",
    }),
}));
