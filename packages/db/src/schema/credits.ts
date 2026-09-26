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
    decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users, creditTypeEnum, creditRequestStatusEnum, paymentStatusEnum, currencyEnum } from "./schema";

// ===========================
// Enums
// ===========================

export const moduleEnum = pgEnum("module", [
    "PATHFINDER",
    "CONCEPTS",
    "RESUME_TEMPLATE",
    "RESUME_DRAFT",
]);

// ===========================
// Tables
// ===========================

export const subTransactions = pgTable(
    "sub_transaction",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        creditTransactionId: text("credit_transaction_id").notNull().unique().references(() => creditTransactions.id, { onDelete: "cascade" }),
        module: moduleEnum("module").notNull(),
        referenceId: text("reference_id"),
        metadata: jsonb("metadata"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("sub_transaction_module_idx").on(t.module),
        index("sub_transaction_reference_id_idx").on(t.referenceId),
        index("sub_transaction_module_reference_id_idx").on(t.module, t.referenceId),
    ]
);

export const earnings = pgTable(
    "earning",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull(),
        module: moduleEnum("module").notNull(),
        referenceId: text("reference_id"),
        amount: integer("amount").notNull(),
        sourceUserId: text("source_user_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("earning_user_id_idx").on(t.userId),
        index("earning_module_idx").on(t.module),
        index("earning_reference_id_idx").on(t.referenceId),
        index("earning_user_id_module_idx").on(t.userId, t.module),
    ]
);

export const referrals = pgTable(
    "referral",
    {
        id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
        referrerId: text("referrer_id").references(() => users.id, { onDelete: "set null" }),
        referredUserId: text("referred_user_id").unique().references(() => users.id, { onDelete: "set null" }),
        referralCode: text("referral_code").notNull(),
        pointsAwarded: boolean("points_awarded").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("referral_referrer_id_idx").on(t.referrerId),
        index("referral_referral_code_idx").on(t.referralCode),
    ]
);

export const creditTransfers = pgTable(
    "credit_transfer",
    {
        id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
        senderId: text("sender_id").references(() => users.id, { onDelete: "set null" }),
        receiverId: text("receiver_id").references(() => users.id, { onDelete: "set null" }),
        amount: integer("amount").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        transferReference: text("transfer_reference").notNull().unique().$defaultFn(() => createId()),
    },
    (t) => [
        index("credit_transfer_sender_id_idx").on(t.senderId),
        index("credit_transfer_receiver_id_idx").on(t.receiverId),
    ]
);

export const creditTransactions = pgTable(
    "credit_transaction",
    {
        id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        currency: currencyEnum("currency").notNull(),
        amount: integer("amount").notNull(),
        type: creditTypeEnum("type").notNull(),
        description: text("description").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        paymentId: text("payment_id"),
    },
    (t) => [
        index("credit_transaction_user_id_idx").on(t.userId),
        index("credit_transaction_payment_id_idx").on(t.paymentId),
        index("credit_transaction_created_at_idx").on(t.createdAt),
    ]
);

/**
 * A reservation against a user's balance for work that might fail.
 *
 * The problem this solves: every paid flow used to debit credits and *then* call
 * an LLM. When the call failed - error, timeout, bad JSON - the user had paid and
 * received nothing, and there was no record that a refund was owed.
 * `_refundCredits()` existed in the projects action layer and was never once
 * called.
 *
 * Lifecycle: `held` → `settled` (work succeeded, keep the charge) or
 * `released` (work failed, money returned).
 *
 * `holdId` is the idempotency key and is the whole point of the table. For work
 * that runs on a Durable Object it is the job id, because a DO alarm can re-fire
 * after an eviction - without a unique key on the hold, a retry either double
 * charges or double refunds. The unique constraint makes both impossible at the
 * database level rather than by convention.
 */
export const creditHolds = pgTable(
    "credit_hold",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        /** Idempotency key. The background job id where one exists. */
        holdId: text("hold_id").notNull().unique(),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        amount: integer("amount").notNull(),
        /** "held" | "settled" | "released" */
        status: text("status").notNull().default("held"),
        /** What the charge was for - mirrored into the ledger description. */
        reason: text("reason").notNull(),
        /** Why it was released, when it was. */
        releaseReason: text("release_reason"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (t) => [
        index("credit_hold_user_id_idx").on(t.userId),
        index("credit_hold_status_idx").on(t.status),
    ]
);

export const creditRequests = pgTable(
    "credit_request",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        requestedCredits: integer("requested_credits").notNull(),
        linkedinPostUrl: text("linkedin_post_url").notNull(),
        twitterPostUrl: text("twitter_post_url"),
        status: creditRequestStatusEnum("status").notNull().default("PENDING"),
        adminNotes: text("admin_notes"),
        processedAt: timestamp("processed_at"),
        processedBy: text("processed_by"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
    },
    (t) => [
        index("credit_request_user_id_idx").on(t.userId),
        index("credit_request_status_idx").on(t.status),
        index("credit_request_created_at_idx").on(t.createdAt),
    ]
);

// `creditTransferOuts` ("Platform Transfers" - credits sent out to TrueFool) was removed
// here. The concept is dropped; nothing reads or writes it any more.
//
// NOTE: `creditTransfers` below is a DIFFERENT table - user-to-user transfers inside the
// product - and is still used by the admin app and by credits.action.ts. Do not confuse them.

export const payments = pgTable(
    "payment",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        credits: integer("credits").notNull(),
        amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
        currency: currencyEnum("currency").notNull().default("INR"),
        status: paymentStatusEnum("status").notNull().default("PENDING"),
        orderId: text("order_id").unique(),
        paymentId: text("payment_id").unique(),
        razorpayOrderId: text("razorpay_order_id").unique(),
        signature: text("signature"),
        receipt: text("receipt"),
        notes: jsonb("notes"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().$onUpdateFn(() => new Date()),
        completedAt: timestamp("completed_at"),
    },
    (t) => [
        index("payment_user_id_idx").on(t.userId),
        index("payment_status_idx").on(t.status),
        index("payment_order_id_idx").on(t.orderId),
        index("payment_payment_id_idx").on(t.paymentId),
        index("payment_created_at_idx").on(t.createdAt),
    ]
);

// ===========================
// Relations
// ===========================

export const subTransactionsRelations = relations(subTransactions, ({ one }) => ({
    creditTransaction: one(creditTransactions, {
        fields: [subTransactions.creditTransactionId],
        references: [creditTransactions.id],
    }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
    referrer: one(users, {
        fields: [referrals.referrerId],
        references: [users.id],
        relationName: "Referrer",
    }),
    referredUser: one(users, {
        fields: [referrals.referredUserId],
        references: [users.id],
        relationName: "ReferredUser",
    }),
}));

export const creditTransfersRelations = relations(creditTransfers, ({ one }) => ({
    sender: one(users, {
        fields: [creditTransfers.senderId],
        references: [users.id],
        relationName: "Sender",
    }),
    receiver: one(users, {
        fields: [creditTransfers.receiverId],
        references: [users.id],
        relationName: "Receiver",
    }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one, many }) => ({
    user: one(users, {
        fields: [creditTransactions.userId],
        references: [users.id],
    }),
    subTransaction: many(subTransactions),
}));

export const creditRequestsRelations = relations(creditRequests, ({ one }) => ({
    user: one(users, {
        fields: [creditRequests.userId],
        references: [users.id],
    }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
    user: one(users, {
        fields: [payments.userId],
        references: [users.id],
    }),
}));
