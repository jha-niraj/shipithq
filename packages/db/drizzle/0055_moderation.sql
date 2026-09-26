CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'ACTIONED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."report_target_kind" AS ENUM('COMPANY', 'JOB', 'MESSAGE', 'STUDENT');--> statement-breakpoint
CREATE TABLE "company_block" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_user_id" text,
	"reporter_company_id" text,
	"target_kind" "report_target_kind" NOT NULL,
	"target_id" text NOT NULL,
	"target_company_id" text,
	"target_excerpt" text,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by_admin_id" text,
	"resolution_note" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "admin_hidden_at" timestamp;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "admin_hidden_reason" text;--> statement-breakpoint
ALTER TABLE "company_block" ADD CONSTRAINT "company_block_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_block" ADD CONSTRAINT "company_block_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_company_id_company_id_fk" FOREIGN KEY ("reporter_company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_target_company_id_company_id_fk" FOREIGN KEY ("target_company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_block" ON "company_block" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_report_status_created" ON "report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_report_target" ON "report" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_report_open" ON "report" USING btree ("reporter_user_id","target_kind","target_id") WHERE status = 'OPEN';