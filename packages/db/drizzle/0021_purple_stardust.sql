CREATE TABLE "project_recommendation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarding_version" integer,
	"level" text,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_recommendation" ADD CONSTRAINT "project_recommendation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_recommendation_user_id" ON "project_recommendation" USING btree ("user_id");