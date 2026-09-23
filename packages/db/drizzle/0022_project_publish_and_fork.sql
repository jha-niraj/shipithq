ALTER TABLE "project_v2" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_v2" ADD COLUMN "forked_from_id" text;--> statement-breakpoint
ALTER TABLE "project_v2" ADD CONSTRAINT "project_v2_forked_from_id_project_v2_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."project_v2"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_v2_forked_from_id" ON "project_v2" USING btree ("forked_from_id");--> statement-breakpoint
-- Backfill: every project public today is treated as published as of its newest
-- sprint or task, so nothing visible now disappears. The snapshot rule applies
-- to what is added from here on (plan/projects PJ-18).
UPDATE "project_v2" p SET "published_at" = GREATEST(
    p."created_at",
    COALESCE((SELECT MAX(s."created_at") FROM "project_v2_sprint" s WHERE s."project_id" = p."id"), p."created_at"),
    COALESCE((SELECT MAX(t."created_at") FROM "project_v2_task" t JOIN "project_v2_sprint" s ON s."id" = t."sprint_id" WHERE s."project_id" = p."id"), p."created_at")
) WHERE p."visibility" = 'PUBLIC';
