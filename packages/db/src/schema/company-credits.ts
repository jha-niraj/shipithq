import { pgTable, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"
import { companies } from "./hiring"

/*
 * The company credit ledger (plan/hiring-app HA-20): every change to
 * `company.credits`, in the same transaction. `key` makes a grant or a charge
 * happen once: "signup", "month:2026-09", or a charge's own id.
 */

export const companyCreditTransactions = pgTable(
    "company_credit_transaction",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
        /** Positive for a grant or a refund, negative for a spend. */
        amount: integer("amount").notNull(),
        /** GRANT_SIGNUP | GRANT_MONTHLY | SPEND | REFUND */
        kind: text("kind").notNull(),
        reason: text("reason").notNull(),
        key: text("key"),
        userId: text("user_id"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("idx_company_credit_tx_company").on(t.companyId, t.createdAt),
        uniqueIndex("uq_company_credit_tx_key").on(t.companyId, t.key),
    ],
)
