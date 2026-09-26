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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";

// ===========================
// Enums
// ===========================

export const osProjectTypeEnum = pgEnum("os_project_type", [
    "LEARNING",
    "FREE",
    "PAID",
    "EXCLUSIVE",
]);

export const osProjectCategoryEnum = pgEnum("os_project_category", [
    "WEB_DEVELOPMENT",
    "MOBILE_DEVELOPMENT",
    "BACKEND",
    "FULLSTACK",
    "AI_ML",
    "DEVOPS",
    "BLOCKCHAIN",
    "GAME_DEVELOPMENT",
    "OTHER",
]);

export const osProjectStatusEnum = pgEnum("os_project_status", [
    "DRAFT",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "ARCHIVED",
]);

export const osIssueStatusEnum = pgEnum("os_issue_status", [
    "OPEN",
    "ASSIGNED",
    "IN_REVIEW",
    "COMPLETED",
    "CLOSED",
]);

export const osIssueDifficultyEnum = pgEnum("os_issue_difficulty", [
    "GOOD_FIRST_ISSUE",
    "EASY",
    "MEDIUM",
    "HARD",
    "EXPERT",
]);

export const osContributionTypeEnum = pgEnum("os_contribution_type", [
    "ISSUE_CREATED",
    "ISSUE_SOLVED",
    "PR_SUBMITTED",
    "PR_MERGED",
    "CODE_REVIEW",
    "DOCUMENTATION",
    "BUG_FIX",
    "FEATURE",
]);

export const osContributionStatusEnum = pgEnum("os_contribution_status", [
    "PENDING",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
    "MERGED",
    "CHANGES_REQUESTED",
]);

export const osLearnModuleTypeEnum = pgEnum("os_learn_module_type", [
    "VIDEO",
    "READING",
    "INTERACTIVE",
    "QUIZ",
    "PROJECT",
]);

export const osCertificationStatusEnum = pgEnum("os_certification_status", [
    "NOT_STARTED",
    "IN_PROGRESS",
    "PASSED",
    "FAILED",
]);

export const osLearnLabTypeEnum = pgEnum("os_learn_lab_type", [
    "CODE",
    "TERMINAL",
    "QUIZ",
    "PROJECT",
]);

// ===========================
// Tables
// ===========================

