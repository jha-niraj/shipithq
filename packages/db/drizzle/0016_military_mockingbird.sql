CREATE TABLE "module_onboarding" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"module_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"turns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"open_question_count" integer DEFAULT 0 NOT NULL,
	"profile" jsonb,
	"level" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "module_onboarding" ADD CONSTRAINT "module_onboarding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_module_onboarding_user_module_version" ON "module_onboarding" USING btree ("user_id","module_key","version");--> statement-breakpoint
CREATE INDEX "idx_module_onboarding_user_module_status" ON "module_onboarding" USING btree ("user_id","module_key","status");