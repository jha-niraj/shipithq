CREATE TABLE "job_skip" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"skipped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_skip" ADD CONSTRAINT "job_skip_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skip" ADD CONSTRAINT "job_skip_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_job_skip_user_id_job_id" ON "job_skip" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_skip_user_skipped_at" ON "job_skip" USING btree ("user_id","skipped_at");