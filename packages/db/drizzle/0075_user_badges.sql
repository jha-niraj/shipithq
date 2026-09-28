CREATE TABLE "user_badge" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_key" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"seen_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_badge_user_key" ON "user_badge" USING btree ("user_id","badge_key");--> statement-breakpoint
CREATE INDEX "idx_user_badge_user_earned" ON "user_badge" USING btree ("user_id","earned_at");