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

export const companyMemberRoleEnum = pgEnum("company_member_role", [
    "FOUNDER",
    "ADMIN",
    "HIRING_MANAGER",
    "RECRUITER",
    "INTERVIEWER",
]);

export const companyMemberJobTitleEnum = pgEnum("company_member_job_title", [
    "CEO",
    "CTO",
    "COFOUNDER",
    "VP_ENGINEERING",
    "ENGINEERING_MANAGER",
    "HR_HEAD",
    "HR_MANAGER",
    "TALENT_ACQUISITION",
    "RECRUITER",
    "HIRING_MANAGER",
    "TECH_LEAD",
    "INTERVIEWER",
    "OTHER",
]);

export const companyVerificationStatusEnum = pgEnum("company_verification_status", [
    "PENDING",
    "VERIFIED",
    "REJECTED",
]);

export const memberInviteStatusEnum = pgEnum("member_invite_status", [
    "PENDING",
    "ACCEPTED",
    "REVOKED",
    "EXPIRED",
]);

export const companyInvitationStatusEnum = pgEnum("company_invitation_status", [
    "PENDING",
    "ACCEPTED",
    "EXPIRED",
    "REVOKED",
]);

export const hiringSubscriptionPlanEnum = pgEnum("hiring_subscription_plan", [
    "FREE",
    "PRO",
    "ENTERPRISE",
]);

export const hiringSubscriptionStatusEnum = pgEnum("hiring_subscription_status", [
    "ACTIVE",
    "CANCELLED",
    "EXPIRED",
    "PAST_DUE",
    "TRIALING",
]);

export const hiringPaymentStatusEnum = pgEnum("hiring_payment_status", [
    "PENDING",
    "PROCESSING",
    "SUCCEEDED",
    "FAILED",
    "REFUNDED",
    "CANCELLED",
]);

export const hiringInvoiceStatusEnum = pgEnum("hiring_invoice_status", [
    "DRAFT",
    "PENDING",
    "PAID",
    "VOID",
    "UNCOLLECTIBLE",
]);

export const templateStyleEnum = pgEnum("template_style", [
    "STARTUP",
    "FAANG",
    "MNC",
    "CUSTOM",
]);

export const templateCategoryEnum = pgEnum("template_category", [
    "ENGINEERING",
    "PRODUCT",
    "DESIGN",
    "DATA_SCIENCE",
    "MARKETING",
    "SALES",
    "OPERATIONS",
    "INTERN",
    "GENERAL",
]);

// ===========================
// Tables
// ===========================

/** Where a company page came from (plan/hiring-rounds HR-1). */
export const companyProfileSourceEnum = pgEnum("company_profile_source", ["SELF_SERVE", "SCRAPED"]);
/** Whether a company has claimed its page (HR-1, HR-8). Self-serve companies are CLAIMED. */
export const companyClaimStatusEnum = pgEnum("company_claim_status", ["UNCLAIMED", "CLAIM_PENDING", "CLAIMED"]);

export const companies = pgTable(
    "company",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        name: text("name").notNull(),
        slug: text("slug").notNull().unique(),
        logoUrl: text("logo_url"),
        website: text("website"),
        /**
         * The company's email domain ("acme.io"), unique (plan/hiring-app HA-5).
         * A sign-up from this domain is told to ask for an invite instead of
         * creating a second company. Set from the creator's work email; the
         * backfill for older rows is `pnpm script company-domains`.
         */
        websiteDomain: text("website_domain").unique(),
        /** SCRAPED: built by ShipItHQ from the company's site (HR-5, HR-6). */
        profileSource: companyProfileSourceEnum("profile_source").notNull().default("SELF_SERVE"),
        claimStatus: companyClaimStatusEnum("claim_status").notNull().default("CLAIMED"),
        scrapedAt: timestamp("scraped_at"),
        description: text("description"),
        industry: text("industry"),
        companySize: text("company_size"),
        foundedYear: integer("founded_year"),
        headquarters: text("headquarters"),
        socialLinks: jsonb("social_links"),
        address: text("address"),
        city: text("city"),
        state: text("state"),
        country: text("country"),
        pincode: text("pincode"),
        culture: text("culture"),
        benefits: jsonb("benefits"),
        techStack: jsonb("tech_stack"),
        mediaGallery: jsonb("media_gallery"),
        responseRatePercent: real("response_rate_percent"),
        avgTimeToHireDays: integer("avg_time_to_hire_days"),
        interviewToOfferPercent: real("interview_to_offer_percent"),
        totalHired: integer("total_hired").notNull().default(0),
        totalApplications: integer("total_applications").notNull().default(0),
        verificationStatus: companyVerificationStatusEnum("verification_status")
            .notNull()
            .default("PENDING"),
        verifiedAt: timestamp("verified_at"),
        verifiedBy: text("verified_by"),
        inviteCode: text("invite_code").unique(),
        createdByUserId: text("created_by_user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        hasInterviewProcess: boolean("has_interview_process").notNull().default(false),
        /** Company credits (plan/hiring-app HA-20): pay for AI work past the free daily allowances. Every change has a `company_credit_transaction` row. */
        credits: integer("credits").notNull().default(0),
        /** Suspended by an admin (plan/hiring-rounds HR-24): frozen everywhere until lifted. */
        suspendedAt: timestamp("suspended_at"),
        suspendedReason: text("suspended_reason"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_company_slug").on(table.slug),
        index("idx_company_verification_status").on(table.verificationStatus),
        index("idx_company_created_by_user_id").on(table.createdByUserId),
    ],
);

export const companyFollowers = pgTable(
    "company_follower",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("uq_company_follower_user_id_company_id").on(table.userId, table.companyId),
        index("idx_company_follower_user_id").on(table.userId),
        index("idx_company_follower_company_id").on(table.companyId),
    ],
);

