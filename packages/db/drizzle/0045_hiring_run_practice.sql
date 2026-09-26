DROP INDEX "uq_hiring_run_active";--> statement-breakpoint
ALTER TABLE "hiring_run" ALTER COLUMN "job_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hiring_run" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "hiring_run" ADD CONSTRAINT "hiring_run_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hiring_run_practice_active" ON "hiring_run" USING btree ("user_id","process_id") WHERE status = 'IN_PROGRESS' and job_id is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hiring_run_active" ON "hiring_run" USING btree ("user_id","job_id") WHERE status = 'IN_PROGRESS' and job_id is not null;