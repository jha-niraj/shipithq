CREATE TYPE "public"."pool_item_status" AS ENUM('LIVE', 'DRAFT');--> statement-breakpoint
CREATE TYPE "public"."imported_job_status" AS ENUM('QUEUED', 'FETCHING', 'NEEDS_TEXT', 'EXTRACTING', 'COMPANY', 'PLANNING', 'ROUNDS', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."imported_job_visibility" AS ENUM('PUBLIC', 'PRIVATE');--> statement-breakpoint
ALTER TYPE "public"."pipeline_owner_kind" ADD VALUE 'IMPORTED';--> statement-breakpoint
CREATE TABLE "imported_job" (
	"id" text PRIMARY KEY NOT NULL,
	"source_url" text,
	"url_hash" text,
	"source_text" text,
	"company_name_hint" text,
	"visibility" "imported_job_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"owner_id" text,
	"status" "imported_job_status" DEFAULT 'QUEUED' NOT NULL,
	"step" text,
	"error" text,
	"extracted" jsonb,
	"company_id" text,
	"company_request_id" text,
	"process_id" text,
	"background_job_id" text,
	"cost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_process" DROP CONSTRAINT "chk_interview_process_owner";--> statement-breakpoint
ALTER TABLE "hiring_round_pool_item" ADD COLUMN "status" "pool_item_status" DEFAULT 'LIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_process" ADD COLUMN "imported_job_id" text;--> statement-breakpoint
ALTER TABLE "imported_job" ADD CONSTRAINT "imported_job_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_job" ADD CONSTRAINT "imported_job_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_job" ADD CONSTRAINT "imported_job_company_request_id_company_request_id_fk" FOREIGN KEY ("company_request_id") REFERENCES "public"."company_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_job" ADD CONSTRAINT "imported_job_process_id_interview_process_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."interview_process"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_imported_job_public_url" ON "imported_job" USING btree ("url_hash") WHERE visibility = 'PUBLIC' and url_hash is not null;--> statement-breakpoint
CREATE INDEX "idx_imported_job_owner_created" ON "imported_job" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_imported_job_company" ON "imported_job" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_imported_job_request" ON "imported_job" USING btree ("company_request_id");--> statement-breakpoint
CREATE INDEX "idx_interview_process_imported_job_id" ON "interview_process" USING btree ("imported_job_id");--> statement-breakpoint
ALTER TABLE "interview_process" ADD CONSTRAINT "chk_interview_process_owner" CHECK (("interview_process"."owner_kind"::text in ('PLATFORM', 'IMPORTED')) or ("interview_process"."company_id" is not null));