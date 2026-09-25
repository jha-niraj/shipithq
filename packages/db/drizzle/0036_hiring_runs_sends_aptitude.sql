CREATE TYPE "public"."aptitude_difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD');--> statement-breakpoint
CREATE TYPE "public"."aptitude_question_status" AS ENUM('DRAFT', 'LIVE');--> statement-breakpoint
CREATE TYPE "public"."aptitude_section" AS ENUM('QUANT', 'LOGICAL', 'VERBAL');--> statement-breakpoint
CREATE TYPE "public"."hiring_attempt_status" AS ENUM('IN_PROGRESS', 'SUBMITTED', 'SCORED', 'NOT_SCORED');--> statement-breakpoint
CREATE TYPE "public"."hiring_outcome" AS ENUM('INTERVIEWING', 'OFFER', 'HIRED', 'NOT_SELECTED');--> statement-breakpoint
CREATE TYPE "public"."hiring_run_status" AS ENUM('IN_PROGRESS', 'COMPLETE', 'SENT', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."hiring_send_status" AS ENUM('SENT', 'VIEWED', 'INVITED', 'DECLINED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "aptitude_question" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"company_id" text,
	"section" "aptitude_section" NOT NULL,
	"topic" text NOT NULL,
	"difficulty" "aptitude_difficulty" NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"status" "aptitude_question_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aptitude_question_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "hiring_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"round_id" text,
	"attempt_number" integer NOT NULL,
	"drawn_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "hiring_attempt_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"submitted_at" timestamp,
	"score" integer,
	"breakdown" jsonb,
	"ai_rubric_result" jsonb,
	"transcript_ref" text,
	"integrity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credits_held" integer DEFAULT 0 NOT NULL,
	"worker_job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_run" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"process_id" text,
	"status" "hiring_run_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_send" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"job_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"profile" jsonb NOT NULL,
	"consent_text" text NOT NULL,
	"consented_at" timestamp NOT NULL,
	"status" "hiring_send_status" DEFAULT 'SENT' NOT NULL,
	"company_message" text,
	"feedback" text,
	"decided_at" timestamp,
	"email_revealed_at" timestamp,
	"company_outcome" "hiring_outcome",
	"company_outcome_at" timestamp,
	"student_outcome" "hiring_outcome",
	"student_outcome_at" timestamp,
	"purge_after" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aptitude_question" ADD CONSTRAINT "aptitude_question_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_attempt" ADD CONSTRAINT "hiring_attempt_run_id_hiring_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."hiring_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_attempt" ADD CONSTRAINT "hiring_attempt_round_id_interview_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."interview_round"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_run" ADD CONSTRAINT "hiring_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_run" ADD CONSTRAINT "hiring_run_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_run" ADD CONSTRAINT "hiring_run_process_id_interview_process_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."interview_process"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_send" ADD CONSTRAINT "hiring_send_run_id_hiring_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."hiring_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_send" ADD CONSTRAINT "hiring_send_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_send" ADD CONSTRAINT "hiring_send_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_send" ADD CONSTRAINT "hiring_send_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_aptitude_question_company_section" ON "aptitude_question" USING btree ("company_id","section");--> statement-breakpoint
CREATE INDEX "idx_aptitude_question_status" ON "aptitude_question" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_hiring_attempt_run_round" ON "hiring_attempt" USING btree ("run_id","round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hiring_attempt_live" ON "hiring_attempt" USING btree ("run_id","round_id") WHERE status = 'IN_PROGRESS';--> statement-breakpoint
CREATE INDEX "idx_hiring_run_user_id" ON "hiring_run" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_hiring_run_job_id" ON "hiring_run" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hiring_run_active" ON "hiring_run" USING btree ("user_id","job_id") WHERE status = 'IN_PROGRESS';--> statement-breakpoint
CREATE INDEX "idx_hiring_send_company_job" ON "hiring_send" USING btree ("company_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_hiring_send_user_id" ON "hiring_send" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hiring_send_active" ON "hiring_send" USING btree ("user_id","job_id") WHERE status in ('SENT', 'VIEWED', 'INVITED');