/**
 * A company's own roles (plan/hiring-app HA-6). Every company has one fixed
 * Owner role (`isOwner`, every permission, cannot be edited or removed) and
 * three editable presets (Admin, Recruiter, Interviewer); the Owner can add more.
 * `permissions` holds keys from `HIRING_PERMISSIONS` (src/hiring-permissions.ts).
 */
export const companyRoles = pgTable(
    "company_role",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        permissions: text("permissions").array().notNull().default([]),
        isOwner: boolean("is_owner").notNull().default(false),
        /** OWNER / ADMIN / RECRUITER / INTERVIEWER for the four starting roles; null for custom ones. */
        presetKey: text("preset_key"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_company_role_company_id_name").on(table.companyId, table.name),
        index("idx_company_role_company_id").on(table.companyId),
    ],
);

export const companyMembers = pgTable(
    "company_member",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        /**
         * LEGACY since plan/hiring-app HA-6: the fixed role before companies had their
         * own. Kept so old reads do not break; `roleId` is what permissions come from.
         */
        role: companyMemberRoleEnum("role").notNull().default("RECRUITER"),
        /** The member's role in `company_role`. Set for every member by HA-6's backfill. */
        roleId: text("role_id").references(() => companyRoles.id, { onDelete: "set null" }),
        jobTitle: companyMemberJobTitleEnum("job_title").notNull().default("OTHER"),
        jobTitleCustom: text("job_title_custom"),
        displayName: text("display_name"),
        email: text("email").notNull(),
        phone: text("phone"),
        permissions: jsonb("permissions")
            .notNull()
            .default(["view_jobs", "post_jobs", "view_applications", "review_candidates"]),
        inviteStatus: memberInviteStatusEnum("invite_status").notNull().default("ACCEPTED"),
        invitedById: text("invited_by_id"),
        invitedAt: timestamp("invited_at"),
        acceptedAt: timestamp("accepted_at"),
        isActive: boolean("is_active").notNull().default(true),
        lastActiveAt: timestamp("last_active_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("uq_company_member_user_id_company_id").on(table.userId, table.companyId),
        index("idx_company_member_user_id").on(table.userId),
        index("idx_company_member_company_id").on(table.companyId),
        index("idx_company_member_email").on(table.email),
        index("idx_company_member_role").on(table.role),
    ],
);

export const memberInvitations = pgTable(
    "member_invitation",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        name: text("name"),
        role: companyMemberRoleEnum("role").notNull().default("RECRUITER"),
        /** The `company_role` the invitee joins with (plan/hiring-app HA-6, HA-8). */
        roleId: text("role_id").references(() => companyRoles.id, { onDelete: "set null" }),
        jobTitle: companyMemberJobTitleEnum("job_title").notNull().default("RECRUITER"),
        inviteCode: text("invite_code").notNull().unique(),
        invitedById: text("invited_by_id")
            .notNull()
            .references(() => companyMembers.id, { onDelete: "cascade" }),
        status: memberInviteStatusEnum("status").notNull().default("PENDING"),
        message: text("message"),
        expiresAt: timestamp("expires_at"),
        acceptedAt: timestamp("accepted_at"),
        resultingMemberId: text("resulting_member_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_member_invitation_email").on(table.email),
        index("idx_member_invitation_invite_code").on(table.inviteCode),
        index("idx_member_invitation_status").on(table.status),
        index("idx_member_invitation_company_id").on(table.companyId),
    ],
);

