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
    varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users, resourceTypeEnum } from "./schema";
import type { RecommendedIdea } from "../practice-types";

// ===========================
// Enums
// ===========================

export const projectV2VisibilityEnum = pgEnum("project_v2_visibility", [
    "PRIVATE",
    "PUBLIC",
]);

export const projectV2DifficultyEnum = pgEnum("project_v2_difficulty", [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
]);

export const userProjectV2StatusEnum = pgEnum("user_project_v2_status", [
    "NOT_STARTED",
    "IN_PROGRESS",
    "SUBMITTED",
    "COMPLETED",
]);

export const taskKanbanStatusEnum = pgEnum("task_kanban_status", [
    "TO_DO",
    "IN_PROGRESS",
    "COMPLETED",
]);

export const quizV2DifficultyEnum = pgEnum("quiz_v2_difficulty", [
    "EASY",
    "MEDIUM",
    "HARD",
]);
export const projectErrorSeverityEnum = pgEnum("project_error_severity", [
    "HIGH",
    "MEDIUM",
    "LOW",
]);

export const projectErrorCategoryEnum = pgEnum("project_error_category", [
    "SETUP",
    "CONFIGURATION",
    "DATABASE",
    "API",
    "UI",
    "STATE",
    "DEPLOYMENT",
    "SECURITY",
    "PERFORMANCE",
    "OTHER",
]);

export const projectErrorStatusEnum = pgEnum("project_error_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);

export const projectIdeaStatusEnum = pgEnum("project_idea_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);

export const ideaTypeEnum = pgEnum("idea_type", [
    "PROBLEM_STATEMENT",
    "TECHNOLOGY_SPECIFIC",
]);

export const taskAssessmentTypeEnum = pgEnum("task_assessment_type", [
    "QUIZ",
    "CODE",
    "NONE",
]);

export const mockSessionTypeEnum = pgEnum("mock_session_type", [
    "PROJECT_FINAL",
    "SPRINT_REVIEW",
]);
export const projectV2InvitationStatusEnum = pgEnum("project_v2_invitation_status", [
    "PENDING",
    "ACCEPTED",
    "DECLINED",
    "EXPIRED",
]);

export const sprintSuggestionStatusEnum = pgEnum("sprint_suggestion_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);

// ===========================
// Tables
// ===========================

export const projectCategories = pgTable(
    "project_category",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        slug: text("slug").notNull().unique(),
        name: text("name").notNull(),
        description: text("description").notNull(),
        icon: text("icon").notNull(),
        color: text("color").notNull(),
        orderIndex: integer("order_index").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_category_slug").on(table.slug),
        index("idx_project_category_order_index").on(table.orderIndex),
        index("idx_project_category_is_active").on(table.isActive),
    ],
);

export const projectTechnologies = pgTable(
    "project_technology",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        slug: text("slug").notNull().unique(),
        name: text("name").notNull(),
        description: text("description").notNull(),
        icon: text("icon").notNull(),
        color: text("color").notNull(),
        learningOutcomes: text("learning_outcomes").array().notNull().default([]),
        projectCount: integer("project_count").notNull().default(0),
        orderIndex: integer("order_index").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        categoryId: text("category_id").notNull().references(() => projectCategories.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_technology_category_id").on(table.categoryId),
        index("idx_project_technology_slug").on(table.slug),
        index("idx_project_technology_order_index").on(table.orderIndex),
        index("idx_project_technology_is_active").on(table.isActive),
    ],
);

export const projectsV2 = pgTable(
    "project_v2",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        slug: text("slug").notNull().unique(),
        title: text("title").notNull(),
        shortDescription: varchar("short_description", { length: 200 }),
        description: text("description").notNull(),
        technologies: text("technologies").array().notNull().default([]),
        generationType: text("generation_type").notNull(),
        primaryLanguageOrFramework: text("primary_language_or_framework"),
        difficulty: projectV2DifficultyEnum("difficulty").notNull(),
        visibility: projectV2VisibilityEnum("visibility").notNull().default("PRIVATE"),
        estimatedHours: integer("estimated_hours").notNull().default(20),
        includeAssessment: boolean("include_assessment").notNull().default(false),
        isPlatformSeeded: boolean("is_platform_seeded").notNull().default(false),
        projectSource: text("project_source").notNull().default("AI_GENERATED"),
        guidedModeEnabled: boolean("guided_mode_enabled").notNull().default(true),
        blueprintOverview: text("blueprint_overview").notNull(),
        vision: text("vision"),
        targetAudience: text("target_audience"),
        problemSolution: text("problem_solution"),
        estimatedDuration: text("estimated_duration"),
        keyOutcomes: text("key_outcomes").array().notNull().default([]),
        recruiterSignal: text("recruiter_signal"),
        features: jsonb("features"),
        technicalRequirements: jsonb("technical_requirements"),
        dataArchitecture: jsonb("data_architecture"),
        projectStructure: jsonb("project_structure"),
        setupGuide: jsonb("setup_guide"),
        stacks: jsonb("stacks").notNull(),
        assistantEcho: jsonb("assistant_echo").notNull(),
        assistantRaw: jsonb("assistant_raw").notNull(),
        totalStarted: integer("total_started").notNull().default(0),
        totalCompleted: integer("total_completed").notNull().default(0),
        totalSubmissions: integer("total_submissions").notNull().default(0),
        totalViews: integer("total_views").notNull().default(0),
        createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
        isUniversityProject: boolean("is_university_project").notNull().default(false),
        universityId: text("university_id"),
        teacherMemberId: text("teacher_member_id"),
        classIds: text("class_ids").array().notNull().default([]),
        assignmentDeadline: timestamp("assignment_deadline"),
        assignmentCredits: integer("assignment_credits"),
        assignmentInstructions: text("assignment_instructions"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_created_by").on(table.createdBy),
        index("idx_project_v2_visibility").on(table.visibility),
        index("idx_project_v2_difficulty").on(table.difficulty),
        index("idx_project_v2_created_at").on(table.createdAt),
        index("idx_project_v2_slug").on(table.slug),
        index("idx_project_v2_is_platform_seeded").on(table.isPlatformSeeded),
        index("idx_project_v2_project_source").on(table.projectSource),
        index("idx_project_v2_university_id").on(table.universityId),
        index("idx_project_v2_is_university_project").on(table.isUniversityProject),
    ],
);

export const projectV2Pages = pgTable(
    "project_v2_page",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        difficulty: projectV2DifficultyEnum("difficulty").notNull(),
        coreFeatures: text("core_features").array().notNull().default([]),
        recommendedComponents: text("recommended_components").array().notNull().default([]),
        orderIndex: integer("order_index").notNull().default(0),
        route: text("route"),
        purpose: text("purpose"),
        estimatedTime: text("estimated_time"),
        layout: jsonb("layout"),
        components: jsonb("components"),
        userInteractions: text("user_interactions").array().notNull().default([]),
        dataNeeded: text("data_needed").array().notNull().default([]),
    },
    (table) => [
        index("idx_project_v2_page_project_id").on(table.projectId),
        index("idx_project_v2_page_order_index").on(table.orderIndex),
    ],
);

export const projectV2Sprints = pgTable(
    "project_v2_sprint",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        sprintNumber: integer("sprint_number").notNull(),
        name: text("name").notNull(),
        goal: text("goal").notNull(),
        duration: text("duration").notNull(),
        orderIndex: integer("order_index").notNull().default(0),
        createdBy: text("created_by").references(() => users.id),
        isApproved: boolean("is_approved").notNull().default(true),
        isPersonal: boolean("is_personal").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_project_v2_sprint_project_id_sprint_number").on(table.projectId, table.sprintNumber),
        index("idx_project_v2_sprint_project_id").on(table.projectId),
        index("idx_project_v2_sprint_order_index").on(table.orderIndex),
        index("idx_project_v2_sprint_project_id_order_index").on(table.projectId, table.orderIndex),
        index("idx_project_v2_sprint_created_by").on(table.createdBy),
    ],
);