export const openSourceProjects = pgTable(
    "open_source_project",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        slug: text("slug").notNull().unique(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        longDescription: text("long_description"),
        githubRepoUrl: text("github_repo_url").notNull(),
        githubOwner: text("github_owner").notNull(),
        githubRepo: text("github_repo").notNull(),
        defaultBranch: text("default_branch").notNull().default("main"),
        type: osProjectTypeEnum("type").notNull().default("FREE"),
        category: osProjectCategoryEnum("category").notNull().default("WEB_DEVELOPMENT"),
        status: osProjectStatusEnum("status").notNull().default("DRAFT"),
        technologies: text("technologies").array().notNull().default([]),
        tags: text("tags").array().notNull().default([]),
        difficulty: osIssueDifficultyEnum("difficulty").notNull().default("MEDIUM"),
        learningGoals: text("learning_goals").array().notNull().default([]),
        prerequisites: text("prerequisites").array().notNull().default([]),
        estimatedHours: integer("estimated_hours"),
        totalBudget: real("total_budget").notNull().default(0),
        remainingBudget: real("remaining_budget").notNull().default(0),
        currency: text("currency").notNull().default("USD"),
        companyName: text("company_name"),
        companyLogo: text("company_logo"),
        companyUrl: text("company_url"),
        totalIssues: integer("total_issues").notNull().default(0),
        openIssues: integer("open_issues").notNull().default(0),
        closedIssues: integer("closed_issues").notNull().default(0),
        totalContributors: integer("total_contributors").notNull().default(0),
        totalPRsMerged: integer("total_p_rs_merged").notNull().default(0),
        totalPRsOpen: integer("total_p_rs_open").notNull().default(0),
        totalCommits: integer("total_commits").notNull().default(0),
        stars: integer("stars").notNull().default(0),
        forks: integer("forks").notNull().default(0),
        watchers: integer("watchers").notNull().default(0),
        lastSyncedAt: timestamp("last_synced_at"),
        syncError: text("sync_error"),
        requiresCertification: boolean("requires_certification").notNull().default(true),
        maxActiveIssues: integer("max_active_issues").notNull().default(2),
        prDeadlineHours: integer("pr_deadline_hours").notNull().default(48),
        maxContributionsPerUser: integer("max_contributions_per_user").notNull().default(0),
        readmeContent: text("readme_content"),
        contributingGuide: text("contributing_guide"),
        coverImage: text("cover_image"),
        bannerImage: text("banner_image"),
        orderIndex: integer("order_index").notNull().default(0),
        isFeatured: boolean("is_featured").notNull().default(false),
        maintainerId: text("maintainer_id").references(() => users.id, { onDelete: "set null" }),
        createdById: text("created_by_id")
            .references(() => users.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_osp_type").on(table.type),
        index("idx_osp_category").on(table.category),
        index("idx_osp_status").on(table.status),
        index("idx_osp_maintainer_id").on(table.maintainerId),
        index("idx_osp_created_by_id").on(table.createdById),
        index("idx_osp_slug").on(table.slug),
        index("idx_osp_order_index").on(table.orderIndex),
        index("idx_osp_is_featured").on(table.isFeatured),
    ],
);

export const osProjectSetupGuides = pgTable(
    "os_project_setup_guide",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        projectId: text("project_id")
            .notNull()
            .unique()
            .references(() => openSourceProjects.id, { onDelete: "cascade" }),
        steps: jsonb("steps").notNull(),
        nodeVersion: text("node_version"),
        npmPackages: text("npm_packages").array().notNull().default([]),
        envVariables: jsonb("env_variables"),
        installCommand: text("install_command").notNull().default("npm install"),
        devCommand: text("dev_command").notNull().default("npm run dev"),
        buildCommand: text("build_command").notNull().default("npm run build"),
        testCommand: text("test_command").notNull().default("npm test"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
);

export const osIssues = pgTable(
    "os_issue",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        projectId: text("project_id")
            .notNull()
            .references(() => openSourceProjects.id, { onDelete: "cascade" }),
        githubIssueNumber: integer("github_issue_number"),
        githubIssueUrl: text("github_issue_url"),
        githubIssueId: text("github_issue_id"),
        title: text("title").notNull(),
        description: text("description").notNull(),
        requirements: text("requirements").array().notNull().default([]),
        acceptanceCriteria: text("acceptance_criteria").array().notNull().default([]),
        hints: text("hints").array().notNull().default([]),
        learningGoals: text("learning_goals").array().notNull().default([]),
        filesToModify: text("files_to_modify").array().notNull().default([]),
        relatedDocs: text("related_docs").array().notNull().default([]),
        status: osIssueStatusEnum("status").notNull().default("OPEN"),
        difficulty: osIssueDifficultyEnum("difficulty").notNull().default("EASY"),
        labels: text("labels").array().notNull().default([]),
        estimatedHours: integer("estimated_hours").notNull().default(4),
        bountyAmount: real("bounty_amount").notNull().default(0),
        bountyPaid: boolean("bounty_paid").notNull().default(false),
        assignedToId: text("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
        assignedAt: timestamp("assigned_at"),
        deadlineAt: timestamp("deadline_at"),
        prNumber: integer("pr_number"),
        prUrl: text("pr_url"),
        prStatus: text("pr_status"),
        totalAttempts: integer("total_attempts").notNull().default(0),
        orderIndex: integer("order_index").notNull().default(0),
        lastSyncedAt: timestamp("last_synced_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_osi_project_id").on(table.projectId),
        index("idx_osi_status").on(table.status),
        index("idx_osi_difficulty").on(table.difficulty),
        index("idx_osi_assigned_to_id").on(table.assignedToId),
        index("idx_osi_github_issue_number").on(table.githubIssueNumber),
        index("idx_osi_order_index").on(table.orderIndex),
    ],
);

export const osContributions = pgTable(
    "os_contribution",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        projectId: text("project_id")
            .notNull()
            .references(() => openSourceProjects.id, { onDelete: "cascade" }),
        issueId: text("issue_id").references(() => osIssues.id, { onDelete: "set null" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: osContributionTypeEnum("type").notNull(),
        status: osContributionStatusEnum("status").notNull().default("PENDING"),
        githubPrNumber: integer("github_pr_number"),
        githubPrUrl: text("github_pr_url"),
        githubPrId: text("github_pr_id"),
        githubCommitSha: text("github_commit_sha"),
        githubBranch: text("github_branch"),
        forkRepoUrl: text("fork_repo_url"),
        forkOwner: text("fork_owner"),
        title: text("title"),
        description: text("description"),
        reviewScore: integer("review_score"),
        reviewFeedback: text("review_feedback"),
        reviewCycles: integer("review_cycles").notNull().default(0),
        reviewedById: text("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
        reviewedAt: timestamp("reviewed_at"),
        xpEarned: integer("xp_earned").notNull().default(0),
        bountyEarned: real("bounty_earned").notNull().default(0),
        linesAdded: integer("lines_added").notNull().default(0),
        linesRemoved: integer("lines_removed").notNull().default(0),
        filesChanged: integer("files_changed").notNull().default(0),
        commitsCount: integer("commits_count").notNull().default(0),
        testsPassing: boolean("tests_passing").notNull().default(true),
        isMerged: boolean("is_merged").notNull().default(false),
        mergedAt: timestamp("merged_at"),
        mergedBy: text("merged_by"),
        closedAt: timestamp("closed_at"),
        checksStatus: text("checks_status"),
        checksDetails: jsonb("checks_details"),
        lastSyncedAt: timestamp("last_synced_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_osc_project_id").on(table.projectId),
        index("idx_osc_issue_id").on(table.issueId),
        index("idx_osc_user_id").on(table.userId),
        index("idx_osc_type").on(table.type),
        index("idx_osc_status").on(table.status),
        index("idx_osc_github_pr_number").on(table.githubPrNumber),
        index("idx_osc_is_merged").on(table.isMerged),
    ],
);

export const osProjectContributors = pgTable(
    "os_project_contributor",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        projectId: text("project_id")
            .notNull()
            .references(() => openSourceProjects.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        totalContributions: integer("total_contributions").notNull().default(0),
        prsSubmitted: integer("prs_submitted").notNull().default(0),
        prsMerged: integer("prs_merged").notNull().default(0),
        issuesSolved: integer("issues_solved").notNull().default(0),
        reviewsGiven: integer("reviews_given").notNull().default(0),
        totalXpEarned: integer("total_xp_earned").notNull().default(0),
        totalBountyEarned: real("total_bounty_earned").notNull().default(0),
        rank: integer("rank"),
        contributionScore: real("contribution_score").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        joinedAt: timestamp("joined_at").notNull().defaultNow(),
        lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("idx_ospc_project_id_user_id").on(table.projectId, table.userId),
        index("idx_ospc_project_id").on(table.projectId),
        index("idx_ospc_user_id").on(table.userId),
        index("idx_ospc_rank").on(table.rank),
    ],
);

export const osProjectLeaderboards = pgTable(
    "os_project_leaderboard",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        projectId: text("project_id")
            .notNull()
            .references(() => openSourceProjects.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        rank: integer("rank").notNull(),
        score: real("score").notNull(),
        prsMerged: integer("prs_merged").notNull(),
        issuesSolved: integer("issues_solved").notNull(),
        bountyEarned: real("bounty_earned").notNull().default(0),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_ospl_project_id_user_id").on(table.projectId, table.userId),
        index("idx_ospl_project_id_rank").on(table.projectId, table.rank),
    ],
);

export const osLearnModules = pgTable(
    "os_learn_module",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        slug: text("slug").notNull().unique(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        icon: text("icon"),
        coverImage: text("cover_image"),
        orderIndex: integer("order_index").notNull().default(0),
        isRequired: boolean("is_required").notNull().default(true),
        estimatedMinutes: integer("estimated_minutes").notNull().default(30),
        totalEnrolled: integer("total_enrolled").notNull().default(0),
        totalCompleted: integer("total_completed").notNull().default(0),
        averageScore: real("average_score").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_oslm_order_index").on(table.orderIndex),
        index("idx_oslm_is_required").on(table.isRequired),
    ],
);

export const osLearnLessons = pgTable(
    "os_learn_lesson",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        moduleId: text("module_id")
            .notNull()
            .references(() => osLearnModules.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        type: osLearnModuleTypeEnum("type").notNull().default("READING"),
        content: text("content"),
        videoUrl: text("video_url"),
        interactiveData: jsonb("interactive_data"),
        codeLab: jsonb("code_lab"),
        terminalLab: jsonb("terminal_lab"),
        quizQuestions: jsonb("quiz_questions"),
        passingScore: integer("passing_score").notNull().default(70),
        orderIndex: integer("order_index").notNull().default(0),
        estimatedMinutes: integer("estimated_minutes").notNull().default(10),
        isRequired: boolean("is_required").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_osll_module_id").on(table.moduleId),
        index("idx_osll_order_index").on(table.orderIndex),
    ],
);

export const osLearnProgress = pgTable(
    "os_learn_progress",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        moduleId: text("module_id")
            .notNull()
            .references(() => osLearnModules.id, { onDelete: "cascade" }),
        lessonsCompleted: integer("lessons_completed").notNull().default(0),
        totalLessons: integer("total_lessons").notNull().default(0),
        progressPercent: real("progress_percent").notNull().default(0),
        quizScore: integer("quiz_score"),
        quizAttempts: integer("quiz_attempts").notNull().default(0),
        isCompleted: boolean("is_completed").notNull().default(false),
        completedAt: timestamp("completed_at"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_oslp_user_id_module_id").on(table.userId, table.moduleId),
        index("idx_oslp_user_id").on(table.userId),
        index("idx_oslp_module_id").on(table.moduleId),
    ],
);

export const osLessonCompletions = pgTable(
    "os_lesson_completion",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        lessonId: text("lesson_id")
            .notNull()
            .references(() => osLearnLessons.id, { onDelete: "cascade" }),
        score: integer("score"),
        timeSpent: integer("time_spent").notNull().default(0),
        commandsRun: jsonb("commands_run"),
        isCompleted: boolean("is_completed").notNull().default(false),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("idx_oslc_user_id_lesson_id").on(table.userId, table.lessonId),
        index("idx_oslc_user_id").on(table.userId),
        index("idx_oslc_lesson_id").on(table.lessonId),
    ],
);

export const osCertificationExams = pgTable(
    "os_certification_exam",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        status: osCertificationStatusEnum("status").notNull().default("NOT_STARTED"),
        quizScore: integer("quiz_score"),
        codeScore: integer("code_score"),
        scenarioScore: integer("scenario_score"),
        totalScore: integer("total_score"),
        passingScore: integer("passing_score").notNull().default(75),
        quizQuestions: jsonb("quiz_questions"),
        codeExercises: jsonb("code_exercises"),
        scenarioQuestions: jsonb("scenario_questions"),
        quizAnswers: jsonb("quiz_answers"),
        codeAnswers: jsonb("code_answers"),
        scenarioAnswers: jsonb("scenario_answers"),
        startedAt: timestamp("started_at"),
        completedAt: timestamp("completed_at"),
        timeLimit: integer("time_limit").notNull().default(60),
        attemptNumber: integer("attempt_number").notNull().default(1),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_osce_user_id").on(table.userId),
        index("idx_osce_status").on(table.status),
    ],
);

export const osCertifications = pgTable(
    "os_certification",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        certificateId: text("certificate_id").notNull().unique(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        title: text("title").notNull().default("Open Source Contributor Certification"),
        score: integer("score").notNull(),
        issuedAt: timestamp("issued_at").notNull().defaultNow(),
        expiresAt: timestamp("expires_at").notNull(),
        isActive: boolean("is_active").notNull().default(true),
        verificationUrl: text("verification_url"),
        qrCode: text("qr_code"),
    },
    (table) => [
        index("idx_oscert_user_id").on(table.userId),
        index("idx_oscert_certificate_id").on(table.certificateId),
    ],
);

export const userOSStats = pgTable(
    "user_os_stats",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .unique()
            .references(() => users.id, { onDelete: "cascade" }),
        modulesCompleted: integer("modules_completed").notNull().default(0),
        lessonsCompleted: integer("lessons_completed").notNull().default(0),
        totalLearningTime: integer("total_learning_time").notNull().default(0),
        isCertified: boolean("is_certified").notNull().default(false),
        certificationScore: integer("certification_score"),
        certifiedAt: timestamp("certified_at"),
        totalProjects: integer("total_projects").notNull().default(0),
        totalContributions: integer("total_contributions").notNull().default(0),
        prsSubmitted: integer("prs_submitted").notNull().default(0),
        prsMerged: integer("prs_merged").notNull().default(0),
        issuesSolved: integer("issues_solved").notNull().default(0),
        reviewsGiven: integer("reviews_given").notNull().default(0),
        avgPrScore: real("avg_pr_score").notNull().default(0),
        acceptanceRate: real("acceptance_rate").notNull().default(0),
        totalBountyEarned: real("total_bounty_earned").notNull().default(0),
        pendingBounty: real("pending_bounty").notNull().default(0),
        osXp: integer("os_xp").notNull().default(0),
        globalRank: integer("global_rank"),
        currentStreak: integer("current_streak").notNull().default(0),
        longestStreak: integer("longest_streak").notNull().default(0),
        lastContributionAt: timestamp("last_contribution_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_uos_user_id").on(table.userId),
        index("idx_uos_global_rank").on(table.globalRank),
    ],
);

export const osEarningsTransactions = pgTable(
    "os_earnings_transaction",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        amount: real("amount").notNull(),
        currency: text("currency").notNull().default("USD"),
        projectId: text("project_id"),
        issueId: text("issue_id"),
        contributionId: text("contribution_id"),
        status: text("status").notNull().default("COMPLETED"),
        payoutMethod: text("payout_method"),
        payoutDetails: jsonb("payout_details"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_oset_user_id").on(table.userId),
        index("idx_oset_type").on(table.type),
        index("idx_oset_status").on(table.status),
    ],
);

export const osGitHubProfiles = pgTable(
    "os_git_hub_profile",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .unique()
            .references(() => users.id, { onDelete: "cascade" }),
        githubId: text("github_id").notNull().unique(),
        githubUsername: text("github_username").notNull(),
        githubName: text("github_name"),
        githubAvatar: text("github_avatar"),
        githubBio: text("github_bio"),
        githubLocation: text("github_location"),
        githubCompany: text("github_company"),
        githubBlog: text("github_blog"),
        publicRepos: integer("public_repos").notNull().default(0),
        publicGists: integer("public_gists").notNull().default(0),
        followers: integer("followers").notNull().default(0),
        following: integer("following").notNull().default(0),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        tokenExpiresAt: timestamp("token_expires_at"),
        scopes: text("scopes").array().notNull().default([]),
        lastSyncedAt: timestamp("last_synced_at"),
        syncError: text("sync_error"),
        showOnProfile: boolean("show_on_profile").notNull().default(true),
        autoSync: boolean("auto_sync").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_osgh_github_username").on(table.githubUsername),
        index("idx_osgh_github_id").on(table.githubId),
    ],
);

