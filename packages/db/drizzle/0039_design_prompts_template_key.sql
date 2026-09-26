CREATE TABLE "design_prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"company_id" text,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"rubric" jsonb NOT NULL,
	"difficulty" "aptitude_difficulty" NOT NULL,
	"status" "aptitude_question_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "design_prompt_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "interview_process" ADD COLUMN "template_key" text;--> statement-breakpoint
ALTER TABLE "design_prompt" ADD CONSTRAINT "design_prompt_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_design_prompt_company_status" ON "design_prompt" USING btree ("company_id","status");--> statement-breakpoint
ALTER TABLE "interview_process" ADD CONSTRAINT "interview_process_template_key_unique" UNIQUE("template_key");