export const projectV2Tasks = pgTable(
    "project_v2_task",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        sprintId: text("sprint_id").notNull().references(() => projectV2Sprints.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description").array().notNull().default([]),
        criteria: text("criteria").array().notNull().default([]),
        hints: text("hints").array().notNull().default([]),
        badges: text("badges").array().notNull().default([]),
        tags: text("tags").array().notNull().default([]),
        difficulty: projectV2DifficultyEnum("difficulty").notNull(),
        orderIndex: integer("order_index").notNull().default(0),
        terminalCommand: text("terminal_command"),
        category: text("category"),
        estimatedTime: text("estimated_time"),
        checkpoints: text("checkpoints").array().notNull().default([]),
        relatedPages: text("related_pages").array().notNull().default([]),
        dependencies: text("dependencies").array().notNull().default([]),
        learningObjectives: text("learning_objectives").array().notNull().default([]),
        prerequisites: text("prerequisites").array().notNull().default([]),
        resources: jsonb("resources"),
        testingGuidelines: text("testing_guidelines").array().notNull().default([]),
        learns: jsonb("learns"),
        assessmentType: taskAssessmentTypeEnum("assessment_type").notNull().default("QUIZ"),
        projectV2Id: text("project_v2_id").references(() => projectsV2.id),
        createdBy: text("created_by"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_task_sprint_id").on(table.sprintId),
        index("idx_project_v2_task_order_index").on(table.orderIndex),
        index("idx_project_v2_task_difficulty").on(table.difficulty),
        index("idx_project_v2_task_category").on(table.category),
        index("idx_project_v2_task_sprint_id_order_index").on(table.sprintId, table.orderIndex),
        index("idx_project_v2_task_assessment_type").on(table.assessmentType),
    ],
);

export const userProjectV2Progress = pgTable(
    "user_project_v2_progress",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        status: userProjectV2StatusEnum("status").notNull().default("NOT_STARTED"),
        tasksCompleted: integer("tasks_completed").notNull().default(0),
        totalTasks: integer("total_tasks").notNull().default(0),
        progressPercentage: real("progress_percentage").notNull().default(0),
        totalScore: real("total_score").notNull().default(0),
        tasksScore: real("tasks_score").notNull().default(0),
        quizScore: real("quiz_score").notNull().default(0),
        mockScore: real("mock_score").notNull().default(0),
        startedAt: timestamp("started_at"),
        submittedAt: timestamp("submitted_at"),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_user_project_v2_progress_user_id_project_id").on(table.userId, table.projectId),
        index("idx_user_project_v2_progress_user_id").on(table.userId),
        index("idx_user_project_v2_progress_project_id").on(table.projectId),
        index("idx_user_project_v2_progress_status").on(table.status),
        index("idx_user_project_v2_progress_total_score").on(table.totalScore),
    ],
);

