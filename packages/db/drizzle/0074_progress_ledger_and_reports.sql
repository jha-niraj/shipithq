CREATE TYPE "public"."report_frequency" AS ENUM('WEEKLY', 'HALF_MONTHLY', 'MONTHLY', 'OFF');--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PROJECT_TASK_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PROJECT_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PROJECT_QUIZ_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PROJECT_MOCK_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PATHFINDER_STEP_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PATHFINDER_QUIZ_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'PATHFINDER_CODING_PASSED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'INCIDENT_CHECK_ANSWERED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'INCIDENT_ROUND_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'INCIDENT_CASE_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'INCIDENT_REPORT_READY';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'INCIDENT_MOCK_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'HIRING_ROUND_SUBMITTED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'HIRING_ROUND_SCORED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'HIRING_RESULTS_SENT';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'REFERRAL_REQUESTED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'JOB_SAVED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'JOB_IMPORTED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'RESUME_CREATED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'COVER_LETTER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'KNOWME_ACTIVATED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'IDEA_VOTED';--> statement-breakpoint
CREATE TABLE "progress_report" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"frequency" "report_frequency" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"data" jsonb NOT NULL,
	"share_token" text,
	"emailed_at" timestamp,
	"viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "progress_report_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "report_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"frequency" "report_frequency" DEFAULT 'WEEKLY' NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_preference_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "activity_entry" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "progress_report" ADD CONSTRAINT "progress_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_preference" ADD CONSTRAINT "report_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_progress_report_user_frequency_start" ON "progress_report" USING btree ("user_id","frequency","period_start");--> statement-breakpoint
CREATE INDEX "idx_progress_report_user_created" ON "progress_report" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_activity_entry_user_id_dedupe_key" ON "activity_entry" USING btree ("user_id","dedupe_key");