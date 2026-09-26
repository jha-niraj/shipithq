ALTER TABLE "project_v2_standup_entry" ADD COLUMN "provider" text DEFAULT 'SARVAM' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "interaction_id" text;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "consent_text" text;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "consented_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "turns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "signed_url_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_v2_standup_entry" ADD COLUMN "ends_at" timestamp;--> statement-breakpoint
-- Standups that already happened ran on ElevenLabs; scheduled ones will run on Sarvam (plan/voice VO-12).
UPDATE "project_v2_standup_entry" SET "provider" = 'ELEVENLABS' WHERE "status" <> 'SCHEDULED';