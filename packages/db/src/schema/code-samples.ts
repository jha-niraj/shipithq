import { pgTable, text, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

/*
 * Reference code ShipItHQ shows read-only (plan/long-jobs-vercel LJV-3): a small app at one
 * or more stages ("inline", "workflow"), read by the code viewer in incidents, Pathfinder
 * and projects. Written only by `pnpm script code-samples`, from `samples/<slug>/<stage>/`
 * in the repo or from a real repo with `--from`. Never edited in the app.
 */

export type CodeSampleStage = {
    /** The folder name and the id the viewer uses: "inline". */
    id: string
    /** Shown on the stage switch: "Inline". */
    label: string
    /** One line: what this stage is. */
    note: string
}

export const codeSamples = pgTable(
    "code_sample",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        slug: text("slug").notNull(),
        title: text("title").notNull(),
        summary: text("summary").notNull(),
        /** The public repo, once there is one. */
        repoUrl: text("repo_url"),
        /** In order: the viewer's stage switch and Compare follow it. */
        stages: jsonb("stages").$type<CodeSampleStage[]>().notNull(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("uq_code_sample_slug").on(t.slug)],
)

export const codeSampleFiles = pgTable(
    "code_sample_file",
    {
        id: text("id").primaryKey().$defaultFn(() => createId()),
        sampleId: text("sample_id").notNull().references(() => codeSamples.id, { onDelete: "cascade" }),
        stage: text("stage").notNull(),
        /** Relative to the stage's root, forward slashes: "app/api/report/inline/route.ts". */
        path: text("path").notNull(),
        /** For highlighting: "tsx", "ts", "json", "css", "markdown", "text". */
        language: text("language").notNull(),
        content: text("content").notNull(),
        lines: integer("lines").notNull(),
    },
    (t) => [
        uniqueIndex("uq_code_sample_file").on(t.sampleId, t.stage, t.path),
        index("idx_code_sample_file_sample").on(t.sampleId),
    ],
)
