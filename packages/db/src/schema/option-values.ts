import { pgTable, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

/*
 * Values people typed through "Other" (plan/hiring-ui HU-2), per kind of field. A value
 * shows to everyone once 3 different organisations have used it (Niraj, 2026-09-28); an
 * organisation sees its own at once. Admins hide junk with `hidden`.
 */
export const optionValues = pgTable(
    "option_value",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        kind: text("kind").notNull(),
        /** As first typed, cleaned ("Node.js"). */
        value: text("value").notNull(),
        /** The comparison key (src/option-builtins.ts `optionKey`). */
        key: text("key").notNull(),
        hidden: boolean("hidden").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("uq_option_value_kind_key").on(t.kind, t.key)],
)

/** One organisation's use of a value: `company:<id>` or `user:<id>` for a student. */
export const optionValueUses = pgTable(
    "option_value_use",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        optionId: text("option_id").notNull().references(() => optionValues.id, { onDelete: "cascade" }),
        org: text("org").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("uq_option_value_use").on(t.optionId, t.org), index("idx_option_value_use_org").on(t.org)],
)
