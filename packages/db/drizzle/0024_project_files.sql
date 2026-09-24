CREATE TABLE "project_v2_file" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"path" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_readonly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_v2_file" ADD CONSTRAINT "project_v2_file_project_id_project_v2_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_v2_file_project_path" ON "project_v2_file" USING btree ("project_id","path");