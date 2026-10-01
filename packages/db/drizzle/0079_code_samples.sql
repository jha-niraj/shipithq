CREATE TABLE "code_sample_file" (
	"id" text PRIMARY KEY NOT NULL,
	"sample_id" text NOT NULL,
	"stage" text NOT NULL,
	"path" text NOT NULL,
	"language" text NOT NULL,
	"content" text NOT NULL,
	"lines" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_sample" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"repo_url" text,
	"stages" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "code_sample_file" ADD CONSTRAINT "code_sample_file_sample_id_code_sample_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."code_sample"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_code_sample_file" ON "code_sample_file" USING btree ("sample_id","stage","path");--> statement-breakpoint
CREATE INDEX "idx_code_sample_file_sample" ON "code_sample_file" USING btree ("sample_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_code_sample_slug" ON "code_sample" USING btree ("slug");