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

export const universityTypeEnum = pgEnum("university_type", [
    "PUBLIC",
    "PRIVATE",
    "DEEMED",
    "AUTONOMOUS",
    "STATE",
    "CENTRAL",
    "AFFILIATED",
    "COMMUNITY_COLLEGE",
    "TECHNICAL_INSTITUTE",
    "OTHER",
]);

export const universityMemberRoleEnum = pgEnum("university_member_role", [
    "HEAD",
    "DEPARTMENT_HEAD",
    "PLACEMENT_OFFICER",
    "FINANCE_OFFICER",
    "FACULTY",
    "TEACHING_ASSISTANT",
]);

export const universityMemberJobTitleEnum = pgEnum("university_member_job_title", [
    "CHANCELLOR",
    "PRINCIPAL",
    "REGISTRAR",
    "DEAN",
    "HOD",
    "PROFESSOR",
    "ASSOCIATE_PROFESSOR",
    "ASSISTANT_PROFESSOR",
    "LECTURER",
    "PLACEMENT_COORDINATOR",
    "PLACEMENT_OFFICER",
    "FINANCE_MANAGER",
    "ACCOUNTS_OFFICER",
    "TEACHING_ASSISTANT",
    "LAB_INSTRUCTOR",
    "OTHER",
]);

export const universityVerificationStatusEnum = pgEnum("university_verification_status", [
    "PENDING",
    "UNDER_REVIEW",
    "VERIFIED",
    "REJECTED",
    "SUSPENDED",
]);

export const universityMemberInviteStatusEnum = pgEnum("university_member_invite_status", [
    "PENDING",
    "ACCEPTED",
    "REVOKED",
    "EXPIRED",
]);

export const studentVerificationStatusEnum = pgEnum("student_verification_status", [
    "PENDING",
    "UNDER_REVIEW",
    "VERIFIED",
    "REJECTED",
    "EXPIRED",
]);

export const universityAssignmentTypeEnum = pgEnum("university_assignment_type", [
    "QUIZ",
    "CODING",
    "PROJECT",
    "MOCK_INTERVIEW",
    "SPACE_TOPIC",
    "CUSTOM",
]);

export const universityAssignmentStatusEnum = pgEnum("university_assignment_status", [
    "DRAFT",
    "PUBLISHED",
    "CLOSED",
    "ARCHIVED",
]);

export const submissionGradingStatusEnum = pgEnum("submission_grading_status", [
    "NOT_SUBMITTED",
    "SUBMITTED",
    "UNDER_REVIEW",
    "GRADED",
    "RESUBMISSION_REQUESTED",
]);

export const semesterTypeEnum = pgEnum("semester_type", [
    "SEMESTER_1",
    "SEMESTER_2",
    "SEMESTER_3",
    "SEMESTER_4",
    "SEMESTER_5",
    "SEMESTER_6",
    "SEMESTER_7",
    "SEMESTER_8",
]);

export const universityJobVisibilityEnum = pgEnum("university_job_visibility", [
    "PUBLIC",
    "UNIVERSITY_ONLY",
    "FILTERED",
]);

export const universitySubscriptionPlanEnum = pgEnum("university_subscription_plan", [
    "FREE",
    "STARTER",
    "GROWTH",
    "ENTERPRISE",
]);

export const universitySubscriptionStatusEnum = pgEnum("university_subscription_status", [
    "ACTIVE",
    "CANCELLED",
    "EXPIRED",
    "PAST_DUE",
    "TRIALING",
]);

// ===========================
// Tables
// ===========================

