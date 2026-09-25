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
import { companies, companyMembers } from "./hiring";
import { interviewProcesses } from "./jobmock";

// ===========================
// Enums
// ===========================

export const jobLocationTypeEnum = pgEnum("job_location_type", [
    "REMOTE",
    "HYBRID",
    "ONSITE",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "INTERNSHIP",
    "FREELANCE",
]);

export const jobStatusEnum = pgEnum("job_status", [
    "DRAFT",
    "ACTIVE",
    "PAUSED",
    "CLOSED",
    "FILLED",
]);

export const jobVisibilityEnum = pgEnum("job_visibility", [
    "PUBLIC",
    "INVITE_ONLY",
]);

export const applicationStatusEnum = pgEnum("application_status", [
    "INTERESTED",
    "PREPARING",
    "APPLIED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "ASSIGNMENT_SENT",
    "ASSIGNMENT_SUBMITTED",
    "INTERVIEW_SCHEDULED",
    "INTERVIEWED",
    "OFFER_EXTENDED",
    "HIRED",
    "REJECTED",
    "WITHDRAWN",
]);

export const applicationActivityTypeEnum = pgEnum("application_activity_type", [
    "MOCK_INTERVIEW",
    "AI_RESUME_REVIEW",
    "Learn_REVIEW",
    "PROJECT_PROGRESS",
    "STUDIO_NOTE",
    "SKILL_ASSESSMENT",
    "ASSIGNMENT_PROGRESS",
    "ASSIGNMENT_SUBMISSION",
]);

// ===========================
// Tables
// ===========================

export const jobs = pgTable(
    "job",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        postedById: text("posted_by_id")
            .notNull()
            .references(() => companyMembers.id),
        title: text("title").notNull(),
        slug: text("slug").notNull().unique(),
        description: text("description").notNull(),
        requirements: jsonb("requirements"),
        responsibilities: jsonb("responsibilities"),
        benefits: jsonb("benefits"),
        location: text("location"),
        locationType: jobLocationTypeEnum("location_type").notNull().default("REMOTE"),
        employmentType: employmentTypeEnum("employment_type").notNull().default("FULL_TIME"),
        experienceMin: integer("experience_min"),
        experienceMax: integer("experience_max"),
        salaryMin: integer("salary_min"),
        salaryMax: integer("salary_max"),
        salaryCurrency: text("salary_currency").notNull().default("INR"),
        salaryDisclosed: boolean("salary_disclosed").notNull().default(true),
        skillsRequired: jsonb("skills_required").notNull().default([]),
        skillsPreferred: jsonb("skills_preferred").notNull().default([]),
        hasAssignment: boolean("has_assignment").notNull().default(false),
        assignmentStudioId: text("assignment_studio_id"),
        assignmentProjectId: text("assignment_project_id"),
        assignmentDeadlineDays: integer("assignment_deadline_days"),
        evaluationCriteria: jsonb("evaluation_criteria"),
        assignmentDetails: jsonb("assignment_details"),
        assignmentInstructions: text("assignment_instructions"),
        customQuestions: jsonb("custom_questions").default([]),
        status: jobStatusEnum("status").notNull().default("DRAFT"),
        visibility: jobVisibilityEnum("visibility").notNull().default("PUBLIC"),
        featured: boolean("featured").notNull().default(false),
        viewsCount: integer("views_count").notNull().default(0),
        applicationsCount: integer("applications_count").notNull().default(0),
        matchingCriteria: jsonb("matching_criteria"),
        /** The job's pipeline (plan/hiring-rounds HR-1, HR-12). A real FK since HR-1. */
        interviewProcessId: text("interview_process_id").references(() => interviewProcesses.id, { onDelete: "set null" }),
        expiresAt: timestamp("expires_at"),
        publishedAt: timestamp("published_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_job_company_id").on(table.companyId),
        index("idx_job_slug").on(table.slug),
        index("idx_job_status").on(table.status),
        index("idx_job_location_type").on(table.locationType),
        index("idx_job_employment_type").on(table.employmentType),
        index("idx_job_posted_by_id").on(table.postedById),
    ],
);

