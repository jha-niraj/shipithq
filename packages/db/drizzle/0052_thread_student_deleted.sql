ALTER TABLE "message_thread" DROP CONSTRAINT "message_thread_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "message_thread" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "message_thread" ADD COLUMN "student_deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;