export const userTaskV2Statuses = pgTable(
    "user_task_v2_status",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        taskId: text("task_id").notNull().references(() => projectV2Tasks.id, { onDelete: "cascade" }),
        progressId: text("progress_id").notNull().references(() => userProjectV2Progress.id, { onDelete: "cascade" }),
        status: taskKanbanStatusEnum("status").notNull().default("TO_DO"),
        completedAt: timestamp("completed_at"),
        notes: text("notes"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_user_task_v2_status_user_id_task_id").on(table.userId, table.taskId),
        index("idx_user_task_v2_status_user_id").on(table.userId),
        index("idx_user_task_v2_status_task_id").on(table.taskId),
        index("idx_user_task_v2_status_project_id").on(table.projectId),
        index("idx_user_task_v2_status_progress_id").on(table.progressId),
        index("idx_user_task_v2_status_status").on(table.status),
    ],
);

export const projectV2Quizzes = pgTable(
    "project_v2_quiz",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        projectId: text("project_id").notNull().unique().references(() => projectsV2.id, { onDelete: "cascade" }),
        totalQuestions: integer("total_questions").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
);

export const projectV2QuizQuestions = pgTable(
    "project_v2_quiz_question",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        quizId: text("quiz_id").notNull().references(() => projectV2Quizzes.id, { onDelete: "cascade" }),
        orderIndex: integer("order_index").notNull().default(0),
        difficulty: quizV2DifficultyEnum("difficulty").notNull(),
        prompt: text("prompt").notNull(),
        options: text("options").array().notNull().default([]),
        correctAnswer: integer("correct_answer").notNull(),
        explanation: text("explanation").notNull(),
    },
    (table) => [
        index("idx_project_v2_quiz_question_quiz_id").on(table.quizId),
        index("idx_project_v2_quiz_question_order_index").on(table.orderIndex),
        index("idx_project_v2_quiz_question_difficulty").on(table.difficulty),
    ],
);

export const projectV2KnowledgeBases = pgTable(
    "project_v2_knowledge_base",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        projectId: text("project_id").notNull().unique().references(() => projectsV2.id, { onDelete: "cascade" }),
        points: text("points").array().notNull().default([]),
        mockKnowledgeBase: text("mock_knowledge_base"),
        mockQuestionsData: jsonb("mock_questions_data"),
        mockGeneratedAt: timestamp("mock_generated_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
);

export const projectV2Submissions = pgTable(
    "project_v2_submission",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        githubUrl: text("github_url").notNull(),
        liveUrl: text("live_url"),
        notes: text("notes"),
        status: text("status").notNull().default("PENDING"),
        scores: jsonb("scores"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_submission_user_id").on(table.userId),
        index("idx_project_v2_submission_project_id").on(table.projectId),
        index("idx_project_v2_submission_status").on(table.status),
    ],
);

export const projectV2QuizAttempts = pgTable(
    "project_v2_quiz_attempt",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        quizId: text("quiz_id").notNull().references(() => projectV2Quizzes.id, { onDelete: "cascade" }),
        score: integer("score").notNull().default(0),
        totalQuestions: integer("total_questions").notNull().default(0),
        correctAnswers: integer("correct_answers").notNull().default(0),
        timeSpent: integer("time_spent"),
        isCompleted: boolean("is_completed").notNull().default(false),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_project_v2_quiz_attempt_user_id_quiz_id").on(table.userId, table.quizId),
        index("idx_project_v2_quiz_attempt_user_id").on(table.userId),
        index("idx_project_v2_quiz_attempt_project_id").on(table.projectId),
        index("idx_project_v2_quiz_attempt_quiz_id").on(table.quizId),
        index("idx_project_v2_quiz_attempt_is_completed").on(table.isCompleted),
    ],
);

