CREATE TYPE "public"."interview_report_outcome" AS ENUM('OFFER', 'REJECTED', 'NO_RESPONSE', 'WITHDREW', 'IN_PROCESS');--> statement-breakpoint
CREATE TYPE "public"."interview_report_round_type" AS ENUM('ONLINE_ASSESSMENT', 'APTITUDE', 'DSA', 'LLD', 'SYSTEM_DESIGN', 'TAKE_HOME', 'TECHNICAL', 'BEHAVIOURAL', 'HIRING_MANAGER', 'HR', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."interview_report_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "interview_report_question" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"report_id" text NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"question_key" text NOT NULL,
	"practice_problem_id" text,
	"aptitude_question_id" text
);
--> statement-breakpoint
CREATE TABLE "interview_report_round" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"position" integer NOT NULL,
	"round_type" "interview_report_round_type" NOT NULL,
	"title" text,
	"minutes" integer
);
--> statement-breakpoint
CREATE TABLE "interview_report" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"company_id" text,
	"company_request_id" text,
	"imported_job_id" text,
	"role" text NOT NULL,
	"role_key" text NOT NULL,
	"interviewed_on" date NOT NULL,
	"outcome" "interview_report_outcome" NOT NULL,
	"status" "interview_report_status" DEFAULT 'PENDING' NOT NULL,
	"reject_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"credits_rewarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_interview_report_company" CHECK ("interview_report"."company_id" is not null or "interview_report"."company_request_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "interview_report_question" ADD CONSTRAINT "interview_report_question_round_id_interview_report_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."interview_report_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report_question" ADD CONSTRAINT "interview_report_question_report_id_interview_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."interview_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report_question" ADD CONSTRAINT "interview_report_question_practice_problem_id_practice_problem_id_fk" FOREIGN KEY ("practice_problem_id") REFERENCES "public"."practice_problem"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report_question" ADD CONSTRAINT "interview_report_question_aptitude_question_id_aptitude_question_id_fk" FOREIGN KEY ("aptitude_question_id") REFERENCES "public"."aptitude_question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report_round" ADD CONSTRAINT "interview_report_round_report_id_interview_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."interview_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report" ADD CONSTRAINT "interview_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report" ADD CONSTRAINT "interview_report_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report" ADD CONSTRAINT "interview_report_company_request_id_company_request_id_fk" FOREIGN KEY ("company_request_id") REFERENCES "public"."company_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_report" ADD CONSTRAINT "interview_report_imported_job_id_imported_job_id_fk" FOREIGN KEY ("imported_job_id") REFERENCES "public"."imported_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interview_report_question_round" ON "interview_report_question" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_interview_report_question_key" ON "interview_report_question" USING btree ("question_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_report_round_position" ON "interview_report_round" USING btree ("report_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_report_once" ON "interview_report" USING btree ("user_id",coalesce("company_id", "company_request_id"),"role_key","interviewed_on") WHERE "interview_report"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_interview_report_company_status" ON "interview_report" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "idx_interview_report_request" ON "interview_report" USING btree ("company_request_id");--> statement-breakpoint
CREATE INDEX "idx_interview_report_status_created" ON "interview_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_interview_report_user_created" ON "interview_report" USING btree ("user_id","created_at");