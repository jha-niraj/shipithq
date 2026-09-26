import {
    pgTable,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    real,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";

// The Job Interview Assistant's five tables - job_interview_assistant,
// code_evaluation, question_answer, user_question_response and
// interview_plan_purchase - were removed here on 2026-08-28.
//
// They were a second, narrower copy of Pathfinder: a plan is a goal, a question
// is a sub-goal, a response is a quiz attempt, a code evaluation is a coding
// submission, and a plan purchase is a goal purchase. Interview prep is now a
// Pathfinder goal with category INTERVIEW_PREP. See plan/interview-prep/.
//
// Dropped rather than migrated because this database is pre-production, which
// is the only reason interview_plan_purchase could go: on a live product it
// holds credit-purchase history.

// ===========================
// coverLetter
// ===========================

export const coverLetter = pgTable(
    "cover_letter",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        // Which resume this letter was written against.
        //
        // Cover letters used to be generated from the raw profile tables while the
        // user's actual resume said something else - so the letter could contradict
        // the document it was attached to, and it ignored every curation decision
        // the user had made in the resume builder. `set null` because losing the
        // resume must not delete a letter the user may already have sent.
        resumeDraftId: text("resume_draft_id").references((): AnyPgColumn => resumeDraft.id, { onDelete: "set null" }),
        // Nullable: a JD is just as often pasted as text as it is linked. This was
        // NOT NULL, which meant "paste a job description" had no way to save.
        jobUrl: text("job_url"),
        companyName: text("company_name"),
        jobTitle: text("job_title"),
        jobDescription: text("job_description"),
        questions: jsonb("questions"),
        answers: jsonb("answers"),
        tone: text("tone").default("Professional"),
        generatedContent: text("generated_content"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (t) => [
        index("cover_letter_user_id_idx").on(t.userId),
    ]
);

export const coverLetterRelations = relations(coverLetter, ({ one }) => ({
    user: one(users, {
        fields: [coverLetter.userId],
        references: [users.id],
    }),
    // The resume this letter was written against, so a reader can open both and
    // see that they say the same thing.
    resumeDraft: one(resumeDraft, {
        fields: [coverLetter.resumeDraftId],
        references: [resumeDraft.id],
    }),
}));

// ===========================
// resumeTemplate
// ===========================

export const resumeTemplate = pgTable("resume_template", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    previewImageUrl: text("preview_image_url").notNull(),
    sectionOrder: jsonb("section_order").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    creditsCost: integer("credits_cost").notNull().default(10),
    isPlatform: boolean("is_platform").notNull().default(false),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    isMarketplace: boolean("is_marketplace").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    marketplacePrice: integer("marketplace_price").notNull().default(0),
    config: jsonb("config"),
    totalSales: integer("total_sales").notNull().default(0),
    totalRevenue: integer("total_revenue").notNull().default(0),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export const resumeTemplateRelations = relations(resumeTemplate, ({ one, many }) => ({
    createdBy: one(users, {
        fields: [resumeTemplate.createdById],
        references: [users.id],
        relationName: "UserCreatedTemplates",
    }),
    generations: many(resumeTemplateGeneration),
    purchases: many(templatePurchase, { relationName: "TemplatePurchases" }),
}));

// ===========================
// resumeTemplateGeneration
// ===========================

export const resumeTemplateGeneration = pgTable(
    "resume_template_generation",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        templateId: text("template_id").notNull().references(() => resumeTemplate.id, { onDelete: "cascade" }),
        generatedContent: jsonb("generated_content"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("resume_template_generation_user_id_idx").on(t.userId),
        index("resume_template_generation_template_id_idx").on(t.templateId),
        index("resume_template_generation_user_id_template_id_idx").on(t.userId, t.templateId),
    ]
);

export const resumeTemplateGenerationRelations = relations(resumeTemplateGeneration, ({ one }) => ({
    user: one(users, {
        fields: [resumeTemplateGeneration.userId],
        references: [users.id],
        relationName: "UserResumeTemplateGenerations",
    }),
    template: one(resumeTemplate, {
        fields: [resumeTemplateGeneration.templateId],
        references: [resumeTemplate.id],
    }),
}));

// ===========================
// resumeDraft
// ===========================

export const resumeDraft = pgTable(
    "resume_draft",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        templateSlug: text("template_slug").notNull().default("clean-minimal"),
        content: jsonb("content").notNull(),
        // Which resume this one was tailored FROM. Set when a JD-specific resume is
        // spun off the primary, so the lineage is visible in the UI and a tailored
        // copy can be re-tailored from its source rather than from itself.
        //
        // Deliberately NOT a foreign key: a self-reference would need a cascade
        // policy, and the honest policy is "none" - deleting the master must not
        // delete or blank the tailored copies someone already sent out. A dangling
        // pointer on a provenance field costs nothing.
        sourceDraftId: text("source_draft_id"),
        tailoredFor: text("tailored_for"),
        tailoredForCompany: text("tailored_for_company"),
        jdSnapshot: text("jd_snapshot"),
        atsScore: integer("ats_score"),
        isPublic: boolean("is_public").notNull().default(false),
        // The one resume the AI reaches for when a feature needs "this user's
        // resume" without being told which - cover letters, mock interviews, the
        // assistant's tools. Exactly one row per user should carry it; that is
        // enforced by `setDefaultResumeDraft`, which clears the others in the
        // same batch, not by a constraint (a partial unique index would make an
        // ordinary two-statement swap fail halfway).
        isDefault: boolean("is_default").notNull().default(false),
        shareSlug: text("share_slug").notNull().unique().$defaultFn(() => createId()),
        viewCount: integer("view_count").notNull().default(0),
        importedFrom: text("imported_from"),
        importedUrl: text("imported_url"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (t) => [
        index("resume_draft_user_id_idx").on(t.userId),
        index("resume_draft_user_id_is_default_idx").on(t.userId, t.isDefault),
        index("resume_draft_share_slug_idx").on(t.shareSlug),
        index("resume_draft_is_public_idx").on(t.isPublic),
        // At most one primary per user. Partial, so the thousands of non-primary
        // drafts do not all collide on `false`.
        // At most one default per user, enforced in the database rather than by
        // convention. Upstream added `is_default` with a plain index, so two rows
        // could both claim it and every consumer that does
        // `orderBy(desc(isDefault))` would pick between them arbitrarily.
        // Partial, so the thousands of non-default drafts do not collide on `false`.
        uniqueIndex("resume_draft_one_default_per_user")
            .on(t.userId)
            .where(sql`${t.isDefault}`),
    ]
);

export const resumeDraftRelations = relations(resumeDraft, ({ one }) => ({
    user: one(users, {
        fields: [resumeDraft.userId],
        references: [users.id],
        relationName: "UserResumeDrafts",
    }),
}));

// ===========================
// templatePurchase
// ===========================

export const templatePurchase = pgTable(
    "template_purchase",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        buyerId: text("buyer_id").references(() => users.id, { onDelete: "set null" }),
        templateId: text("template_id").notNull().references(() => resumeTemplate.id),
        pricePaid: integer("price_paid").notNull(),
        creatorEarning: integer("creator_earning").notNull(),
        platformFee: integer("platform_fee").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("template_purchase_buyer_id_template_id_key").on(t.buyerId, t.templateId),
        index("template_purchase_buyer_id_idx").on(t.buyerId),
        index("template_purchase_template_id_idx").on(t.templateId),
    ]
);

export const templatePurchaseRelations = relations(templatePurchase, ({ one }) => ({
    buyer: one(users, {
        fields: [templatePurchase.buyerId],
        references: [users.id],
        relationName: "TemplatePurchasesBuyer",
    }),
    template: one(resumeTemplate, {
        fields: [templatePurchase.templateId],
        references: [resumeTemplate.id],
        relationName: "TemplatePurchases",
    }),
}));
