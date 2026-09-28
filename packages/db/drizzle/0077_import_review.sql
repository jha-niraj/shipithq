ALTER TYPE "public"."imported_job_status" ADD VALUE 'REVIEW' BEFORE 'NEEDS_TEXT';--> statement-breakpoint
ALTER TABLE "imported_job" ADD COLUMN "read_text" text;--> statement-breakpoint
ALTER TABLE "imported_job" ADD COLUMN "draft_hash" text;--> statement-breakpoint
ALTER TABLE "imported_job" ADD COLUMN "facts" jsonb;--> statement-breakpoint
ALTER TABLE "imported_job" ADD COLUMN "built_at" timestamp;