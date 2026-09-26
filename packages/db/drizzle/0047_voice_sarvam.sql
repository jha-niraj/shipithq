ALTER TABLE "mock_voice_session" ADD COLUMN "provider" text DEFAULT 'SARVAM' NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "interaction_id" text;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "consent_text" text;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "consented_at" timestamp;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "turns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "signed_url_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_voice_session" ADD COLUMN "ends_at" timestamp;--> statement-breakpoint
-- Every session before this migration ran on ElevenLabs (plan/voice VO-5).
UPDATE "mock_voice_session" SET "provider" = 'ELEVENLABS';