export const osLearnPracticeProjects = pgTable(
    "os_learn_practice_project",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        moduleId: text("module_id"),
        slug: text("slug").notNull().unique(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        techStack: text("tech_stack").array().notNull().default([]),
        category: osProjectCategoryEnum("category").notNull().default("WEB_DEVELOPMENT"),
        difficulty: osIssueDifficultyEnum("difficulty").notNull().default("EASY"),
        starterFiles: jsonb("starter_files").notNull(),
        solutionFiles: jsonb("solution_files"),
        learningGoals: text("learning_goals").array().notNull().default([]),
        prerequisites: text("prerequisites").array().notNull().default([]),
        estimatedHours: integer("estimated_hours").notNull().default(2),
        orderIndex: integer("order_index").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_oslpp_slug").on(table.slug),
        index("idx_oslpp_difficulty").on(table.difficulty),
        index("idx_oslpp_order_index").on(table.orderIndex),
    ],
);

export const osLearnPracticeTasks = pgTable(
    "os_learn_practice_task",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        projectId: text("project_id")
            .notNull()
            .references(() => osLearnPracticeProjects.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description").notNull(),
        requirements: text("requirements").array().notNull().default([]),
        hints: text("hints").array().notNull().default([]),
        targetFiles: text("target_files").array().notNull().default([]),
        validationRules: jsonb("validation_rules"),
        expectedChanges: jsonb("expected_changes"),
        difficulty: osIssueDifficultyEnum("difficulty").notNull().default("EASY"),
        estimatedMinutes: integer("estimated_minutes").notNull().default(30),
        xpReward: integer("xp_reward").notNull().default(50),
        orderIndex: integer("order_index").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_oslpt_project_id").on(table.projectId),
        index("idx_oslpt_order_index").on(table.orderIndex),
    ],
);

