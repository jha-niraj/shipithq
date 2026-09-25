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
    real,
    check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";
import { companies } from "./hiring";

// ===========================
// Enums
// ===========================

export const interviewRoundTypeEnum = pgEnum("interview_round_type", [
    "PHONE_SCREEN",
    "TECHNICAL_CODING",
    "SYSTEM_DESIGN",
    "BEHAVIORAL",
    "TAKE_HOME",
    "PANEL",
    "HIRING_MANAGER",
    "CULTURE_FIT",
    "HR_FINAL",
    "CUSTOM",
    // Hiring rounds (plan/hiring-rounds HR-1): the scored round types students take.
    "APTITUDE",
    "DSA",
    "VOICE_BEHAVIOURAL",
    "VOICE_CULTURE",
]);

/** Who owns a pipeline: a company, or ShipItHQ's generic role pipelines (HR-4). */
export const pipelineOwnerKindEnum = pgEnum("pipeline_owner_kind", ["COMPANY", "PLATFORM"]);
/** HARD: below the pass mark, the next round stays locked. ADVISORY: scored and shown, never blocks. */
export const roundGateModeEnum = pgEnum("round_gate_mode", ["HARD", "ADVISORY"]);
/** How a voice round may be answered (HR-16). */
export const roundResponseModeEnum = pgEnum("round_response_mode", ["VOICE", "TYPED", "EITHER"]);
/** What a round's pool item points at (HR-11). */
export const roundPoolItemKindEnum = pgEnum("round_pool_item_kind", ["PRACTICE_PROBLEM", "APTITUDE_QUESTION", "DESIGN_PROMPT"]);

export const interviewFormatEnum = pgEnum("interview_format", [
    "VOICE",
    "VIDEO",
    "IN_PERSON",
    "TAKE_HOME",
    "LIVE_CODING",
    "WHITEBOARD",
]);

export const jobMockSessionTypeEnum = pgEnum("job_mock_session_type", [
    "VOICE",
    "CODING",
    "SYSTEM_DESIGN",
    "BEHAVIORAL",
]);

export const jobMockStatusEnum = pgEnum("job_mock_status", [
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "FAILED",
]);

// ===========================
// Tables
// ===========================

export const interviewProcesses = pgTable(
    "interview_process",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        /** Null only for PLATFORM pipelines (a check constraint holds it). */
        companyId: text("company_id")
            .references(() => companies.id, { onDelete: "cascade" }),
        ownerKind: pipelineOwnerKindEnum("owner_kind").notNull().default("COMPANY"),
        /** A template jobs pick from; false for a job's own edited copy (HR-12). */
        isTemplate: boolean("is_template").notNull().default(true),
        /** The template a job's copy was made from. */
        sourceTemplateId: text("source_template_id"),
        /** Set on a job's own copy. Plain column: jobs.ts owns the FK the other way. */
        jobId: text("job_id"),
        name: text("name").notNull(),
        description: text("description"),
        isDefault: boolean("is_default").notNull().default(false),
        estimatedDurationWeeks: real("estimated_duration_weeks"),
        avgTimeToHireDays: integer("avg_time_to_hire_days"),
        responseRatePercent: real("response_rate_percent"),
        applicationToInterviewPercent: real("application_to_interview_percent"),
        interviewToOfferPercent: real("interview_to_offer_percent"),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_interview_process_company_id").on(table.companyId),
        index("idx_interview_process_is_default").on(table.isDefault),
        index("idx_interview_process_job_id").on(table.jobId),
        check("chk_interview_process_owner", sql`(${table.ownerKind} = 'PLATFORM') or (${table.companyId} is not null)`),
    ],
);

export const interviewRounds = pgTable(
    "interview_round",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        processId: text("process_id")
            .notNull()
            .references(() => interviewProcesses.id, { onDelete: "cascade" }),
        roundNumber: integer("round_number").notNull(),
        roundType: interviewRoundTypeEnum("round_type").notNull(),
        title: text("title").notNull(),
        durationMinutes: integer("duration_minutes"),
        format: interviewFormatEnum("format").notNull().default("VIDEO"),
        description: text("description").notNull(),
        whatToExpect: jsonb("what_to_expect"),
        sampleQuestions: jsonb("sample_questions"),
        evaluationCriteria: jsonb("evaluation_criteria"),
        topicsCovered: jsonb("topics_covered"),
        tipsForCandidates: jsonb("tips_for_candidates"),
        passRatePercent: real("pass_rate_percent"),
        daysToNextRound: integer("days_to_next_round"),
        internalNotes: text("internal_notes"),
        interviewerGuide: text("interviewer_guide"),
        hasMockInterview: boolean("has_mock_interview").notNull().default(true),
        mockKnowledgeBase: text("mock_knowledge_base"),
        // Gating (plan/hiring-rounds HR-1). Existing rounds are ADVISORY at 0, so
        // nothing that worked before starts blocking anyone.
        gateMode: roundGateModeEnum("gate_mode").notNull().default("ADVISORY"),
        passMark: integer("pass_mark").notNull().default(0),
        timeLimitMinutes: integer("time_limit_minutes"),
        /** How many items each attempt draws from the pool. */
        drawCount: integer("draw_count").notNull().default(1),
        cooldownHours: integer("cooldown_hours").notNull().default(24),
        /** For AI-scored rounds: the criteria and weights the score is given against. */
        rubric: jsonb("rubric"),
        responseMode: roundResponseModeEnum("response_mode").notNull().default("EITHER"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_interview_round_process_id_round_number").on(
            table.processId,
            table.roundNumber,
        ),
        index("idx_interview_round_process_id").on(table.processId),
        index("idx_interview_round_round_type").on(table.roundType),
    ],
);

