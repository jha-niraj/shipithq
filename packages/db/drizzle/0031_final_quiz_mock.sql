ALTER TABLE "project_v2_sprint_mock_session" ALTER COLUMN "sprint_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_v2_sprint_quiz" ALTER COLUMN "sprint_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_v2_sprint_quiz_final" ON "project_v2_sprint_quiz" USING btree ("project_id") WHERE sprint_id is null;