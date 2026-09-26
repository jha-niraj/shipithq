import {
    pgTable,
    primaryKey,
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

// ===========================
// Enums
// ===========================

export const roleEnum = pgEnum("role", [
    "Student",
    "Admin",
    "HR",
    "UNI",
]);

export const contributionStatusEnum = pgEnum("contribution_status", [
    "InProgress",
    "Completed",
    "Abandoned",
]);

export const contributionTypeEnum = pgEnum("contribution_type", [
    "PR",
    "ISSUE",
    "COMMIT",
    "REVIEW",
    "COMMENT",
]);

export const openSourceDifficultyEnum = pgEnum("open_source_difficulty", [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
]);

export const issueDifficultyEnum = pgEnum("issue_difficulty", [
    "EASY",
    "MEDIUM",
    "HARD",
]);

export const syncStatusEnum = pgEnum("sync_status", [
    "PENDING",
    "SYNCING",
    "SUCCESS",
    "FAILED",
]);

export const mockCategoryEnum = pgEnum("mock_category", [
    "TECHNICAL",
    "BEHAVIORAL",
    "HR",
    "SYSTEM_DESIGN",
    "LEADERSHIP",
    "NEGOTIATION",
    "CASE_STUDY",
    "CODING",
    "GENERAL",
]);

export const mockLevelEnum = pgEnum("mock_level", [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
]);

export const projectTierEnum = pgEnum("project_tier", [
    "Free",
    "Paid",
]);

export const projectStatusEnum = pgEnum("project_status", [
    "NotStarted",
    "InProgress",
    "Completed",
]);

export const skillCategoryEnum = pgEnum("skill_category", [
    "FRONTEND",
    "LANGUAGES",
    "BACKEND",
    "API",
    "DATABASE",
    "DEVOPS",
    "CLOUD",
    "FRAMEWORKS_LIBRARIES",
    "TOOLS_DATABASES",
    "PLATFORMS",
    "AI_TOOLS",
]);

export const feedbackCategoryEnum = pgEnum("feedback_category", [
    "BUG",
    "FEATURE",
    "UI",
    "OTHER",
    // The public Ideas board (plan/web/revamp REV-40): requests for content, and
    // improvements to something that exists.
    "CONTENT",
    "IMPROVEMENT",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
    "UNDER_REVIEW",
    "PLANNED",
    "COMPLETED",
    // "Building" on the Ideas boards (plan/ideas IDEA-2): planned and being worked on.
    "IN_PROGRESS",
]);

export const creditTypeEnum = pgEnum("credit_type", [
    "PURCHASE",
    "SPEND",
    "BONUS",
    "REWARD",
]);

export const creditRequestStatusEnum = pgEnum("credit_request_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
    "YOUTUBE_VIDEO",
    "VIDEO",
    "DOCUMENTATION",
    "BLOG_ARTICLE",
    "COURSE",
    "DISCORD_COMMUNITY",
    "TOOL_RECOMMENDATION",
    "DESIGN_MOCKUP",
    "DESIGN_INSPIRATION",
    "GITHUB_REPO",
    "OTHER",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
    "PENDING",
    "COMPLETED",
    "FAILED",
    "REFUNDED",
    "CANCELLED",
]);

export const activityTypeEnum = pgEnum("activity_type", [
    "REFERRAL_BONUS",
    "SIGNUP",
    "FEEDBACK_SUBMITTED",
    "REWARD_RECEIVED",
    "STARTED_INTERVIEW",
    "CREDIT_SHARED",
    "CREDIT_RECEIVED",
    "CREATED_PEER_TO_PEER_MOCK_INTERVIEW",
    "DAILY_QUIZ_COMPLETED",
    "COMPLETED_MOCK_INTERVIEW",
    "COMPLETED_PRACTICE_SESSION",
    "PROJECT_SUBMISSION",
    "LEARN_COMPLETED",
    "STUDIO_CREATED",
    "STUDIO_UPDATED",
    "JOINED_SPACE",
    "POSTED_IN_SPACE",
    "COMMENTED_IN_SPACE",
    "COMPLETED_SPACE_STEP",
    "CONTRIBUTED_TO_OPEN_SOURCE",
    "FOLLOWING_USER",
    "COMPLETED_DAILY_CHALLENGE",
    "COMPLETED_GOAL_DAY",
    "SHARED_ACHIEVEMENT",
    "PATHFINDER_GOAL_COMPLETED",
    "ASSESSMENT_PASSED",
    "PATHFINDER_GOAL_STARTED",
]);

export const learnDifficultyEnum = pgEnum("learn_difficulty", [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
]);

export const learnStatusEnum = pgEnum("learn_status", [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
]);

export const learnStepTypeEnum = pgEnum("learn_step_type", [
    "EXPLANATION",
    "QUIZ",
    "CODE_CHALLENGE",
    "VIDEO",
    "MOCK_INTERVIEW",
    "PROJECT",
    "INTERVIEW_QUESTIONS",
]);