export const osLearnPracticeSubmissions = pgTable(
    "os_learn_practice_submission",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id").notNull(),
        taskId: text("task_id")
            .notNull()
            .references(() => osLearnPracticeTasks.id, { onDelete: "cascade" }),
        submittedCode: jsonb("submitted_code").notNull(),
        isCorrect: boolean("is_correct").notNull().default(false),
        score: integer("score"),
        feedback: text("feedback"),
        aiReview: jsonb("ai_review"),
        attemptNumber: integer("attempt_number").notNull().default(1),
        xpEarned: integer("xp_earned").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_oslps_user_id").on(table.userId),
        index("idx_oslps_task_id").on(table.taskId),
    ],
);

export const osLearnPracticeCompletions = pgTable(
    "os_learn_practice_completion",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id").notNull(),
        projectId: text("project_id")
            .notNull()
            .references(() => osLearnPracticeProjects.id, { onDelete: "cascade" }),
        tasksCompleted: integer("tasks_completed").notNull().default(0),
        totalTasks: integer("total_tasks").notNull().default(0),
        progressPercent: real("progress_percent").notNull().default(0),
        isCompleted: boolean("is_completed").notNull().default(false),
        completedAt: timestamp("completed_at"),
        totalXpEarned: integer("total_xp_earned").notNull().default(0),
        totalAttempts: integer("total_attempts").notNull().default(0),
        averageScore: real("average_score").notNull().default(0),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_oslpcompl_user_id_project_id").on(table.userId, table.projectId),
        index("idx_oslpcompl_user_id").on(table.userId),
        index("idx_oslpcompl_project_id").on(table.projectId),
    ],
);

