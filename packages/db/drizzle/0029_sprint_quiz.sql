CREATE TABLE "project_v2_sprint_quiz_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"user_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_v2_sprint_quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"sprint_id" text NOT NULL,
	"questions" jsonb NOT NULL,
	"job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_v2_sprint_quiz_sprint_id_unique" UNIQUE("sprint_id")
);
--> statement-breakpoint
ALTER TABLE "project_v2_sprint_quiz_attempt" ADD CONSTRAINT "project_v2_sprint_quiz_attempt_quiz_id_project_v2_sprint_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."project_v2_sprint_quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_v2_sprint_quiz_attempt" ADD CONSTRAINT "project_v2_sprint_quiz_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_v2_sprint_quiz" ADD CONSTRAINT "project_v2_sprint_quiz_project_id_project_v2_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_v2_sprint_quiz" ADD CONSTRAINT "project_v2_sprint_quiz_sprint_id_project_v2_sprint_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."project_v2_sprint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_v2_sprint_quiz_attempt_quiz_user" ON "project_v2_sprint_quiz_attempt" USING btree ("quiz_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_project_v2_sprint_quiz_project_id" ON "project_v2_sprint_quiz" USING btree ("project_id");