export const universities = pgTable(
    "university",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        name: text("name").notNull(),
        slug: text("slug").notNull().unique(),
        logoUrl: text("logo_url"),
        bannerUrl: text("banner_url"),
        website: text("website"),
        description: text("description"),
        email: text("email"),
        phone: text("phone"),
        universityType: universityTypeEnum("university_type"),
        affiliatedTo: text("affiliated_to"),
        accreditation: text("accreditation"),
        establishedYear: integer("established_year"),
        emailDomain: text("email_domain").notNull().unique(),
        address: text("address"),
        city: text("city"),
        state: text("state"),
        country: text("country").notNull().default("India"),
        /** A band from onboarding, e.g. "1,000-5,000 students" (plan/auth AUTH-14). */
        studentCount: text("student_count"),
        pincode: text("pincode"),
        verificationStatus: universityVerificationStatusEnum("verification_status")
            .notNull()
            .default("PENDING"),
        verifiedAt: timestamp("verified_at"),
        verifiedBy: text("verified_by"),
        rejectionReason: text("rejection_reason"),
        totalCreditsAllocated: integer("total_credits_allocated").notNull().default(0),
        totalCreditsUsed: integer("total_credits_used").notNull().default(0),
        creditExpiryDate: timestamp("credit_expiry_date"),
        memberInviteCode: text("member_invite_code").unique(),
        studentInviteCode: text("student_invite_code").unique(),
        createdByUserId: text("created_by_user_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_uni_slug").on(table.slug),
        index("idx_uni_email_domain").on(table.emailDomain),
        index("idx_uni_verification_status").on(table.verificationStatus),
        index("idx_uni_created_by_user_id").on(table.createdByUserId),
    ],
);

export const departments = pgTable(
    "department",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        code: text("code"),
        description: text("description"),
        headUserId: text("head_user_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_dept_university_id_name").on(table.universityId, table.name),
        uniqueIndex("idx_dept_university_id_code").on(table.universityId, table.code),
        index("idx_dept_university_id").on(table.universityId),
    ],
);

export const universityMembers = pgTable(
    "university_member",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id").notNull(),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
        role: universityMemberRoleEnum("role").notNull().default("FACULTY"),
        jobTitle: universityMemberJobTitleEnum("job_title").notNull().default("OTHER"),
        jobTitleCustom: text("job_title_custom"),
        displayName: text("display_name"),
        email: text("email").notNull(),
        phone: text("phone"),
        permissions: jsonb("permissions")
            .notNull()
            .default(["view_classes", "create_assignments", "grade_submissions", "view_students"]),
        inviteStatus: universityMemberInviteStatusEnum("invite_status").notNull().default("ACCEPTED"),
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
        uniqueIndex("idx_um_user_id_university_id").on(table.userId, table.universityId),
        index("idx_um_user_id").on(table.userId),
        index("idx_um_university_id").on(table.universityId),
        index("idx_um_department_id").on(table.departmentId),
        index("idx_um_email").on(table.email),
        index("idx_um_role").on(table.role),
    ],
);

export const universityClasses = pgTable(
    "university_class",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
        name: text("name").notNull(),
        code: text("code"),
        description: text("description"),
        semester: semesterTypeEnum("semester").notNull(),
        academicYear: text("academic_year").notNull(),
        section: text("section"),
        facultyId: text("faculty_id").references(() => universityMembers.id, { onDelete: "set null" }),
        studentCount: integer("student_count").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_uc_university_id_code_academic_year_section").on(
            table.universityId,
            table.code,
            table.academicYear,
            table.section,
        ),
        index("idx_uc_university_id").on(table.universityId),
        index("idx_uc_department_id").on(table.departmentId),
        index("idx_uc_faculty_id").on(table.facultyId),
        index("idx_uc_semester").on(table.semester),
        index("idx_uc_academic_year").on(table.academicYear),
    ],
);

export const studentUniversityLinks = pgTable(
    "student_university_link",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id").notNull(),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
        universityEmail: text("university_email").notNull(),
        verificationStatus: studentVerificationStatusEnum("verification_status")
            .notNull()
            .default("PENDING"),
        verificationOtp: text("verification_otp"),
        otpExpiresAt: timestamp("otp_expires_at"),
        verifiedAt: timestamp("verified_at"),
        rejectionReason: text("rejection_reason"),
        rollNumber: text("roll_number"),
        semester: semesterTypeEnum("semester"),
        batchYear: text("batch_year"),
        creditsAllocated: integer("credits_allocated").notNull().default(0),
        creditsUsed: integer("credits_used").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_sul_user_id_university_id").on(table.userId, table.universityId),
        uniqueIndex("idx_sul_university_id_university_email").on(table.universityId, table.universityEmail),
        uniqueIndex("idx_sul_university_id_roll_number").on(table.universityId, table.rollNumber),
        index("idx_sul_user_id").on(table.userId),
        index("idx_sul_university_id").on(table.universityId),
        index("idx_sul_department_id").on(table.departmentId),
        index("idx_sul_verification_status").on(table.verificationStatus),
    ],
);