export const quizQuestionTypeEnum = pgEnum("quiz_question_type", [
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "CODE_OUTPUT",
]);

export const quizDifficultyEnum = pgEnum("quiz_difficulty", [
    "EASY",
    "MEDIUM",
    "HARD",
]);

export const interviewCardDifficultyEnum = pgEnum("interview_card_difficulty", [
    "EASY",
    "MEDIUM",
    "HARD",
]);

export const learnRequestStatusEnum = pgEnum("learn_request_status", [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "REJECTED",
]);

export const xpTransactionPropsEnum = pgEnum("xp_transaction_props", [
    "EARN",
    "SPEND",
    "REWARD",
    "BONUS",
    "PENALTY",
]);

export const currencyEnum = pgEnum("currency", [
    "INR",
    "USD",
    "EUR",
    "GBP",
]);

// Renamed to notificationEnum to avoid collision with the Notification table.
// Prisma enum name: NotificationEnum (used as the column type below)
export const notificationTypeEnum = pgEnum("notification_type", [
    "INFO",
    "SUCCESS",
    "WARNING",
    "ERROR",
]);

export const platformEnum = pgEnum("platform", [
    "MAIN",
    "HIRING",
    "UNI",
    "ADMIN",
]);

// ===========================
// Tables
// ===========================

export const users = pgTable(
    "user",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        // BetterAuth core
        name: text("name"),
        email: text("email").unique().notNull(),
        emailVerified: boolean("email_verified").notNull().default(false),
        image: text("image").default("https://tse4.mm.bing.net/th?id=OIP.-BS8Y2nH1k93GJiitUVBCAHaHa&pid=Api&P=0"),
        // Auth
        hashedPassword: text("hashed_password"),
        mustChangePassword: boolean("must_change_password").notNull().default(false),
        role: roleEnum("role").notNull().default("Student"),
        // Email OTP verification
        verifyToken: text("verify_token"),
        verifyTokenExpiry: timestamp("verify_token_expiry"),
        verifyOTP: text("verify_otp"),
        verifyOTPExpiry: timestamp("verify_otp_expiry"),
        // Password reset
        resetToken: text("reset_token"),
        restTokenExpiry: timestamp("rest_token_expiry"),
        resetOTP: text("reset_otp"),
        resetOTPExpiry: timestamp("reset_otp_expiry"),
        // Onboarding
        onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
        onboardingStep: integer("onboarding_step").notNull().default(0),
        // Profile basics
        username: text("username").unique(),
        bio: text("bio"),
        headline: text("headline"),
        location: text("location"),
        gender: text("gender"),
        phone: text("phone"),
        yearofbirth: text("yearofbirth"),
        university: text("university"),
        semester: text("semester"),
        company: text("company"),
        occupation: text("occupation"),
        website: text("website"),
        // Resume
        hasResume: boolean("has_resume").notNull().default(false),
        resume: text("resume"),
        resumeText: text("resume_text"),
        // Career preferences
        interests: text("interests").array().notNull().default([]),
        learningPreferences: text("learning_preferences").array().notNull().default([]),
        careerGoals: text("career_goals").array().notNull().default([]),
        targetCompanies: text("target_companies").array().notNull().default([]),
        expectedSalary: text("expected_salary"),
        noticePeriod: text("notice_period"),
        workExperience: text("work_experience"),
        openToWork: boolean("open_to_work").notNull().default(false),
        // Credits & XP
        // Defaults to 0, NOT to the welcome grant. The grant is made explicitly by
        // `lib/credits/grant.ts:grantSignupCredits` so that it is paired with a
        // `credit_transaction` row in the same write. A column default gave every
        // user a balance that nothing in the ledger could account for.
        // See plan/credits/overview.md.
        credits: integer("credits").notNull().default(0),
        totalCredits: integer("total_credits").notNull().default(0),
        creditsShared: integer("credits_shared").notNull().default(0),
        totalCreditsShared: integer("total_credits_shared").notNull().default(0),
        maxCreditsShared: integer("max_credits_shared").notNull().default(500),
        currentXp: integer("current_xp").notNull().default(250),
        totalXp: integer("total_xp").notNull().default(250),
        currentLevel: integer("current_level").notNull().default(1),
        referralCode: text("referral_code").unique(),
        referralCount: integer("referral_count").notNull().default(0),
        // Activity
        streak: integer("streak").notNull().default(0),
        lastActiveDate: timestamp("last_active_date"),
        // Social links (quick access)
        githubUrl: text("github_url"),
        linkedinUrl: text("linkedin_url"),
        twitterUrl: text("twitter_url"),
        websiteUrl: text("website_url"),
        // Profile meta
        profileViews: integer("profile_views").notNull().default(0),
        isPublicProfile: boolean("is_public_profile").notNull().default(true),
        yearsOfExperience: integer("years_of_experience"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_user_username").on(table.username),
        index("idx_user_email").on(table.email),
        index("idx_user_role").on(table.role),
        index("idx_user_referral_code").on(table.referralCode),
    ],
);

