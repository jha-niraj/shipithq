CREATE TYPE "public"."round_review_mode" AS ENUM('SCORE', 'RIGHT_WRONG', 'FULL');--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'INTERVIEW_REPORTED';--> statement-breakpoint
ALTER TABLE "interview_round" ADD COLUMN "review_mode" "round_review_mode" DEFAULT 'FULL' NOT NULL;