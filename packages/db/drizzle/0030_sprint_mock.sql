CREATE TABLE "project_v2_sprint_mock_session" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"sprint_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'opening' NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project_v2_sprint_mock_session" ADD CONSTRAINT "project_v2_sprint_mock_session_project_id_project_v2_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_v2_sprint_mock_session" ADD CONSTRAINT "project_v2_sprint_mock_session_sprint_id_project_v2_sprint_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."project_v2_sprint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_v2_sprint_mock_session" ADD CONSTRAINT "project_v2_sprint_mock_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_v2_sprint_mock_session_sprint_user" ON "project_v2_sprint_mock_session" USING btree ("sprint_id","user_id","created_at");