export const companyInvitations = pgTable(
    "company_invitation",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        email: text("email").notNull(),
        companyName: text("company_name"),
        invitedBy: text("invited_by"),
        inviteCode: text("invite_code").notNull().unique(),
        status: companyInvitationStatusEnum("status").notNull().default("PENDING"),
        acceptedAt: timestamp("accepted_at"),
        expiresAt: timestamp("expires_at"),
        metadata: jsonb("metadata"),
        companyId: text("company_id").references(() => companies.id),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_company_invitation_email").on(table.email),
        index("idx_company_invitation_invite_code").on(table.inviteCode),
        index("idx_company_invitation_status").on(table.status),
    ],
);

export const companySubscriptions = pgTable(
    "company_subscription",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id")
            .notNull()
            .unique()
            .references(() => companies.id, { onDelete: "cascade" }),
        plan: hiringSubscriptionPlanEnum("plan").notNull().default("FREE"),
        status: hiringSubscriptionStatusEnum("status").notNull().default("ACTIVE"),
        dodoSubscriptionId: text("dodo_subscription_id").unique(),
        dodoProductId: text("dodo_product_id"),
        dodoPriceId: text("dodo_price_id"),
        maxJobPosts: integer("max_job_posts").notNull().default(3),
        maxApplications: integer("max_applications").notNull().default(50),
        maxInterviewTemplates: integer("max_interview_templates").notNull().default(1),
        maxTeamMembers: integer("max_team_members").notNull().default(1),
        hasAIScreening: boolean("has_ai_screening").notNull().default(false),
        hasCustomAssignments: boolean("has_custom_assignments").notNull().default(false),
        hasPrioritySupport: boolean("has_priority_support").notNull().default(false),
        hasAPIAccess: boolean("has_api_access").notNull().default(false),
        hasSSO: boolean("has_sso").notNull().default(false),
        hasWhiteLabel: boolean("has_white_label").notNull().default(false),
        amount: real("amount").notNull().default(0),
        currency: text("currency").notNull().default("INR"),
        billingCycle: text("billing_cycle").notNull().default("monthly"),
        currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
        currentPeriodEnd: timestamp("current_period_end"),
        trialStart: timestamp("trial_start"),
        trialEnd: timestamp("trial_end"),
        cancelledAt: timestamp("cancelled_at"),
        metadata: jsonb("metadata"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_company_subscription_company_id").on(table.companyId),
        index("idx_company_subscription_status").on(table.status),
        index("idx_company_subscription_dodo_subscription_id").on(table.dodoSubscriptionId),
    ],
);

export const companyPayments = pgTable(
    "company_payment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        subscriptionId: text("subscription_id").references(() => companySubscriptions.id),
        dodoPaymentId: text("dodo_payment_id").unique(),
        dodoCheckoutSessionId: text("dodo_checkout_session_id").unique(),
        amount: real("amount").notNull(),
        currency: text("currency").notNull().default("INR"),
        status: hiringPaymentStatusEnum("status").notNull().default("PENDING"),
        paymentMethod: text("payment_method"),
        billingEmail: text("billing_email"),
        billingName: text("billing_name"),
        description: text("description"),
        metadata: jsonb("metadata"),
        paidAt: timestamp("paid_at"),
        failedAt: timestamp("failed_at"),
        refundedAt: timestamp("refunded_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_company_payment_company_id").on(table.companyId),
        index("idx_company_payment_subscription_id").on(table.subscriptionId),
        index("idx_company_payment_status").on(table.status),
        index("idx_company_payment_dodo_payment_id").on(table.dodoPaymentId),
        index("idx_company_payment_dodo_checkout_session_id").on(table.dodoCheckoutSessionId),
    ],
);

export const companyInvoices = pgTable(
    "company_invoice",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id")
            .notNull()
            .references(() => companies.id, { onDelete: "cascade" }),
        paymentId: text("payment_id")
            .notNull()
            .unique()
            .references(() => companyPayments.id),
        invoiceNumber: text("invoice_number").notNull().unique(),
        status: hiringInvoiceStatusEnum("status").notNull().default("DRAFT"),
        lineItems: jsonb("line_items").notNull(),
        subtotal: real("subtotal").notNull(),
        taxAmount: real("tax_amount").notNull().default(0),
        taxRate: real("tax_rate").notNull().default(0),
        discount: real("discount").notNull().default(0),
        totalAmount: real("total_amount").notNull(),
        currency: text("currency").notNull().default("INR"),
        billingName: text("billing_name"),
        billingEmail: text("billing_email"),
        billingAddress: text("billing_address"),
        billingCity: text("billing_city"),
        billingState: text("billing_state"),
        billingCountry: text("billing_country"),
        billingPincode: text("billing_pincode"),
        gstNumber: text("gst_number"),
        invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
        dueDate: timestamp("due_date"),
        paidAt: timestamp("paid_at"),
        pdfUrl: text("pdf_url"),
        notes: text("notes"),
        metadata: jsonb("metadata"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_company_invoice_company_id").on(table.companyId),
        index("idx_company_invoice_status").on(table.status),
        index("idx_company_invoice_invoice_number").on(table.invoiceNumber),
        index("idx_company_invoice_invoice_date").on(table.invoiceDate),
    ],
);