export const projectV2QuizAnswers = pgTable(
    "project_v2_quiz_answer",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        attemptId: text("attempt_id").notNull().references(() => projectV2QuizAttempts.id, { onDelete: "cascade" }),
        questionId: text("question_id").notNull().references(() => projectV2QuizQuestions.id, { onDelete: "cascade" }),
        selectedAnswer: integer("selected_answer").notNull(),
        isCorrect: boolean("is_correct").notNull().default(false),
        timeSpent: integer("time_spent"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_project_v2_quiz_answer_attempt_id_question_id").on(table.attemptId, table.questionId),
        index("idx_project_v2_quiz_answer_attempt_id").on(table.attemptId),
        index("idx_project_v2_quiz_answer_question_id").on(table.questionId),
        index("idx_project_v2_quiz_answer_is_correct").on(table.isCorrect),
    ],
);

/**
 * See `mock_voice_session` in ./mock.ts - there are TWO mock-session tables on
 * purpose, and plan/mock-consolidation/overview.md argues why.
 *
 * Short version: the ElevenLabs session lifecycle is shared between them (via
 * utils/elevenlabs/conversations.ts), but this table is about the user's OWN
 * project - projectId, sprintId, and scores for work they actually did - while
 * `mock_voice_session` is about a priced, publicly listed, rated scenario.
 * Merging them leaves half the columns null for half the rows.
 */
export const projectV2MockSessions = pgTable(
    "project_v2_mock_session",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        sessionType: mockSessionTypeEnum("session_type").notNull().default("PROJECT_FINAL"),
        sprintId: text("sprint_id").references(() => projectV2Sprints.id, { onDelete: "cascade" }),
        agentId: text("agent_id"),
        conversationId: text("conversation_id"),
        duration: integer("duration"),
        score: integer("score"),
        technicalScore: integer("technical_score"),
        communicationScore: integer("communication_score"),
        learnualScore: integer("learnual_score"),
        transcript: text("transcript"),
        feedback: text("feedback"),
        strengths: text("strengths").array().notNull().default([]),
        improvements: text("improvements").array().notNull().default([]),
        status: text("status").notNull().default("SCHEDULED"),
        scheduledAt: timestamp("scheduled_at"),
        startedAt: timestamp("started_at"),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_mock_session_user_id").on(table.userId),
        index("idx_project_v2_mock_session_project_id").on(table.projectId),
        index("idx_project_v2_mock_session_sprint_id").on(table.sprintId),
        index("idx_project_v2_mock_session_status").on(table.status),
        index("idx_project_v2_mock_session_completed_at").on(table.completedAt),
        index("idx_project_v2_mock_session_session_type").on(table.sessionType),
    ],
);

export const userTaskV2Assessments = pgTable(
    "user_task_v2_assessment",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        taskId: text("task_id").notNull().references(() => projectV2Tasks.id, { onDelete: "cascade" }),
        assessmentType: taskAssessmentTypeEnum("assessment_type").notNull(),
        quizQuestions: jsonb("quiz_questions"),
        quizAnswers: jsonb("quiz_answers"),
        quizScore: integer("quiz_score"),
        correctAnswers: integer("correct_answers").notNull().default(0),
        totalQuestions: integer("total_questions").notNull().default(0),
        codeSubmission: text("code_submission"),
        codeLanguage: text("code_language"),
        codeValidation: jsonb("code_validation"),
        codeScore: integer("code_score"),
        passed: boolean("passed").notNull().default(false),
        attempts: integer("attempts").notNull().default(1),
        timeSpent: integer("time_spent"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_user_task_v2_assessment_user_id_task_id").on(table.userId, table.taskId),
        index("idx_user_task_v2_assessment_user_id").on(table.userId),
        index("idx_user_task_v2_assessment_task_id").on(table.taskId),
        index("idx_user_task_v2_assessment_assessment_type").on(table.assessmentType),
        index("idx_user_task_v2_assessment_passed").on(table.passed),
    ],
);
export const projectV2Resources = pgTable(
    "project_v2_resource",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        title: varchar("title", { length: 200 }).notNull(),
        link: text("link").notNull(),
        type: resourceTypeEnum("type").notNull(),
        description: text("description"),
        helpfulCount: integer("helpful_count").notNull().default(0),
        markedHelpfulBy: text("marked_helpful_by").array().notNull().default([]),
        views: integer("views").notNull().default(0),
        isOfficial: boolean("is_official").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_resource_user_id").on(table.userId),
        index("idx_project_v2_resource_project_id").on(table.projectId),
        index("idx_project_v2_resource_type").on(table.type),
        index("idx_project_v2_resource_created_at").on(table.createdAt),
        index("idx_project_v2_resource_helpful_count").on(table.helpfulCount),
    ],
);
export const projectV2TaskDetails = pgTable(
    "project_v2_task_detail",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        taskId: text("task_id").notNull().unique().references(() => projectV2Tasks.id, { onDelete: "cascade" }),
        subTasks: jsonb("sub_tasks").notNull(),
        commonErrors: text("common_errors").array().notNull().default([]),
        errorsToWatchout: text("errors_to_watchout").array().notNull().default([]),
        relatedTasks: jsonb("related_tasks").notNull(),
        generatedBy: text("generated_by").notNull(),
        generatedAt: timestamp("generated_at").notNull().defaultNow(),
        generationCost: integer("generation_cost").notNull().default(1),
        accessCount: integer("access_count").notNull().default(1),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_task_detail_task_id").on(table.taskId),
    ],
);