export const classEnrollments = pgTable(
    "class_enrollment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        classId: text("class_id")
            .notNull()
            .references(() => universityClasses.id, { onDelete: "cascade" }),
        studentLinkId: text("student_link_id")
            .notNull()
            .references(() => studentUniversityLinks.id, { onDelete: "cascade" }),
        isActive: boolean("is_active").notNull().default(true),
        enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("idx_ce_class_id_student_link_id").on(table.classId, table.studentLinkId),
        index("idx_ce_class_id").on(table.classId),
        index("idx_ce_student_link_id").on(table.studentLinkId),
    ],
);

export const universityAssignments = pgTable(
    "university_assignment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        classId: text("class_id")
            .notNull()
            .references(() => universityClasses.id, { onDelete: "cascade" }),
        createdById: text("created_by_id").notNull(),
        title: text("title").notNull(),
        description: text("description"),
        instructions: text("instructions"),
        type: universityAssignmentTypeEnum("type").notNull(),
        referenceId: text("reference_id"),
        referenceUrl: text("reference_url"),
        referenceData: jsonb("reference_data"),
        deadline: timestamp("deadline"),
        maxAttempts: integer("max_attempts").notNull().default(1),
        lateSubmission: boolean("late_submission").notNull().default(false),
        latePenalty: integer("late_penalty").notNull().default(0),
        creditsRequired: integer("credits_required").notNull().default(0),
        maxScore: integer("max_score").notNull().default(100),
        passingScore: integer("passing_score").notNull().default(40),
        isAutoGraded: boolean("is_auto_graded").notNull().default(false),
        status: universityAssignmentStatusEnum("status").notNull().default("DRAFT"),
        publishedAt: timestamp("published_at"),
        closedAt: timestamp("closed_at"),
        attachments: jsonb("attachments"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_ua_class_id").on(table.classId),
        index("idx_ua_created_by_id").on(table.createdById),
        index("idx_ua_type").on(table.type),
        index("idx_ua_status").on(table.status),
        index("idx_ua_deadline").on(table.deadline),
    ],
);

export const universitySubmissions = pgTable(
    "university_submission",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        assignmentId: text("assignment_id")
            .notNull()
            .references(() => universityAssignments.id, { onDelete: "cascade" }),
        studentLinkId: text("student_link_id")
            .notNull()
            .references(() => studentUniversityLinks.id, { onDelete: "cascade" }),
        mainPlatformSubmissionId: text("main_platform_submission_id"),
        mainPlatformUrl: text("main_platform_url"),
        submissionData: jsonb("submission_data"),
        submissionUrl: text("submission_url"),
        submissionText: text("submission_text"),
        attemptNumber: integer("attempt_number").notNull().default(1),
        creditsUsed: integer("credits_used").notNull().default(0),
        status: submissionGradingStatusEnum("status").notNull().default("NOT_SUBMITTED"),
        score: integer("score"),
        maxScore: integer("max_score"),
        percentage: real("percentage"),
        passed: boolean("passed"),
        feedback: text("feedback"),
        gradedById: text("graded_by_id"),
        gradedAt: timestamp("graded_at"),
        autoGradeResult: jsonb("auto_grade_result"),
        autoGradedAt: timestamp("auto_graded_at"),
        isLate: boolean("is_late").notNull().default(false),
        latePenalty: integer("late_penalty").notNull().default(0),
        submittedAt: timestamp("submitted_at"),
        startedAt: timestamp("started_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_us_assignment_id_student_link_id_attempt_number").on(
            table.assignmentId,
            table.studentLinkId,
            table.attemptNumber,
        ),
        index("idx_us_assignment_id").on(table.assignmentId),
        index("idx_us_student_link_id").on(table.studentLinkId),
        index("idx_us_status").on(table.status),
        index("idx_us_main_platform_submission_id").on(table.mainPlatformSubmissionId),
    ],
);