export const interviewProcessTemplates = pgTable(
    "interview_process_template",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        name: text("name").notNull(),
        description: text("description"),
        style: templateStyleEnum("style").notNull().default("CUSTOM"),
        category: templateCategoryEnum("category").notNull().default("GENERAL"),
        rounds: jsonb("rounds").notNull(),
        estimatedDurationWeeks: integer("estimated_duration_weeks"),
        roundCount: integer("round_count").notNull().default(0),
        isAiGenerated: boolean("is_ai_generated").notNull().default(false),
        aiPrompt: text("ai_prompt"),
        isPublic: boolean("is_public").notNull().default(true),
        usageCount: integer("usage_count").notNull().default(0),
        createdByCompanyId: text("created_by_company_id"),
        createdByUserId: text("created_by_user_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_interview_process_template_style").on(table.style),
        index("idx_interview_process_template_category").on(table.category),
        index("idx_interview_process_template_is_public").on(table.isPublic),
        index("idx_interview_process_template_usage_count").on(table.usageCount),
    ],
);

// ===========================
// Relations
// ===========================

export const companiesRelations = relations(companies, ({ one, many }) => ({
    createdBy: one(users, {
        fields: [companies.createdByUserId],
        references: [users.id],
        relationName: "CompanyCreator",
    }),
    followers: many(companyFollowers),
    members: many(companyMembers),
    memberInvitations: many(memberInvitations),
    companyInvitations: many(companyInvitations),
    subscription: one(companySubscriptions, {
        fields: [companies.id],
        references: [companySubscriptions.companyId],
    }),
    payments: many(companyPayments),
    invoices: many(companyInvoices),
}));

export const companyFollowersRelations = relations(companyFollowers, ({ one }) => ({
    user: one(users, {
        fields: [companyFollowers.userId],
        references: [users.id],
        relationName: "UserFollowedCompanies",
    }),
    company: one(companies, {
        fields: [companyFollowers.companyId],
        references: [companies.id],
    }),
}));

export const companyRolesRelations = relations(companyRoles, ({ one, many }) => ({
    company: one(companies, {
        fields: [companyRoles.companyId],
        references: [companies.id],
    }),
    members: many(companyMembers),
}));

export const companyMembersRelations = relations(companyMembers, ({ one, many }) => ({
    companyRole: one(companyRoles, {
        fields: [companyMembers.roleId],
        references: [companyRoles.id],
    }),
    user: one(users, {
        fields: [companyMembers.userId],
        references: [users.id],
        relationName: "UserCompanyMemberships",
    }),
    company: one(companies, {
        fields: [companyMembers.companyId],
        references: [companies.id],
    }),
    invitedBy: one(companyMembers, {
        fields: [companyMembers.invitedById],
        references: [companyMembers.id],
        relationName: "InvitedBy",
    }),
    sentInvitations: many(memberInvitations, {
        relationName: "SentInvitations",
    }),
}));

export const memberInvitationsRelations = relations(memberInvitations, ({ one }) => ({
    company: one(companies, {
        fields: [memberInvitations.companyId],
        references: [companies.id],
    }),
    invitedBy: one(companyMembers, {
        fields: [memberInvitations.invitedById],
        references: [companyMembers.id],
        relationName: "SentInvitations",
    }),
}));

export const companyInvitationsRelations = relations(companyInvitations, ({ one }) => ({
    company: one(companies, {
        fields: [companyInvitations.companyId],
        references: [companies.id],
    }),
}));

export const companySubscriptionsRelations = relations(companySubscriptions, ({ one, many }) => ({
    company: one(companies, {
        fields: [companySubscriptions.companyId],
        references: [companies.id],
    }),
    payments: many(companyPayments),
}));

export const companyPaymentsRelations = relations(companyPayments, ({ one }) => ({
    company: one(companies, {
        fields: [companyPayments.companyId],
        references: [companies.id],
    }),
    subscription: one(companySubscriptions, {
        fields: [companyPayments.subscriptionId],
        references: [companySubscriptions.id],
    }),
    invoice: one(companyInvoices, {
        fields: [companyPayments.id],
        references: [companyInvoices.paymentId],
    }),
}));

export const companyInvoicesRelations = relations(companyInvoices, ({ one }) => ({
    company: one(companies, {
        fields: [companyInvoices.companyId],
        references: [companies.id],
    }),
    payment: one(companyPayments, {
        fields: [companyInvoices.paymentId],
        references: [companyPayments.id],
    }),
}));
