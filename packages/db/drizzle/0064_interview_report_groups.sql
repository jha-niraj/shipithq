CREATE TYPE "public"."interview_report_level" AS ENUM('INTERN', 'ENTRY', 'MID', 'SENIOR');--> statement-breakpoint
CREATE TYPE "public"."interview_report_role_family" AS ENUM('SOFTWARE', 'FRONTEND', 'BACKEND', 'FULL_STACK', 'MOBILE', 'DATA_ML', 'DEVOPS_SRE', 'QA', 'PRODUCT', 'DESIGN', 'OTHER');--> statement-breakpoint
ALTER TABLE "interview_report_question" ADD COLUMN "same_as_id" text;--> statement-breakpoint
ALTER TABLE "interview_report" ADD COLUMN "role_family" "interview_report_role_family" DEFAULT 'OTHER' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_report" ADD COLUMN "level" "interview_report_level" DEFAULT 'ENTRY' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_report_question" ADD CONSTRAINT "interview_report_question_same_as_id_interview_report_question_id_fk" FOREIGN KEY ("same_as_id") REFERENCES "public"."interview_report_question"("id") ON DELETE set null ON UPDATE no action;