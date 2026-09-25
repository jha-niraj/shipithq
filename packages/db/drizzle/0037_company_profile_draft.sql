CREATE TYPE "public"."company_profile_draft_status" AS ENUM('SCRAPING', 'READY', 'FAILED', 'PUBLISHED', 'DISCARDED');--> statement-breakpoint
CREATE TABLE "company_profile_draft" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"status" "company_profile_draft_status" DEFAULT 'SCRAPING' NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"degraded" boolean DEFAULT false NOT NULL,
	"failed_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"robots_skipped" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"request_id" text,
	"created_by_user_id" text,
	"company_id" text,
	"worker_job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_profile_draft" ADD CONSTRAINT "company_profile_draft_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profile_draft" ADD CONSTRAINT "company_profile_draft_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_profile_draft_domain" ON "company_profile_draft" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_company_profile_draft_status" ON "company_profile_draft" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_profile_draft_scraping" ON "company_profile_draft" USING btree ("domain") WHERE status = 'SCRAPING';