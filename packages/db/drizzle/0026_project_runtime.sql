ALTER TABLE "project_v2" ADD COLUMN "runtime" text DEFAULT 'browser' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_project_v2_runtime" ON "project_v2" USING btree ("runtime");--> statement-breakpoint
-- Backfill (plan/project-workspace WS-10). Curated: only the two projects with a
-- browser starter run in the workspace today.
UPDATE "project_v2" SET "runtime" = 'server'
WHERE "is_platform_seeded" = true
  AND "slug" NOT IN ('habit-tracker-weekly-review', 'markdown-notes-with-search');
--> statement-breakpoint
-- Generated before this: a declared backend means it cannot run in the browser.
UPDATE "project_v2" SET "runtime" = 'server'
WHERE "is_platform_seeded" = false AND "forked_from_id" IS NULL
  AND COALESCE(NULLIF(TRIM("stacks"->>'backend'), ''), 'None') NOT IN ('None', 'none');
--> statement-breakpoint
-- A copy runs wherever its original runs.
UPDATE "project_v2" c SET "runtime" = o."runtime"
FROM "project_v2" o WHERE c."forked_from_id" = o."id";
