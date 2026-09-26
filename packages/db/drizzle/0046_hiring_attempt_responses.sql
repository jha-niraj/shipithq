ALTER TABLE "hiring_attempt" ADD COLUMN "responses" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hiring_attempt" ADD COLUMN "responded_at" timestamp;