export const companyUniversityLinks = pgTable(
    "company_university_link",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        companyId: text("company_id").notNull(),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        referredById: text("referred_by_id"),
        referralCode: text("referral_code").unique(),
        isPartner: boolean("is_partner").notNull().default(false),
        partnerSince: timestamp("partner_since"),
        jobsPosted: integer("jobs_posted").notNull().default(0),
        studentsHired: integer("students_hired").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_cul_company_id_university_id").on(table.companyId, table.universityId),
        index("idx_cul_company_id").on(table.companyId),
        index("idx_cul_university_id").on(table.universityId),
        index("idx_cul_referred_by_id").on(table.referredById),
    ],
);

export const universityJobs = pgTable(
    "university_job",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        jobId: text("job_id").notNull(),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        visibility: universityJobVisibilityEnum("visibility").notNull().default("UNIVERSITY_ONLY"),
        filters: jsonb("filters"),
        taggedById: text("tagged_by_id"),
        applications: integer("applications").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        uniqueIndex("idx_uj_job_id_university_id").on(table.jobId, table.universityId),
        index("idx_uj_job_id").on(table.jobId),
        index("idx_uj_university_id").on(table.universityId),
        index("idx_uj_visibility").on(table.visibility),
    ],
);

export const universityCreditTransactions = pgTable(
    "university_credit_transaction",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        amount: integer("amount").notNull(),
        balance: integer("balance").notNull(),
        description: text("description"),
        referenceType: text("reference_type"),
        referenceId: text("reference_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_uct_university_id").on(table.universityId),
        index("idx_uct_type").on(table.type),
        index("idx_uct_created_at").on(table.createdAt),
    ],
);

export const universityInvitations = pgTable(
    "university_invitation",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        email: text("email").notNull(),
        universityName: text("university_name"),
        invitedBy: text("invited_by"),
        inviteCode: text("invite_code").notNull().unique(),
        status: universityMemberInviteStatusEnum("status").notNull().default("PENDING"),
        acceptedAt: timestamp("accepted_at"),
        expiresAt: timestamp("expires_at"),
        metadata: jsonb("metadata"),
        universityId: text("university_id").references(() => universities.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_uinv_email").on(table.email),
        index("idx_uinv_invite_code").on(table.inviteCode),
        index("idx_uinv_status").on(table.status),
    ],
);

export const universityMemberInvitations = pgTable(
    "university_member_invitation",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        name: text("name"),
        departmentId: text("department_id"),
        role: universityMemberRoleEnum("role").notNull().default("FACULTY"),
        jobTitle: universityMemberJobTitleEnum("job_title").notNull().default("OTHER"),
        inviteCode: text("invite_code").notNull().unique(),
        invitedById: text("invited_by_id")
            .notNull()
            .references(() => universityMembers.id, { onDelete: "cascade" }),
        status: universityMemberInviteStatusEnum("status").notNull().default("PENDING"),
        message: text("message"),
        expiresAt: timestamp("expires_at"),
        acceptedAt: timestamp("accepted_at"),
        resultingMemberId: text("resulting_member_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("idx_umi_email").on(table.email),
        index("idx_umi_invite_code").on(table.inviteCode),
        index("idx_umi_status").on(table.status),
        index("idx_umi_university_id").on(table.universityId),
    ],
);

