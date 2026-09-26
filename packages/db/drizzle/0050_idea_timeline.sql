ALTER TYPE "public"."feedback_status" ADD VALUE 'IN_PROGRESS';--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "team_update" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "shipped_href" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "planned_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "shipped_at" timestamp;