import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";

/**
 * Incidents (plan/incidents INC-4, INC-5). Case content lives in the repo
 * (apps/main/content/incidents); only a reader's progress lives here.
 *
 * One row per thing a reader did in a case: a prediction, a round answer, the fork,
 * a checklist tick, the decision tree's leaf, the case's completion. The unique key
 * (user, case, kind, item) is what makes XP once per item: an award only follows an
 * insert that actually created the row, so a replay, a second tab or a retried
 * request earns nothing (overview.md, "XP").
 */
export const incidentProgress = pgTable(
    "incident_progress",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        caseSlug: text("case_slug").notNull(),
        /** prediction | round | fork | tree | checklist | model | simulator | completion | perfect_round */
        kind: text("kind").notNull(),
        itemId: text("item_id").notNull(),
        /** The option chosen, where there is one. */
        value: text("value"),
        /** Whether the answer was right, judged on the server from the case file. */
        correct: boolean("correct"),
        /** XP actually credited for this row; 0 when none was due or the award failed. */
        xpAwarded: integer("xp_awarded").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("uq_incident_progress_item").on(t.userId, t.caseSlug, t.kind, t.itemId),
        index("idx_incident_progress_user").on(t.userId, t.createdAt),
    ],
);

/** Badges earned in Incidents (INC-5). Definitions live with the case content. */
export const incidentBadges = pgTable(
    "incident_badge",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        badgeKey: text("badge_key").notNull(),
        earnedAt: timestamp("earned_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("uq_incident_badge_user_badge").on(t.userId, t.badgeKey)],
);