export const jobApplications = pgTable(
    "job_application",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        jobId: text("job_id")
            .notNull()
            .references(() => jobs.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        status: applicationStatusEnum("status").notNull().default("INTERESTED"),
        currentStage: integer("current_stage"),
        preparationStatus: jsonb("preparation_status")
            .notNull()
            .default({
                profile_complete: false,
                resume_reviewed: false,
                mock_interview_done: false,
                Learns_reviewed: false,
                assignment_started: false,
                assignment_completed: false,
            }),
        preparationScore: integer("preparation_score").notNull().default(0),
        isReadyToApply: boolean("is_ready_to_apply").notNull().default(false),
        assignmentProjectCloneId: text("assignment_project_clone_id"),
        assignmentStartedAt: timestamp("assignment_started_at"),
        assignmentSubmittedAt: timestamp("assignment_submitted_at"),
        assignmentScore: integer("assignment_score"),
        assignmentFeedback: text("assignment_feedback"),
        interviewId: text("interview_id"),
        interviewScheduledAt: timestamp("interview_scheduled_at"),
        interviewCompletedAt: timestamp("interview_completed_at"),
        interviewFeedback: jsonb("interview_feedback"),
        // reviewedById references CompanyMember but is plain text to avoid circular imports
        reviewedById: text("reviewed_by_id"),
        reviewedAt: timestamp("reviewed_at"),
        rejectionReason: text("rejection_reason"),
        hrNotes: text("hr_notes"),
        matchScore: integer("match_score"),
        coverLetter: text("cover_letter"),
        resumeUrl: text("resume_url"),
        customQuestionResponses: jsonb("custom_question_responses").default([]),
        appliedAt: timestamp("applied_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_job_application_job_id_user_id").on(table.jobId, table.userId),
        index("idx_job_application_job_id").on(table.jobId),
        index("idx_job_application_user_id").on(table.userId),
        index("idx_job_application_status").on(table.status),
        index("idx_job_application_reviewed_by_id").on(table.reviewedById),
    ],
);

export const applicationActivities = pgTable(
    "application_activity",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        applicationId: text("application_id")
            .notNull()
            .references(() => jobApplications.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        activityType: applicationActivityTypeEnum("activity_type").notNull(),
        activityId: text("activity_id"),
        metadata: jsonb("metadata"),
        score: integer("score"),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_application_activity_application_id").on(table.applicationId),
        index("idx_application_activity_user_id").on(table.userId),
        index("idx_application_activity_activity_type").on(table.activityType),
    ],
);

export const jobRecommendations = pgTable(
    "job_recommendation",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        jobId: text("job_id")
            .notNull()
            .references(() => jobs.id, { onDelete: "cascade" }),
        matchScore: integer("match_score").notNull(),
        matchReasons: jsonb("match_reasons"),
        isDismissed: boolean("is_dismissed").notNull().default(false),
        isSaved: boolean("is_saved").notNull().default(false),
        viewedAt: timestamp("viewed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_job_recommendation_user_id_job_id").on(table.userId, table.jobId),
        index("idx_job_recommendation_user_id").on(table.userId),
        index("idx_job_recommendation_job_id").on(table.jobId),
        index("idx_job_recommendation_match_score").on(table.matchScore),
    ],
);

export const savedJobs = pgTable(
    "saved_job",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        jobId: text("job_id")
            .notNull()
            .references(() => jobs.id, { onDelete: "cascade" }),
        notes: text("notes"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_saved_job_user_id_job_id").on(table.userId, table.jobId),
        index("idx_saved_job_user_id").on(table.userId),
    ],
);

// ===========================
// Relations
// ===========================

export const jobsRelations = relations(jobs, ({ one, many }) => ({
    company: one(companies, {
        fields: [jobs.companyId],
        references: [companies.id],
    }),
    postedBy: one(companyMembers, {
        fields: [jobs.postedById],
        references: [companyMembers.id],
        relationName: "PostedBy",
    }),
    applications: many(jobApplications),
    recommendations: many(jobRecommendations),
    savedBy: many(savedJobs),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
    user: one(users, {
        fields: [jobApplications.userId],
        references: [users.id],
        relationName: "UserJobApplications",
    }),
    job: one(jobs, {
        fields: [jobApplications.jobId],
        references: [jobs.id],
    }),
    activities: many(applicationActivities),
}));

export const applicationActivitiesRelations = relations(applicationActivities, ({ one }) => ({
    user: one(users, {
        fields: [applicationActivities.userId],
        references: [users.id],
        relationName: "UserApplicationActivities",
    }),
    application: one(jobApplications, {
        fields: [applicationActivities.applicationId],
        references: [jobApplications.id],
    }),
}));

export const jobRecommendationsRelations = relations(jobRecommendations, ({ one }) => ({
    user: one(users, {
        fields: [jobRecommendations.userId],
        references: [users.id],
        relationName: "UserJobRecommendations",
    }),
    job: one(jobs, {
        fields: [jobRecommendations.jobId],
        references: [jobs.id],
    }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
    user: one(users, {
        fields: [savedJobs.userId],
        references: [users.id],
        relationName: "UserSavedJobs",
    }),
    job: one(jobs, {
        fields: [savedJobs.jobId],
        references: [jobs.id],
    }),
}));
