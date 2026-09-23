CREATE TABLE "practice_recommendation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"module" "practice_module" NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarding_version" integer,
	"level" text,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_recommendation" ADD CONSTRAINT "practice_recommendation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_practice_recommendation_user_id_module" ON "practice_recommendation" USING btree ("user_id","module");