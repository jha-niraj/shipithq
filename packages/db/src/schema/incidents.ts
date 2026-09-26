import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./schema";
import type { VoiceMode, VoiceTurn } from "./mock";

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

/**
 * A case (plan/incidents INC-11). Authored in apps/main/content/incidents (typed files in
 * the repo) and written here by `pnpm script incidents-seed`; the app reads cases and
 * steps from these tables. `version` is a hash of the authored content, so the script
 * knows what changed.
 */
export const incidentCases = pgTable(
    "incident_case",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        slug: text("slug").notNull(),
        title: text("title").notNull(),
        summary: text("summary").notNull(),
        topic: text("topic").notNull(),
        minutes: integer("minutes").notNull(),
        /** DRAFT cases are hidden from readers. */
        status: text("status").$type<"DRAFT" | "LIVE">().notNull().default("LIVE"),
        /** The case-level material steps refer to: sources, the simulator spec id, the diagram id. */
        meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
        version: text("version").notNull(),
        publishedAt: timestamp("published_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    },
    (t) => [uniqueIndex("uq_incident_case_slug").on(t.slug), index("idx_incident_case_topic").on(t.topic)],
);

/**
 * One step of a case's player: a story beat, a diagram focus, a quiz, the simulator, a
 * talk-it-through, the checklist. `key` is stable across re-seeds, so a reader's saved
 * answers and place survive an edit; `content` is the step's own data, shaped by `kind`.
 */
export const incidentSteps = pgTable(
    "incident_step",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        caseId: text("case_id").notNull().references(() => incidentCases.id, { onDelete: "cascade" }),
        key: text("key").notNull(),
        ordinal: integer("ordinal").notNull(),
        /** The part it belongs to in the step list (The incident, The model, ...). */
        part: text("part").notNull(),
        kind: text("kind").notNull(),
        title: text("title").notNull(),
        content: jsonb("content").$type<Record<string, unknown>>().notNull(),
        /** XP a first-try correct answer on this step earns; 0 for reading steps. */
        xp: integer("xp").notNull().default(0),
    },
    (t) => [uniqueIndex("uq_incident_step_key").on(t.caseId, t.key), index("idx_incident_step_order").on(t.caseId, t.ordinal)],
);

/**
 * A talk-it-through conversation on a case (INC-15): the columns the Sarvam live
 * interview reads and writes for every kind of voice session (lib/voice/session.ts),
 * plus the feedback. Free, 3 a day per reader (overview, round 3).
 */
export const incidentMockSessions = pgTable(
    "incident_mock_session",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        caseSlug: text("case_slug").notNull(),
        stepKey: text("step_key").notNull(),
        status: text("status").$type<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "FAILED">().notNull().default("SCHEDULED"),
        mode: text("mode").$type<VoiceMode>(),
        interactionId: text("interaction_id"),
        consentText: text("consent_text"),
        consentedAt: timestamp("consented_at"),
        /** As the browser reported them: display only. Feedback reads the saved turns. */
        turns: jsonb("turns").$type<VoiceTurn[]>().notNull().default([]),
        signedUrlCount: integer("signed_url_count").notNull().default(0),
        endsAt: timestamp("ends_at"),
        /** The agent's brief: the case, and what the reader answered so far. */
        variables: jsonb("variables").$type<Record<string, string>>().notNull().default({}),
        feedback: jsonb("feedback").$type<{ summary: string; strengths: string[]; gaps: string[]; score: number } | null>(),
        startedAt: timestamp("started_at"),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("idx_incident_mock_user_day").on(t.userId, t.createdAt), index("idx_incident_mock_case").on(t.userId, t.caseSlug)],
);