export const universitySubscriptions = pgTable(
    "university_subscription",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .unique()
            .references(() => universities.id, { onDelete: "cascade" }),
        plan: universitySubscriptionPlanEnum("plan").notNull().default("FREE"),
        status: universitySubscriptionStatusEnum("status").notNull().default("ACTIVE"),
        maxStudents: integer("max_students").notNull().default(500),
        maxFaculty: integer("max_faculty").notNull().default(10),
        maxDepartments: integer("max_departments").notNull().default(5),
        maxClassesPerFaculty: integer("max_classes_per_faculty").notNull().default(5),
        maxCreditsPerMonth: integer("max_credits_per_month").notNull().default(100000),
        hasAnalytics: boolean("has_analytics").notNull().default(false),
        hasAdvancedReports: boolean("has_advanced_reports").notNull().default(false),
        hasPlacementModule: boolean("has_placement_module").notNull().default(false),
        hasCompanyPortal: boolean("has_company_portal").notNull().default(false),
        hasAPIAccess: boolean("has_api_access").notNull().default(false),
        hasPrioritySupport: boolean("has_priority_support").notNull().default(false),
        hasWhiteLabel: boolean("has_white_label").notNull().default(false),
        hasCustomBranding: boolean("has_custom_branding").notNull().default(false),
        billingCycle: text("billing_cycle").notNull().default("monthly"),
        amount: integer("amount").notNull().default(0),
        currency: text("currency").notNull().default("INR"),
        currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
        currentPeriodEnd: timestamp("current_period_end"),
        dodoSubscriptionId: text("dodo_subscription_id"),
        dodoCustomerId: text("dodo_customer_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_usub_plan").on(table.plan),
        index("idx_usub_status").on(table.status),
    ],
);

export const universityPayments = pgTable(
    "university_payment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        amount: integer("amount").notNull(),
        currency: text("currency").notNull().default("INR"),
        status: text("status").notNull().default("PENDING"),
        description: text("description"),
        dodoPaymentId: text("dodo_payment_id"),
        dodoCheckoutSessionId: text("dodo_checkout_session_id"),
        invoiceId: text("invoice_id"),
        metadata: jsonb("metadata"),
        paidAt: timestamp("paid_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_upay_university_id").on(table.universityId),
        index("idx_upay_status").on(table.status),
        index("idx_upay_dodo_payment_id").on(table.dodoPaymentId),
    ],
);

export const universityInvoices = pgTable(
    "university_invoice",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        universityId: text("university_id")
            .notNull()
            .references(() => universities.id, { onDelete: "cascade" }),
        invoiceNumber: text("invoice_number").notNull().unique(),
        status: text("status").notNull().default("DRAFT"),
        invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
        dueDate: timestamp("due_date"),
        paidAt: timestamp("paid_at"),
        subtotal: integer("subtotal").notNull(),
        taxAmount: integer("tax_amount").notNull().default(0),
        taxRate: real("tax_rate").notNull().default(18.0),
        discount: integer("discount").notNull().default(0),
        totalAmount: integer("total_amount").notNull(),
        currency: text("currency").notNull().default("INR"),
        lineItems: jsonb("line_items").notNull(),
        billingName: text("billing_name"),
        billingEmail: text("billing_email"),
        billingAddress: text("billing_address"),
        billingCity: text("billing_city"),
        billingState: text("billing_state"),
        billingCountry: text("billing_country"),
        billingPincode: text("billing_pincode"),
        gstNumber: text("gst_number"),
        pdfUrl: text("pdf_url"),
        notes: text("notes"),
        paymentId: text("payment_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        index("idx_uinvo_university_id").on(table.universityId),
        index("idx_uinvo_status").on(table.status),
        index("idx_uinvo_invoice_date").on(table.invoiceDate),
    ],
);

// ===========================
// Relations
// ===========================

export const universitiesRelations = relations(universities, ({ many }) => ({
    departments: many(departments),
    members: many(universityMembers),
    classes: many(universityClasses),
    studentLinks: many(studentUniversityLinks),
    companyLinks: many(companyUniversityLinks),
    jobs: many(universityJobs),
    creditTransactions: many(universityCreditTransactions),
    invitations: many(universityInvitations),
    memberInvitations: many(universityMemberInvitations),
    subscription: many(universitySubscriptions),
    payments: many(universityPayments),
    invoices: many(universityInvoices),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
    university: one(universities, {
        fields: [departments.universityId],
        references: [universities.id],
    }),
    members: many(universityMembers),
    classes: many(universityClasses),
    studentLinks: many(studentUniversityLinks),
}));

