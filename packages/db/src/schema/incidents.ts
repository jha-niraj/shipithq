import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
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

/** The report a run ends with (plan/incidents INC-36, INC-38). Written by the worker job. */
export type IncidentBand = "STRONG" | "SOLID" | "DEVELOPING" | "NOT_SHOWN"
export interface IncidentRunReport {
    summary: string
    bands: { skill: "diagnosis" | "reasoning" | "questions" | "explaining"; band: IncidentBand; evidence: string; previous?: IncidentBand | null }[]
    highlights: { quote: string; why: string; source: { eventId?: string; sessionId?: string } }[]
    questions: { eventId: string; question: string; mark: "sharp" | "clarifying" | "off_track"; why: string }[]
    bestQuestionEventId: string | null
    checks: { chapter: string; firstTry: number; total: number; missed: string[] }[]
    nextSteps: { title: string; why: string; pathTopic: string | null }[]
    model: string
    generatedAt: string
}

/**
 * One attempt at a case that the reader agreed to have recorded (plan/incidents INC-33).
 * Consent is stored verbatim. At most one ACTIVE run per reader and case; a retake ends
 * it and opens another, so every past report stays. `incident_progress` is not touched
 * by runs: it stays the once-ever XP and unlock ledger.
 */
export const incidentRuns = pgTable(
    "incident_run",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        caseSlug: text("case_slug").notNull(),
        status: text("status").$type<"ACTIVE" | "REPORTING" | "REPORTED" | "FAILED" | "ENDED">().notNull().default("ACTIVE"),
        consentText: text("consent_text").notNull(),
        consentedAt: timestamp("consented_at").notNull().defaultNow(),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        endedAt: timestamp("ended_at"),
        reportJobId: text("report_job_id"),
        report: jsonb("report").$type<IncidentRunReport | null>(),
        reportedAt: timestamp("reported_at"),
        /** Set while the reader shares the report; cleared to stop sharing (INC-39). */
        shareToken: text("share_token").unique(),
        sharedAt: timestamp("shared_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("idx_incident_run_user_case").on(t.userId, t.caseSlug),
        uniqueIndex("uq_incident_run_active").on(t.userId, t.caseSlug).where(sql`${t.status} = 'ACTIVE'`),
    ],
);

/**
 * What happened in a run, in order (INC-33): a graded check or quiz answer, a question
 * to the lead with its answer, a talk (the transcript stays on its session), a step
 * marked done. Written by the server from graded results, never from client grades.
 */
export const incidentRunEvents = pgTable(
    "incident_run_event",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        runId: text("run_id").notNull().references(() => incidentRuns.id, { onDelete: "cascade" }),
        kind: text("kind").$type<"check" | "quiz" | "ask" | "talk" | "step" | "postmortem">().notNull(),
        itemId: text("item_id").notNull(),
        payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("idx_incident_run_event_run").on(t.runId, t.createdAt)],
);
