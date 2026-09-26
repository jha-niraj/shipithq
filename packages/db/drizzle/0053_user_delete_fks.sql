ALTER TABLE "xp_transaction" DROP CONSTRAINT "xp_transaction_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_activity" DROP CONSTRAINT "daily_activity_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "streak_reward" DROP CONSTRAINT "streak_reward_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_achievement" DROP CONSTRAINT "user_achievement_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_stats" DROP CONSTRAINT "user_stats_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "template_purchase" DROP CONSTRAINT "template_purchase_buyer_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "background_job" DROP CONSTRAINT "background_job_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_request" DROP CONSTRAINT "credit_request_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_transaction" DROP CONSTRAINT "credit_transaction_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_transfer" DROP CONSTRAINT "credit_transfer_sender_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_transfer" DROP CONSTRAINT "credit_transfer_receiver_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "payment" DROP CONSTRAINT "payment_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "referral" DROP CONSTRAINT "referral_referrer_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "referral" DROP CONSTRAINT "referral_referred_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "project_idea" DROP CONSTRAINT "project_idea_submitted_by_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "project_v2_sprint" DROP CONSTRAINT "project_v2_sprint_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "open_source_project" DROP CONSTRAINT "open_source_project_created_by_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "template_purchase" ALTER COLUMN "buyer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_request" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transaction" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transfer" ALTER COLUMN "sender_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transfer" ALTER COLUMN "receiver_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "referral" ALTER COLUMN "referrer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "referral" ALTER COLUMN "referred_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "open_source_project" ALTER COLUMN "created_by_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "xp_transaction" ADD CONSTRAINT "xp_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_reward" ADD CONSTRAINT "streak_reward_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_purchase" ADD CONSTRAINT "template_purchase_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_request" ADD CONSTRAINT "credit_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transfer" ADD CONSTRAINT "credit_transfer_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transfer" ADD CONSTRAINT "credit_transfer_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_idea" ADD CONSTRAINT "project_idea_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_v2_sprint" ADD CONSTRAINT "project_v2_sprint_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_source_project" ADD CONSTRAINT "open_source_project_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;