// ===========================
// Relations
// ===========================

export const openSourceProjectsRelations = relations(openSourceProjects, ({ one, many }) => ({
    maintainer: one(users, {
        fields: [openSourceProjects.maintainerId],
        references: [users.id],
        relationName: "OSProjectMaintainer",
    }),
    createdBy: one(users, {
        fields: [openSourceProjects.createdById],
        references: [users.id],
        relationName: "OSProjectCreator",
    }),
    setupGuide: one(osProjectSetupGuides),
    issues: many(osIssues),
    contributions: many(osContributions),
    contributors: many(osProjectContributors),
    leaderboard: many(osProjectLeaderboards),
}));

export const osProjectSetupGuidesRelations = relations(osProjectSetupGuides, ({ one }) => ({
    project: one(openSourceProjects, {
        fields: [osProjectSetupGuides.projectId],
        references: [openSourceProjects.id],
    }),
}));

export const osIssuesRelations = relations(osIssues, ({ one, many }) => ({
    project: one(openSourceProjects, {
        fields: [osIssues.projectId],
        references: [openSourceProjects.id],
    }),
    assignedTo: one(users, {
        fields: [osIssues.assignedToId],
        references: [users.id],
        relationName: "OSIssueAssignee",
    }),
    contributions: many(osContributions),
}));

