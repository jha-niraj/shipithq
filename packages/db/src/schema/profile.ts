import {
    pgTable, pgEnum, text, integer, boolean, timestamp,
    jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users, skillCategoryEnum } from "./schema";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const profileThemeEnum = pgEnum("profile_theme", [
    "OCEAN_BLUE", "SUNSET_ORANGE", "FOREST_GREEN", "PURPLE_DREAM", "DARK_MODE",
]);

export const profileLayoutEnum = pgEnum("profile_layout", [
    "DEFAULT", "MINIMAL", "SHOWCASE", "PORTFOLIO",
]);

export const profileVisibilityEnum = pgEnum("profile_visibility", [
    "PUBLIC", "FOLLOWERS", "PRIVATE",
]);

export const portfolioProjectSourceEnum = pgEnum("portfolio_project_source", [
    "PROFILE", "CONCEPTS", "RESUMECREATOR",
]);

// ─── Work Experience ──────────────────────────────────────────────────────────

export const workExperiences = pgTable("work_experience", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    companyLogo: text("company_logo"),
    roleTitle: text("role_title").notNull(),
    companyWebsite: text("company_website"),
    description: text("description"),
    bulletPoints: text("bullet_points").array().notNull().default([]),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    isCurrentlyWorking: boolean("is_currently_working").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
}, (t) => [index("idx_work_exp_user_id").on(t.userId)]);

// ─── User Education ───────────────────────────────────────────────────────────

export const userEducations = pgTable("user_education", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    degree: text("degree"),
    institution: text("institution").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    bulletPoints: text("bullet_points").array().notNull().default([]),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
}, (t) => [index("idx_user_edu_user_id").on(t.userId)]);

// ─── Social Links ─────────────────────────────────────────────────────────────

export const socialLinks = pgTable("social_link", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    url: text("url").notNull(),
    label: text("label"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
}, (t) => [
    uniqueIndex("uq_social_link_user_id_platform").on(t.userId, t.platform),
    index("idx_social_link_user_id").on(t.userId),
]);

// ─── Portfolio Projects ───────────────────────────────────────────────────────

export const portfolioProjects = pgTable("portfolio_project", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectName: text("project_name").notNull(),
    projectType: text("project_type").notNull(),
    description: text("description"),
    bulletPoints: text("bullet_points").array().notNull().default([]),
    // Stored spellings: packages/db/src/profile-values.ts (plan/profile PRF-7).
    status: text("status").notNull().default("IN_PROGRESS"),
    visibility: text("visibility").notNull().default("PUBLIC"),
    technologies: text("technologies").array().notNull().default([]),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    thumbnailUrl: text("thumbnail_url"),
    source: portfolioProjectSourceEnum("source").notNull().default("PROFILE"),
    learnStepId: text("learn_step_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
}, (t) => [
    index("idx_portfolio_user_id").on(t.userId),
    index("idx_portfolio_learn_step_id").on(t.learnStepId),
    index("idx_portfolio_source").on(t.source),
]);

export const projectLinks = pgTable("project_link", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    projectId: text("project_id").notNull().references(() => portfolioProjects.id, { onDelete: "cascade" }),
    linkType: text("link_type").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("idx_project_link_project_id").on(t.projectId)]);

export const projectMedia = pgTable("project_media", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    projectId: text("project_id").notNull().references(() => portfolioProjects.id, { onDelete: "cascade" }),
    mediaUrl: text("media_url").notNull(),
    mediaType: text("media_type").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("idx_project_media_project_id").on(t.projectId)]);

// ─── Skills (legacy relation model) ──────────────────────────────────────────

export const skills = pgTable("skills", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    level: text("level").notNull(),
    category: skillCategoryEnum("category").notNull(),
    order: integer("order").notNull().default(0),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("idx_skills_user_id").on(t.userId)]);

export const skillEndorsements = pgTable("skill_endorsement", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    skillId: text("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
    endorserId: text("endorser_id").notNull(),
    message: text("message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
    uniqueIndex("uq_skill_endorse_skill_id_endorser_id").on(t.skillId, t.endorserId),
    index("idx_skill_endorse_skill_id").on(t.skillId),
    index("idx_skill_endorse_endorser_id").on(t.endorserId),
]);

// ─── Certifications ───────────────────────────────────────────────────────────

export const certifications = pgTable("certifications", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    issuer: text("issuer").notNull(),
    issuedDate: timestamp("issued_date").notNull(),
    link: text("link").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("idx_cert_user_id").on(t.userId)]);

// ─── Recent Activity (legacy) ─────────────────────────────────────────────────

export const recentActivities = pgTable("recent_activity", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    activityType: text("activity_type"),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("idx_recent_activity_user_id").on(t.userId)]);

// ─── Achievements (legacy) ────────────────────────────────────────────────────

export const achievements = pgTable("achievements", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    title: text("title").notNull(),
    description: text("description").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("idx_achievements_user_id").on(t.userId)]);

