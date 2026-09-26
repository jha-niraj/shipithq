CREATE TYPE "public"."company_claim_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "company_claim" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"job_title" text NOT NULL,
	"linkedin_url" text,
	"note" text,
	"status" "company_claim_request_status" DEFAULT 'PENDING' NOT NULL,
	"reject_reason" text,
	"decided_at" timestamp,
	"decided_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_claim" ADD CONSTRAINT "company_claim_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_claim" ADD CONSTRAINT "company_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_claim" ADD CONSTRAINT "company_claim_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_claim_company_id" ON "company_claim" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_claim_user_id" ON "company_claim" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_claim_pending" ON "company_claim" USING btree ("company_id") WHERE status = 'PENDING';