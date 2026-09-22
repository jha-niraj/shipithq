CREATE TABLE "practice_learner_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"module" "practice_module" NOT NULL,
	"concepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mistakes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deleted_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_problem" ADD COLUMN "function_signature" text;--> statement-breakpoint
ALTER TABLE "practice_problem" ADD COLUMN "harness" jsonb;--> statement-breakpoint
ALTER TABLE "practice_problem" ADD COLUMN "judge_tests" jsonb;--> statement-breakpoint
ALTER TABLE "practice_problem" ADD COLUMN "reference_solution" jsonb;--> statement-breakpoint
ALTER TABLE "practice_problem" ADD COLUMN "judge_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_problem" ADD COLUMN "judge_error" text;--> statement-breakpoint
ALTER TABLE "practice_user_session" ADD COLUMN "stage" text DEFAULT 'understand' NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_user_session" ADD COLUMN "mentor_state" jsonb;--> statement-breakpoint
ALTER TABLE "practice_user_session" ADD COLUMN "memory_watermark" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_user_session" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "practice_learner_profile" ADD CONSTRAINT "practice_learner_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_practice_learner_profile_user_id_module" ON "practice_learner_profile" USING btree ("user_id","module");