export const userTaskV2DetailAccesses = pgTable(
    "user_task_v2_detail_access",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        taskDetailId: text("task_detail_id").notNull().references(() => projectV2TaskDetails.id, { onDelete: "cascade" }),
        creditsPaid: integer("credits_paid").notNull().default(1),
        accessedAt: timestamp("accessed_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_user_task_v2_detail_access_user_id_task_detail_id").on(table.userId, table.taskDetailId),
        index("idx_user_task_v2_detail_access_user_id").on(table.userId),
        index("idx_user_task_v2_detail_access_task_detail_id").on(table.taskDetailId),
    ],
);

export const projectV2StandupConfigs = pgTable(
    "project_v2_standup_config",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull(),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        daysPerWeek: integer("days_per_week").notNull(),
        standupTime: text("standup_time").notNull(),
        durationMinutes: integer("duration_minutes").notNull().default(10),
        selectedDays: integer("selected_days").array().notNull().default([]),
        creditsPerDay: integer("credits_per_day").notNull().default(5),
        weeklyCredits: integer("weekly_credits").notNull(),
        isActive: boolean("is_active").notNull().default(true),
        currentWeekStart: timestamp("current_week_start").notNull().defaultNow(),
        currentWeekEnd: timestamp("current_week_end").notNull(),
        totalStandups: integer("total_standups").notNull().default(0),
        completedStandups: integer("completed_standups").notNull().default(0),
        missedStandups: integer("missed_standups").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_project_v2_standup_config_user_id_project_id").on(table.userId, table.projectId),
        index("idx_project_v2_standup_config_user_id").on(table.userId),
        index("idx_project_v2_standup_config_project_id").on(table.projectId),
        index("idx_project_v2_standup_config_is_active").on(table.isActive),
    ],
);

export const projectV2StandupEntries = pgTable(
    "project_v2_standup_entry",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        configId: text("config_id").notNull().references(() => projectV2StandupConfigs.id, { onDelete: "cascade" }),
        scheduledFor: timestamp("scheduled_for").notNull(),
        submittedAt: timestamp("submitted_at"),
        whatDidYesterday: text("what_did_yesterday"),
        whatDoingToday: text("what_doing_today"),
        anyBlockers: text("any_blockers"),
        recordingUrl: text("recording_url"),
        durationSeconds: integer("duration_seconds"),
        status: text("status").notNull().default("SCHEDULED"),
        aiSummary: text("ai_summary"),
        aiSuggestions: text("ai_suggestions").array().notNull().default([]),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_project_v2_standup_entry_config_id").on(table.configId),
        index("idx_project_v2_standup_entry_scheduled_for").on(table.scheduledFor),
        index("idx_project_v2_standup_entry_status").on(table.status),
    ],
);

