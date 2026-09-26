CREATE TYPE "public"."referral_offer_status" AS ENUM('ACTIVE', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."referral_request_status" AS ENUM('OPEN', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "referral_offer_code" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_offer_code_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_offer" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"work_email" text NOT NULL,
	"verified_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" "referral_offer_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_assigned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_offer_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_request" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"company_id" text NOT NULL,
	"job_id" text,
	"imported_job_id" text,
	"offer_id" text,
	"note" text NOT NULL,
	"attachment" jsonb NOT NULL,
	"share_resume" boolean DEFAULT false NOT NULL,
	"status" "referral_request_status" DEFAULT 'OPEN' NOT NULL,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chk_referral_request_job" CHECK ("referral_request"."job_id" is not null or "referral_request"."imported_job_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "referral_offer_code" ADD CONSTRAINT "referral_offer_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_offer_code" ADD CONSTRAINT "referral_offer_code_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_offer" ADD CONSTRAINT "referral_offer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_offer" ADD CONSTRAINT "referral_offer_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_request" ADD CONSTRAINT "referral_request_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_request" ADD CONSTRAINT "referral_request_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_request" ADD CONSTRAINT "referral_request_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_request" ADD CONSTRAINT "referral_request_imported_job_id_imported_job_id_fk" FOREIGN KEY ("imported_job_id") REFERENCES "public"."imported_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_request" ADD CONSTRAINT "referral_request_offer_id_referral_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."referral_offer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_referral_offer_company_status" ON "referral_offer" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referral_request_job" ON "referral_request" USING btree ("student_id",coalesce("job_id", "imported_job_id"));--> statement-breakpoint
CREATE INDEX "idx_referral_request_offer_status" ON "referral_request" USING btree ("offer_id","status");--> statement-breakpoint
CREATE INDEX "idx_referral_request_student_created" ON "referral_request" USING btree ("student_id","created_at");