CREATE TYPE "public"."message_author_kind" AS ENUM('COMPANY', 'STUDENT');--> statement-breakpoint
CREATE TABLE "message_read" (
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_read_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"send_id" text,
	"job_id" text,
	"subject" text NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"last_email_to_student_at" timestamp,
	"last_email_to_company_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_kind" "message_author_kind" NOT NULL,
	"author_user_id" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "kind" text DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "actor" jsonb;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "thread_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_read" ADD CONSTRAINT "message_read_thread_id_message_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read" ADD CONSTRAINT "message_read_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_send_id_hiring_send_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."hiring_send"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_thread_id_message_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_message_thread_company_user" ON "message_thread" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_message_thread_user" ON "message_thread" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_message_thread_company_last" ON "message_thread" USING btree ("company_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_message_thread_created" ON "message" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notification_user_platform_created" ON "notification" USING btree ("user_id","platform","created_at");--> statement-breakpoint
CREATE INDEX "idx_notification_thread_id" ON "notification" USING btree ("thread_id");--> statement-breakpoint
-- Notifications already read get a read time (plan/inbox IN-1).
UPDATE "notification" SET "read_at" = "updated_at" WHERE "read" = true AND "read_at" IS NULL;