export const projectIdeas = pgTable(
    "project_idea",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        projectTitle: text("project_title").notNull(),
        projectDescription: text("project_description").notNull(),
        generationType: text("generation_type").notNull(),
        difficulty: text("difficulty").notNull(),
        primaryLanguageOrFramework: text("primary_language_or_framework"),
        technologies: text("technologies").array().notNull().default([]),
        categories: text("categories").array().notNull().default([]),
        technology: text("technology"),
        ideaType: ideaTypeEnum("idea_type").notNull().default("TECHNOLOGY_SPECIFIC"),
        overview: text("overview"),
        coreRequirements: text("core_requirements").array().notNull().default([]),
        engineeringConstraints: text("engineering_constraints").array().notNull().default([]),
        suggestedStacks: jsonb("suggested_stacks"),
        recruiterSignal: text("recruiter_signal"),
        isPlatformCurated: boolean("is_platform_curated").notNull().default(false),
        curatedQuality: text("curated_quality"),
        buildCount: integer("build_count").notNull().default(0),
        images: text("images").array().notNull().default([]),
        figmaLinks: text("figma_links").array().notNull().default([]),
        resourceLinks: text("resource_links").array().notNull().default([]),
        stacks: jsonb("stacks"),
        blueprintProjectId: text("blueprint_project_id").unique().references(() => projectsV2.id),
        hasBlueprintGenerated: boolean("has_blueprint_generated").notNull().default(false),
        blueprintGeneratedAt: timestamp("blueprint_generated_at"),
        status: projectIdeaStatusEnum("status").notNull().default("PENDING"),
        submittedById: text("submitted_by_id").references(() => users.id),
        isUserSubmitted: boolean("is_user_submitted").notNull().default(false),
        // Denormalised for the same reason `upvotes` is: the ideas grid renders a
        // count on every card and must not pay for a join per card. Kept in step
        // inside the same transaction as the comment insert/soft-delete.
        commentCount: integer("comment_count").notNull().default(0),
        views: integer("views").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
        approvedAt: timestamp("approved_at"),
    },
    (table) => [
        index("idx_project_idea_technology").on(table.technology),
        index("idx_project_idea_status").on(table.status),
        index("idx_project_idea_difficulty").on(table.difficulty),
        index("idx_project_idea_submitted_by_id").on(table.submittedById),
        index("idx_project_idea_created_at").on(table.createdAt),
        index("idx_project_idea_has_blueprint_generated").on(table.hasBlueprintGenerated),
        index("idx_project_idea_idea_type").on(table.ideaType),
        index("idx_project_idea_is_platform_curated").on(table.isPlatformCurated),
    ],
);
export const projectV2Errors = pgTable(
    "project_v2_error",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        title: varchar("title", { length: 200 }).notNull(),
        description: text("description").notNull(),
        solution: text("solution").notNull(),
        severity: projectErrorSeverityEnum("severity").notNull().default("MEDIUM"),
        category: projectErrorCategoryEnum("category").notNull().default("OTHER"),
        taskId: text("task_id").references(() => projectV2Tasks.id, { onDelete: "set null" }),
        errorCode: text("error_code"),
        fixedCode: text("fixed_code"),
        tags: text("tags").array().notNull().default([]),
        status: projectErrorStatusEnum("status").notNull().default("PENDING"),
        submittedById: text("submitted_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        isAIGenerated: boolean("is_ai_generated").notNull().default(false),
        helpfulCount: integer("helpful_count").notNull().default(0),
        encounteredCount: integer("encountered_count").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
        approvedAt: timestamp("approved_at"),
    },
    (table) => [
        index("idx_project_v2_error_project_id").on(table.projectId),
        index("idx_project_v2_error_task_id").on(table.taskId),
        index("idx_project_v2_error_severity").on(table.severity),
        index("idx_project_v2_error_category").on(table.category),
        index("idx_project_v2_error_status").on(table.status),
        index("idx_project_v2_error_submitted_by_id").on(table.submittedById),
        index("idx_project_v2_error_helpful_count").on(table.helpfulCount),
        index("idx_project_v2_error_created_at").on(table.createdAt),
    ],
);
export const projectV2GuidedSessions = pgTable(
    "project_v2_guided_session",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        projectId: text("project_id").notNull().references(() => projectsV2.id, { onDelete: "cascade" }),
        currentSprintIndex: integer("current_sprint_index").notNull().default(0),
        currentTaskIndex: integer("current_task_index").notNull().default(0),
        currentStepIndex: integer("current_step_index").notNull().default(0),
        conversationHistory: jsonb("conversation_history"),
        isActive: boolean("is_active").notNull().default(true),
        mode: text("mode").notNull().default("GUIDED"),
        systemContext: text("system_context"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_project_v2_guided_session_user_id_project_id").on(table.userId, table.projectId),
        index("idx_project_v2_guided_session_user_id").on(table.userId),
        index("idx_project_v2_guided_session_project_id").on(table.projectId),
        index("idx_project_v2_guided_session_is_active").on(table.isActive),
    ],
);

// ===========================
// Relations
// ===========================

export const projectCategoriesRelations = relations(projectCategories, ({ many }) => ({
    technologies: many(projectTechnologies),
}));

export const projectTechnologiesRelations = relations(projectTechnologies, ({ one }) => ({
    category: one(projectCategories, {
        fields: [projectTechnologies.categoryId],
        references: [projectCategories.id],
    }),
}));

export const projectsV2Relations = relations(projectsV2, ({ one, many }) => ({
    creator: one(users, {
        fields: [projectsV2.createdBy],
        references: [users.id],
    }),
    pages: many(projectV2Pages),
    sprints: many(projectV2Sprints),
    tasks: many(projectV2Tasks),
    userProgress: many(userProjectV2Progress),
    quiz: one(projectV2Quizzes),
    knowledgeBase: one(projectV2KnowledgeBases),
    submissions: many(projectV2Submissions),
    quizAttempts: many(projectV2QuizAttempts),
    mockSessions: many(projectV2MockSessions),
    resources: many(projectV2Resources),
    blueprintIdea: one(projectIdeas),
    errors: many(projectV2Errors),
    guidedSessions: many(projectV2GuidedSessions),
    standupConfigs: many(projectV2StandupConfigs),
}));