export const osContributionsRelations = relations(osContributions, ({ one }) => ({
    project: one(openSourceProjects, {
        fields: [osContributions.projectId],
        references: [openSourceProjects.id],
    }),
    issue: one(osIssues, {
        fields: [osContributions.issueId],
        references: [osIssues.id],
    }),
    user: one(users, {
        fields: [osContributions.userId],
        references: [users.id],
        relationName: "OSContributions",
    }),
    reviewedBy: one(users, {
        fields: [osContributions.reviewedById],
        references: [users.id],
        relationName: "OSContributionReviewer",
    }),
}));

export const osProjectContributorsRelations = relations(osProjectContributors, ({ one }) => ({
    project: one(openSourceProjects, {
        fields: [osProjectContributors.projectId],
        references: [openSourceProjects.id],
    }),
    user: one(users, {
        fields: [osProjectContributors.userId],
        references: [users.id],
        relationName: "OSProjectContributors",
    }),
}));

export const osProjectLeaderboardsRelations = relations(osProjectLeaderboards, ({ one }) => ({
    project: one(openSourceProjects, {
        fields: [osProjectLeaderboards.projectId],
        references: [openSourceProjects.id],
    }),
    user: one(users, {
        fields: [osProjectLeaderboards.userId],
        references: [users.id],
        relationName: "OSProjectLeaderboard",
    }),
}));