// ─── Reward ───────────────────────────────────────────────────────────────────

export const rewards = pgTable("reward", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    type: text("type").notNull(),
    xp: integer("xp"),
    credits: integer("credits").notNull(),
    amount: integer("amount"),
    description: text("description").notNull(),
    feedbackId: text("feedback_id").unique().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
});

// ─── User Profile ─────────────────────────────────────────────────────────────

export const userProfiles = pgTable("user_profile", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
    coverGradient: text("cover_gradient").default("#525252,#a3a3a3"),
    theme: profileThemeEnum("theme").notNull().default("OCEAN_BLUE"),
    layout: profileLayoutEnum("layout").notNull().default("DEFAULT"),
    tagline: text("tagline"),
    visibility: profileVisibilityEnum("visibility").notNull().default("PUBLIC"),
    showEmail: boolean("show_email").notNull().default(false),
    showResume: boolean("show_resume").notNull().default(true),
    showActivity: boolean("show_activity").notNull().default(true),
    showStats: boolean("show_stats").notNull().default(true),
    allowEndorsements: boolean("allow_endorsements").notNull().default(true),
    allowMessages: boolean("allow_messages").notNull().default(true),
    profileViews: integer("profile_views").notNull().default(0),
    completionScore: integer("completion_score").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
});

export const profileViews = pgTable("profile_view", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    profileId: text("profile_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
    viewerId: text("viewer_id"),
    source: text("source"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    country: text("country"),
    city: text("city"),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
}, (t) => [
    index("idx_profile_view_profile_id").on(t.profileId),
    index("idx_profile_view_viewer_id").on(t.viewerId),
    index("idx_profile_view_viewed_at").on(t.viewedAt),
]);

// ─── Newsletter ───────────────────────────────────────────────────────────────

export const newsletters = pgTable("newsletter", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    email: text("email").unique().notNull(),
    subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
}, (t) => [
    index("idx_newsletter_email").on(t.email),
    index("idx_newsletter_subscribed_at").on(t.subscribedAt),
]);

// ─── Contact Messages ─────────────────────────────────────────────────────────

export const contactMessages = pgTable("contact_submissions", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Config (system-level key-value) ─────────────────────────────────────────

export const configs = pgTable("config", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    key: text("key").unique().notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
}, (t) => [index("idx_config_key").on(t.key)]);

// ─── User DSA Tracking ────────────────────────────────────────────────────────

export const userDSATrackingEntries = pgTable("user_dsa_tracking_entry", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    problemId: text("problem_id").notNull(),
    status: text("status").notNull().default("IN_PROGRESS"),
    lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
}, (t) => [
    uniqueIndex("uq_dsa_track_user_id_problem_id").on(t.userId, t.problemId),
    index("idx_dsa_track_user_id").on(t.userId),
]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const workExperiencesRelations = relations(workExperiences, ({ one }) => ({
    user: one(users, { fields: [workExperiences.userId], references: [users.id] }),
}));

export const userEducationsRelations = relations(userEducations, ({ one }) => ({
    user: one(users, { fields: [userEducations.userId], references: [users.id] }),
}));

export const socialLinksRelations = relations(socialLinks, ({ one }) => ({
    user: one(users, { fields: [socialLinks.userId], references: [users.id] }),
}));

export const portfolioProjectsRelations = relations(portfolioProjects, ({ one, many }) => ({
    user: one(users, { fields: [portfolioProjects.userId], references: [users.id] }),
    links: many(projectLinks),
    media: many(projectMedia),
}));

export const projectLinksRelations = relations(projectLinks, ({ one }) => ({
    project: one(portfolioProjects, { fields: [projectLinks.projectId], references: [portfolioProjects.id] }),
}));

export const projectMediaRelations = relations(projectMedia, ({ one }) => ({
    project: one(portfolioProjects, { fields: [projectMedia.projectId], references: [portfolioProjects.id] }),
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
    user: one(users, { fields: [skills.userId], references: [users.id] }),
    endorsements: many(skillEndorsements),
}));

export const skillEndorsementsRelations = relations(skillEndorsements, ({ one }) => ({
    skill: one(skills, { fields: [skillEndorsements.skillId], references: [skills.id] }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
    user: one(users, { fields: [certifications.userId], references: [users.id] }),
}));

export const recentActivitiesRelations = relations(recentActivities, ({ one }) => ({
    user: one(users, { fields: [recentActivities.userId], references: [users.id] }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
    user: one(users, { fields: [achievements.userId], references: [users.id] }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
    user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
    views: many(profileViews),
}));

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
    profile: one(userProfiles, { fields: [profileViews.profileId], references: [userProfiles.id] }),
}));

export const userDSATrackingEntriesRelations = relations(userDSATrackingEntries, ({ one }) => ({
    user: one(users, { fields: [userDSATrackingEntries.userId], references: [users.id] }),
}));