export const projectV2PagesRelations = relations(projectV2Pages, ({ one }) => ({
    project: one(projectsV2, {
        fields: [projectV2Pages.projectId],
        references: [projectsV2.id],
    }),
}));

export const projectV2SprintsRelations = relations(projectV2Sprints, ({ one, many }) => ({
    project: one(projectsV2, {
        fields: [projectV2Sprints.projectId],
        references: [projectsV2.id],
    }),
    creator: one(users, {
        fields: [projectV2Sprints.createdBy],
        references: [users.id],
        relationName: "SprintCreator",
    }),
    tasks: many(projectV2Tasks),
    mockSessions: many(projectV2MockSessions),
}));

export const projectV2TasksRelations = relations(projectV2Tasks, ({ one, many }) => ({
    sprint: one(projectV2Sprints, {
        fields: [projectV2Tasks.sprintId],
        references: [projectV2Sprints.id],
    }),
    projectV2: one(projectsV2, {
        fields: [projectV2Tasks.projectV2Id],
        references: [projectsV2.id],
    }),
    userStatuses: many(userTaskV2Statuses),
    assessments: many(userTaskV2Assessments),
    taskDetail: one(projectV2TaskDetails),
    errors: many(projectV2Errors),
}));

export const userProjectV2ProgressRelations = relations(userProjectV2Progress, ({ one, many }) => ({
    user: one(users, {
        fields: [userProjectV2Progress.userId],
        references: [users.id],
    }),
    project: one(projectsV2, {
        fields: [userProjectV2Progress.projectId],
        references: [projectsV2.id],
    }),
    taskStatuses: many(userTaskV2Statuses),
}));

export const userTaskV2StatusesRelations = relations(userTaskV2Statuses, ({ one }) => ({
    user: one(users, {
        fields: [userTaskV2Statuses.userId],
        references: [users.id],
    }),
    project: one(projectsV2, {
        fields: [userTaskV2Statuses.projectId],
        references: [projectsV2.id],
    }),
    task: one(projectV2Tasks, {
        fields: [userTaskV2Statuses.taskId],
        references: [projectV2Tasks.id],
    }),
    progress: one(userProjectV2Progress, {
        fields: [userTaskV2Statuses.progressId],
        references: [userProjectV2Progress.id],
    }),
}));

export const projectV2QuizzesRelations = relations(projectV2Quizzes, ({ one, many }) => ({
    project: one(projectsV2, {
        fields: [projectV2Quizzes.projectId],
        references: [projectsV2.id],
    }),
    questions: many(projectV2QuizQuestions),
    attempts: many(projectV2QuizAttempts),
}));

export const projectV2QuizQuestionsRelations = relations(projectV2QuizQuestions, ({ one, many }) => ({
    quiz: one(projectV2Quizzes, {
        fields: [projectV2QuizQuestions.quizId],
        references: [projectV2Quizzes.id],
    }),
    answers: many(projectV2QuizAnswers),
}));

export const projectV2KnowledgeBasesRelations = relations(projectV2KnowledgeBases, ({ one }) => ({
    project: one(projectsV2, {
        fields: [projectV2KnowledgeBases.projectId],
        references: [projectsV2.id],
    }),
}));

export const projectV2SubmissionsRelations = relations(projectV2Submissions, ({ one }) => ({
    user: one(users, {
        fields: [projectV2Submissions.userId],
        references: [users.id],
    }),
    project: one(projectsV2, {
        fields: [projectV2Submissions.projectId],
        references: [projectsV2.id],
    }),
}));

export const projectV2QuizAttemptsRelations = relations(projectV2QuizAttempts, ({ one, many }) => ({
    user: one(users, {
        fields: [projectV2QuizAttempts.userId],
        references: [users.id],
    }),
    project: one(projectsV2, {
        fields: [projectV2QuizAttempts.projectId],
        references: [projectsV2.id],
    }),
    quiz: one(projectV2Quizzes, {
        fields: [projectV2QuizAttempts.quizId],
        references: [projectV2Quizzes.id],
    }),
    answers: many(projectV2QuizAnswers),
}));

export const projectV2QuizAnswersRelations = relations(projectV2QuizAnswers, ({ one }) => ({
    attempt: one(projectV2QuizAttempts, {
        fields: [projectV2QuizAnswers.attemptId],
        references: [projectV2QuizAttempts.id],
    }),
    question: one(projectV2QuizQuestions, {
        fields: [projectV2QuizAnswers.questionId],
        references: [projectV2QuizQuestions.id],
    }),
}));

