CREATE TYPE "public"."company_claim_status" AS ENUM('UNCLAIMED', 'CLAIM_PENDING', 'CLAIMED');--> statement-breakpoint
CREATE TYPE "public"."company_profile_source" AS ENUM('SELF_SERVE', 'SCRAPED');--> statement-breakpoint
CREATE TYPE "public"."pipeline_owner_kind" AS ENUM('COMPANY', 'PLATFORM');--> statement-breakpoint
CREATE TYPE "public"."round_gate_mode" AS ENUM('HARD', 'ADVISORY');--> statement-breakpoint
CREATE TYPE "public"."round_pool_item_kind" AS ENUM('PRACTICE_PROBLEM', 'APTITUDE_QUESTION', 'DESIGN_PROMPT');--> statement-breakpoint
CREATE TYPE "public"."round_response_mode" AS ENUM('VOICE', 'TYPED', 'EITHER');--> statement-breakpoint
ALTER TYPE "public"."interview_round_type" ADD VALUE 'APTITUDE';--> statement-breakpoint
ALTER TYPE "public"."interview_round_type" ADD VALUE 'DSA';--> statement-breakpoint
ALTER TYPE "public"."interview_round_type" ADD VALUE 'VOICE_BEHAVIOURAL';--> statement-breakpoint
ALTER TYPE "public"."interview_round_type" ADD VALUE 'VOICE_CULTURE';--> statement-breakpoint
CREATE TABLE "hiring_round_pool_item" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"kind" "round_pool_item_kind" NOT NULL,
	"ref_id" text NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_process" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "profile_source" "company_profile_source" DEFAULT 'SELF_SERVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "claim_status" "company_claim_status" DEFAULT 'CLAIMED' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "scraped_at" timestamp;--> statement-breakpoint
ALTER TABLE "interview_process" ADD COLUMN "owner_kind" "pipeline_owner_kind" DEFAULT 'COMPANY' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_process" ADD COLUMN "is_template" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_process" ADD COLUMN "source_template_id" text;--> statement-breakpoint
ALTER TABLE "interview_process" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "gate_mode" "round_gate_mode" DEFAULT 'ADVISORY' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "pass_mark" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "time_limit_minutes" integer;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "draw_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "cooldown_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "rubric" jsonb;--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "response_mode" "round_response_mode" DEFAULT 'EITHER' NOT NULL;--> statement-breakpoint
ALTER TABLE "hiring_round_pool_item" ADD CONSTRAINT "hiring_round_pool_item_round_id_interview_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."interview_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hiring_round_pool_item_round_kind_ref" ON "hiring_round_pool_item" USING btree ("round_id","kind","ref_id");--> statement-breakpoint
CREATE INDEX "idx_hiring_round_pool_item_round_id" ON "hiring_round_pool_item" USING btree ("round_id");--> statement-breakpoint
-- plan/hiring-rounds HR-1: a job pointing at a pipeline that no longer exists would
-- block the new foreign key; such links are cleared (the preview counted them first).
UPDATE "job" SET "interview_process_id" = NULL WHERE "interview_process_id" IS NOT NULL AND "interview_process_id" NOT IN (SELECT "id" FROM "interview_process");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_interview_process_id_interview_process_id_fk" FOREIGN KEY ("interview_process_id") REFERENCES "public"."interview_process"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interview_process_job_id" ON "interview_process" USING btree ("job_id");--> statement-breakpoint
ALTER TABLE "interview_process" ADD CONSTRAINT "chk_interview_process_owner" CHECK (("interview_process"."owner_kind" = 'PLATFORM') or ("interview_process"."company_id" is not null));