// BetterAuth-compatible account table
export const accounts = pgTable(
    "account",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accountId: text("account_id").notNull(),       // provider's user ID
        providerId: text("provider_id").notNull(),      // "google" | "github" | "credential"
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        idToken: text("id_token"),
        password: text("password"),                   // hashed, for credential provider
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_account_provider_id_account_id").on(table.providerId, table.accountId),
        index("idx_account_user_id").on(table.userId),
    ],
);

// BetterAuth-compatible session table
export const sessions = pgTable(
    "session",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        token: text("token").unique().notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_session_user_id").on(table.userId),
        index("idx_session_token").on(table.token),
    ],
);

// BetterAuth-compatible verification table
export const verifications = pgTable(
    "verification",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_verification_identifier").on(table.identifier),
    ],
);

export const userSkills = pgTable(
    "user_skill",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        level: text("level").notNull().default("beginner"),
        category: skillCategoryEnum("category").notNull(),
        order: integer("order").notNull().default(0),
    },
    (table) => [
        uniqueIndex("uq_user_skill_user_id_name").on(table.userId, table.name),
        index("idx_user_skill_user_id").on(table.userId),
        index("idx_user_skill_category").on(table.category),
    ],
);

// portfolioProjects is defined in profile.ts (full version matching Prisma schema)

export const feedbacks = pgTable(
    "feedback",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        category: feedbackCategoryEnum("category").notNull().default("OTHER"),
        title: text("title").notNull(),
        description: text("description").notNull(),
        status: feedbackStatusEnum("status").notNull().default("UNDER_REVIEW"),
        isAnonymous: boolean("is_anonymous").notNull().default(false),
        // Kept in step with `idea_vote` rows (one per user), so boards can sort on it
        // without counting. Never incremented on its own (plan/web/revamp REV-41).
        upvotes: integer("upvotes").notNull().default(0),
        // Shown on the public Ideas boards (web and app). BUG reports are never public.
        isPublic: boolean("is_public").notNull().default(true),
        adminNotes: text("admin_notes"),
        // Public note from the team, shown on the idea's page (plan/ideas IDEA-2).
        // adminNotes stays private.
        teamUpdate: text("team_update"),
        // Where the shipped work is described, usually a /changelog anchor.
        shippedHref: text("shipped_href"),
        // When the idea first reached each stage; set once, by admin, for the timeline.
        plannedAt: timestamp("planned_at"),
        startedAt: timestamp("started_at"),
        shippedAt: timestamp("shipped_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_feedback_user_id").on(table.userId),
        index("idx_feedback_category").on(table.category),
        index("idx_feedback_status").on(table.status),
    ],
);

/**
 * One vote per user per idea (plan/web/revamp REV-40). The composite primary key is
 * what makes a second vote impossible - the old counter-only upvote let one user vote
 * any number of times.
 */
export const ideaVotes = pgTable(
    "idea_vote",
    {
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        feedbackId: text("feedback_id")
            .notNull()
            .references(() => feedbacks.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.feedbackId] }),
        index("idx_idea_vote_feedback_id").on(table.feedbackId),
    ],
);

export const notifications = pgTable(
    "notification",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        message: text("message").notNull(),
        type: notificationTypeEnum("type").notNull().default("INFO"),
        platform: platformEnum("platform").notNull().default("MAIN"),
        read: boolean("read").notNull().default(false),
        actionUrl: text("action_url"),
        // ── The Inbox (plan/inbox IN-1) ─────────────────────────────────────
        // What happened, for the Inbox's tabs (packages/db/src/inbox-kinds.ts).
        kind: text("kind").notNull().default("GENERAL"),
        /** Who did it: { name, initials }. */
        actor: jsonb("actor").$type<{ name: string; initials: string } | null>(),
        /** What it's about: { label, href? }, e.g. a role or a project. */
        context: jsonb("context").$type<{ label: string; href?: string } | null>(),
        /** A message thread this is about (message_thread.id). */
        threadId: text("thread_id"),
        /** Set on a company fan-out row: one row per member (not a FK: schema.ts can't import hiring.ts). */
        companyId: text("company_id"),
        readAt: timestamp("read_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_notification_user_id").on(table.userId),
        index("idx_notification_read").on(table.read),
        index("idx_notification_platform").on(table.platform),
        index("idx_notification_user_platform_created").on(table.userId, table.platform, table.createdAt),
        index("idx_notification_thread_id").on(table.threadId),
    ],
);

// ===========================
// Relations
// ===========================

export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    sessions: many(sessions),
    verifications: many(verifications),
    feedbacks: many(feedbacks),
    userSkills: many(userSkills),
    notifications: many(notifications),
    // portfolioProjects, workExperiences, etc. are in profile.ts
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
    user: one(users, {
        fields: [userSkills.userId],
        references: [users.id],
    }),
}));


export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
    user: one(users, {
        fields: [feedbacks.userId],
        references: [users.id],
    }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));
