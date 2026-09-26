ALTER TABLE "hiring_send" ADD COLUMN "decision_note" text;--> statement-breakpoint
ALTER TABLE "hiring_send" ADD COLUMN "decided_by_user_id" text;--> statement-breakpoint
ALTER TABLE "hiring_send" ADD CONSTRAINT "hiring_send_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;