export const universityMembersRelations = relations(universityMembers, ({ one, many }) => ({
    university: one(universities, {
        fields: [universityMembers.universityId],
        references: [universities.id],
    }),
    department: one(departments, {
        fields: [universityMembers.departmentId],
        references: [departments.id],
    }),
    invitedBy: one(universityMembers, {
        fields: [universityMembers.invitedById],
        references: [universityMembers.id],
        relationName: "InvitedByMember",
    }),
    invitedMembers: many(universityMembers, {
        relationName: "InvitedByMember",
    }),
    facultyClasses: many(universityClasses, {
        relationName: "ClassFaculty",
    }),
    sentInvitations: many(universityMemberInvitations, {
        relationName: "SentInvitations",
    }),
}));

export const universityClassesRelations = relations(universityClasses, ({ one, many }) => ({
    university: one(universities, {
        fields: [universityClasses.universityId],
        references: [universities.id],
    }),
    department: one(departments, {
        fields: [universityClasses.departmentId],
        references: [departments.id],
    }),
    faculty: one(universityMembers, {
        fields: [universityClasses.facultyId],
        references: [universityMembers.id],
        relationName: "ClassFaculty",
    }),
    enrollments: many(classEnrollments),
    assignments: many(universityAssignments),
}));

export const studentUniversityLinksRelations = relations(studentUniversityLinks, ({ one, many }) => ({
    university: one(universities, {
        fields: [studentUniversityLinks.universityId],
        references: [universities.id],
    }),
    department: one(departments, {
        fields: [studentUniversityLinks.departmentId],
        references: [departments.id],
    }),
    enrollments: many(classEnrollments),
    submissions: many(universitySubmissions),
}));

export const classEnrollmentsRelations = relations(classEnrollments, ({ one }) => ({
    class: one(universityClasses, {
        fields: [classEnrollments.classId],
        references: [universityClasses.id],
    }),
    studentLink: one(studentUniversityLinks, {
        fields: [classEnrollments.studentLinkId],
        references: [studentUniversityLinks.id],
    }),
}));

export const universityAssignmentsRelations = relations(universityAssignments, ({ one, many }) => ({
    class: one(universityClasses, {
        fields: [universityAssignments.classId],
        references: [universityClasses.id],
    }),
    submissions: many(universitySubmissions),
}));

export const universitySubmissionsRelations = relations(universitySubmissions, ({ one }) => ({
    assignment: one(universityAssignments, {
        fields: [universitySubmissions.assignmentId],
        references: [universityAssignments.id],
    }),
    studentLink: one(studentUniversityLinks, {
        fields: [universitySubmissions.studentLinkId],
        references: [studentUniversityLinks.id],
    }),
}));

export const companyUniversityLinksRelations = relations(companyUniversityLinks, ({ one }) => ({
    university: one(universities, {
        fields: [companyUniversityLinks.universityId],
        references: [universities.id],
    }),
}));

export const universityJobsRelations = relations(universityJobs, ({ one }) => ({
    university: one(universities, {
        fields: [universityJobs.universityId],
        references: [universities.id],
    }),
}));

export const universityCreditTransactionsRelations = relations(universityCreditTransactions, ({ one }) => ({
    university: one(universities, {
        fields: [universityCreditTransactions.universityId],
        references: [universities.id],
    }),
}));

export const universityInvitationsRelations = relations(universityInvitations, ({ one }) => ({
    university: one(universities, {
        fields: [universityInvitations.universityId],
        references: [universities.id],
    }),
}));

export const universityMemberInvitationsRelations = relations(universityMemberInvitations, ({ one }) => ({
    university: one(universities, {
        fields: [universityMemberInvitations.universityId],
        references: [universities.id],
    }),
    invitedBy: one(universityMembers, {
        fields: [universityMemberInvitations.invitedById],
        references: [universityMembers.id],
        relationName: "SentInvitations",
    }),
}));

export const universitySubscriptionsRelations = relations(universitySubscriptions, ({ one }) => ({
    university: one(universities, {
        fields: [universitySubscriptions.universityId],
        references: [universities.id],
    }),
}));

export const universityPaymentsRelations = relations(universityPayments, ({ one }) => ({
    university: one(universities, {
        fields: [universityPayments.universityId],
        references: [universities.id],
    }),
}));

export const universityInvoicesRelations = relations(universityInvoices, ({ one }) => ({
    university: one(universities, {
        fields: [universityInvoices.universityId],
        references: [universities.id],
    }),
}));
