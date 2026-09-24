CREATE TABLE "project_ai_message" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"task_id" text,
	"proposal" jsonb,
	"proposal_status" text,
	"job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_ai_message" ADD CONSTRAINT "project_ai_message_project_id_project_v2_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_message" ADD CONSTRAINT "project_ai_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_ai_message_project_created" ON "project_ai_message" USING btree ("project_id","created_at");