CREATE TABLE "practice_path" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"module" "practice_module" NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarding_version" integer,
	"level" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_path" ADD CONSTRAINT "practice_path_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_practice_path_user_id_module" ON "practice_path" USING btree ("user_id","module");