/** One item a round's attempts draw from (plan/hiring-rounds HR-1, HR-11). */
export const hiringRoundPoolItems = pgTable(
    "hiring_round_pool_item",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        roundId: text("round_id")
            .notNull()
            .references(() => interviewRounds.id, { onDelete: "cascade" }),
        kind: roundPoolItemKindEnum("kind").notNull(),
        /** The practice problem, aptitude question or design prompt's id. */
        refId: text("ref_id").notNull(),
        weight: integer("weight").notNull().default(1),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_hiring_round_pool_item_round_kind_ref").on(table.roundId, table.kind, table.refId),
        index("idx_hiring_round_pool_item_round_id").on(table.roundId),
    ],
);

export const jobMockSessions = pgTable(
    "job_mock_session",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        jobId: text("job_id"),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        roundId: text("round_id")
            .notNull()
            .references(() => interviewRounds.id, { onDelete: "cascade" }),
        sessionType: jobMockSessionTypeEnum("session_type").notNull().default("VOICE"),
        status: jobMockStatusEnum("status").notNull().default("SCHEDULED"),
        conversationId: text("conversation_id").unique(),
        agentId: text("agent_id"),
        variables: jsonb("variables"),
        scheduledFor: timestamp("scheduled_for"),
        startedAt: timestamp("started_at"),
        completedAt: timestamp("completed_at"),
        durationSeconds: integer("duration_seconds"),
        recordingUrl: text("recording_url"),
        transcriptUrl: text("transcript_url"),
        transcript: text("transcript"),
        codeSubmission: text("code_submission"),
        codeLanguage: text("code_language"),
        testResults: jsonb("test_results"),
        diagramUrl: text("diagram_url"),
        designNotes: text("design_notes"),
        overallScore: integer("overall_score"),
        aiAnalysis: jsonb("ai_analysis"),
        categoryScores: jsonb("category_scores"),
        strengths: jsonb("strengths"),
        improvements: jsonb("improvements"),
        percentileRank: integer("percentile_rank"),
        trend: text("trend"),
        userRating: integer("user_rating"),
        userFeedback: text("user_feedback"),
        creditsUsed: integer("credits_used").notNull().default(15),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_job_mock_session_user_id").on(table.userId),
        index("idx_job_mock_session_job_id").on(table.jobId),
        index("idx_job_mock_session_company_id").on(table.companyId),
        index("idx_job_mock_session_round_id").on(table.roundId),
        index("idx_job_mock_session_status").on(table.status),
        index("idx_job_mock_session_conversation_id").on(table.conversationId),
    ],
);

export const interviewPrepProgress = pgTable(
    "interview_prep_progress",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        applicationId: text("application_id").notNull().unique(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        overallReadinessScore: integer("overall_readiness_score").notNull().default(0),
        targetReadinessScore: integer("target_readiness_score").notNull().default(80),
        roundsCompleted: integer("rounds_completed").notNull().default(0),
        totalRounds: integer("total_rounds").notNull().default(0),
        lastPracticedAt: timestamp("last_practiced_at"),
        totalPracticeSessions: integer("total_practice_sessions").notNull().default(0),
        totalPracticeMinutes: integer("total_practice_minutes").notNull().default(0),
        bestScores: jsonb("best_scores"),
        nextRecommendedRound: text("next_recommended_round"),
        recommendedResources: jsonb("recommended_resources"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_interview_prep_progress_user_id").on(table.userId),
    ],
);

// ===========================
// Relations
// ===========================

export const interviewProcessesRelations = relations(interviewProcesses, ({ one, many }) => ({
    company: one(companies, {
        fields: [interviewProcesses.companyId],
        references: [companies.id],
    }),
    rounds: many(interviewRounds),
}));

export const hiringRoundPoolItemsRelations = relations(hiringRoundPoolItems, ({ one }) => ({
    round: one(interviewRounds, {
        fields: [hiringRoundPoolItems.roundId],
        references: [interviewRounds.id],
    }),
}));

export const interviewRoundsRelations = relations(interviewRounds, ({ one, many }) => ({
    poolItems: many(hiringRoundPoolItems),
    process: one(interviewProcesses, {
        fields: [interviewRounds.processId],
        references: [interviewProcesses.id],
    }),
    mockSessions: many(jobMockSessions),
}));

export const jobMockSessionsRelations = relations(jobMockSessions, ({ one }) => ({
    user: one(users, {
        fields: [jobMockSessions.userId],
        references: [users.id],
        relationName: "UserJobMockSessions",
    }),
    company: one(companies, {
        fields: [jobMockSessions.companyId],
        references: [companies.id],
    }),
    round: one(interviewRounds, {
        fields: [jobMockSessions.roundId],
        references: [interviewRounds.id],
    }),
}));

export const interviewPrepProgressRelations = relations(interviewPrepProgress, ({ one }) => ({
    user: one(users, {
        fields: [interviewPrepProgress.userId],
        references: [users.id],
        relationName: "UserInterviewPrepProgress",
    }),
}));
