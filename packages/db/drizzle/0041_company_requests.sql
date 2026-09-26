CREATE TYPE "public"."company_request_status" AS ENUM('PENDING', 'SCRAPING', 'DRAFTED', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "company_lookup" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_request_vote" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_request" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"status" "company_request_status" DEFAULT 'PENDING' NOT NULL,
	"company_id" text,
	"reject_reason" text,
	"rejected_at" timestamp,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_request_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "company_lookup" ADD CONSTRAINT "company_lookup_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_request_vote" ADD CONSTRAINT "company_request_vote_request_id_company_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."company_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_request_vote" ADD CONSTRAINT "company_request_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_request" ADD CONSTRAINT "company_request_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_request" ADD CONSTRAINT "company_request_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_lookup_user_created_at" ON "company_lookup" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_request_vote_request_user" ON "company_request_vote" USING btree ("request_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_company_request_vote_user_id" ON "company_request_vote" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_company_request_status" ON "company_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_company_request_created_by_created_at" ON "company_request" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
ALTER TABLE "company_profile_draft" ADD CONSTRAINT "company_profile_draft_request_id_company_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."company_request"("id") ON DELETE set null ON UPDATE no action;