export const projectV2MockSessionsRelations = relations(projectV2MockSessions, ({ one }) => ({
    user: one(users, {
        fields: [projectV2MockSessions.userId],
        references: [users.id],
    }),
    project: one(projectsV2, {
        fields: [projectV2MockSessions.projectId],
        references: [projectsV2.id],
    }),
    sprint: one(projectV2Sprints, {
        fields: [projectV2MockSessions.sprintId],
        references: [projectV2Sprints.id],
    }),
}));

export const userTaskV2AssessmentsRelations = relations(userTaskV2Assessments, ({ one }) => ({
    user: one(users, {
        fields: [userTaskV2Assessments.userId],
        references: [users.id],
        relationName: "UserTaskAssessments",
    }),
    task: one(projectV2Tasks, {
        fields: [userTaskV2Assessments.taskId],
        references: [projectV2Tasks.id],
    }),
}));
export const projectV2ResourcesRelations = relations(projectV2Resources, ({ one }) => ({
    user: one(users, {
        fields: [projectV2Resources.userId],
        references: [users.id],
        relationName: "ProjectV2Resources",
    }),
    project: one(projectsV2, {
        fields: [projectV2Resources.projectId],
        references: [projectsV2.id],
        relationName: "ProjectV2Resources",
    }),
}));
export const projectV2TaskDetailsRelations = relations(projectV2TaskDetails, ({ one, many }) => ({
    task: one(projectV2Tasks, {
        fields: [projectV2TaskDetails.taskId],
        references: [projectV2Tasks.id],
    }),
    accesses: many(userTaskV2DetailAccesses),
}));

export const userTaskV2DetailAccessesRelations = relations(userTaskV2DetailAccesses, ({ one }) => ({
    user: one(users, {
        fields: [userTaskV2DetailAccesses.userId],
        references: [users.id],
        relationName: "UserTaskDetailAccess",
    }),
    taskDetail: one(projectV2TaskDetails, {
        fields: [userTaskV2DetailAccesses.taskDetailId],
        references: [projectV2TaskDetails.id],
    }),
}));

export const projectV2StandupConfigsRelations = relations(projectV2StandupConfigs, ({ one, many }) => ({
    project: one(projectsV2, {
        fields: [projectV2StandupConfigs.projectId],
        references: [projectsV2.id],
    }),
    entries: many(projectV2StandupEntries),
}));

export const projectV2StandupEntriesRelations = relations(projectV2StandupEntries, ({ one }) => ({
    config: one(projectV2StandupConfigs, {
        fields: [projectV2StandupEntries.configId],
        references: [projectV2StandupConfigs.id],
    }),
}));

export const projectRecommendation = pgTable(
    "project_recommendation",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        // Ordered: the model's order is the recommendation. Ids are checked against
        // the live catalogue on every read, so an idea retired later drops out.
        items: jsonb("items").$type<RecommendedIdea[]>().notNull().default([]),
        /** The onboarding this was built from, so a retake can be seen to be newer. */
        onboardingVersion: integer("onboarding_version"),
        level: text("level"),
        generatedAt: timestamp("generated_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_project_recommendation_user_id").on(table.userId),
    ],
);

export const projectIdeasRelations = relations(projectIdeas, ({ one, many }) => ({
    submittedBy: one(users, {
        fields: [projectIdeas.submittedById],
        references: [users.id],
        relationName: "SubmittedProjectIdeas",
    }),
    blueprintProject: one(projectsV2, {
        fields: [projectIdeas.blueprintProjectId],
        references: [projectsV2.id],
        relationName: "IdeaBlueprint",
    }),
}));
export const projectV2ErrorsRelations = relations(projectV2Errors, ({ one, many }) => ({
    project: one(projectsV2, {
        fields: [projectV2Errors.projectId],
        references: [projectsV2.id],
        relationName: "ProjectV2Errors",
    }),
    task: one(projectV2Tasks, {
        fields: [projectV2Errors.taskId],
        references: [projectV2Tasks.id],
        relationName: "TaskErrors",
    }),
    submittedBy: one(users, {
        fields: [projectV2Errors.submittedById],
        references: [users.id],
        relationName: "SubmittedProjectErrors",
    }),
}));
export const projectV2GuidedSessionsRelations = relations(projectV2GuidedSessions, ({ one }) => ({
    user: one(users, {
        fields: [projectV2GuidedSessions.userId],
        references: [users.id],
        relationName: "UserGuidedSessions",
    }),
    project: one(projectsV2, {
        fields: [projectV2GuidedSessions.projectId],
        references: [projectsV2.id],
        relationName: "ProjectGuidedSessions",
    }),
}));