export const osLearnModulesRelations = relations(osLearnModules, ({ many }) => ({
    lessons: many(osLearnLessons),
    progress: many(osLearnProgress),
}));

export const osLearnLessonsRelations = relations(osLearnLessons, ({ one, many }) => ({
    module: one(osLearnModules, {
        fields: [osLearnLessons.moduleId],
        references: [osLearnModules.id],
    }),
    completions: many(osLessonCompletions),
}));

export const osLearnProgressRelations = relations(osLearnProgress, ({ one }) => ({
    user: one(users, {
        fields: [osLearnProgress.userId],
        references: [users.id],
        relationName: "OSLearnProgress",
    }),
    module: one(osLearnModules, {
        fields: [osLearnProgress.moduleId],
        references: [osLearnModules.id],
    }),
}));

export const osLessonCompletionsRelations = relations(osLessonCompletions, ({ one }) => ({
    user: one(users, {
        fields: [osLessonCompletions.userId],
        references: [users.id],
        relationName: "OSLessonCompletions",
    }),
    lesson: one(osLearnLessons, {
        fields: [osLessonCompletions.lessonId],
        references: [osLearnLessons.id],
    }),
}));

export const osCertificationExamsRelations = relations(osCertificationExams, ({ one }) => ({
    user: one(users, {
        fields: [osCertificationExams.userId],
        references: [users.id],
        relationName: "OSCertificationExams",
    }),
}));

export const osCertificationsRelations = relations(osCertifications, ({ one }) => ({
    user: one(users, {
        fields: [osCertifications.userId],
        references: [users.id],
        relationName: "OSCertifications",
    }),
}));

export const userOSStatsRelations = relations(userOSStats, ({ one }) => ({
    user: one(users, {
        fields: [userOSStats.userId],
        references: [users.id],
        relationName: "UserOSStats",
    }),
}));

export const osEarningsTransactionsRelations = relations(osEarningsTransactions, ({ one }) => ({
    user: one(users, {
        fields: [osEarningsTransactions.userId],
        references: [users.id],
        relationName: "OSEarningsTransactions",
    }),
}));

export const osGitHubProfilesRelations = relations(osGitHubProfiles, ({ one }) => ({
    user: one(users, {
        fields: [osGitHubProfiles.userId],
        references: [users.id],
        relationName: "OSGitHubProfile",
    }),
}));

export const osLearnPracticeProjectsRelations = relations(osLearnPracticeProjects, ({ many }) => ({
    tasks: many(osLearnPracticeTasks),
    completions: many(osLearnPracticeCompletions),
}));

export const osLearnPracticeTasksRelations = relations(osLearnPracticeTasks, ({ one, many }) => ({
    project: one(osLearnPracticeProjects, {
        fields: [osLearnPracticeTasks.projectId],
        references: [osLearnPracticeProjects.id],
    }),
    submissions: many(osLearnPracticeSubmissions),
}));

export const osLearnPracticeSubmissionsRelations = relations(osLearnPracticeSubmissions, ({ one }) => ({
    task: one(osLearnPracticeTasks, {
        fields: [osLearnPracticeSubmissions.taskId],
        references: [osLearnPracticeTasks.id],
    }),
}));

export const osLearnPracticeCompletionsRelations = relations(osLearnPracticeCompletions, ({ one }) => ({
    project: one(osLearnPracticeProjects, {
        fields: [osLearnPracticeCompletions.projectId],
        references: [osLearnPracticeProjects.id],
    }),
}));
