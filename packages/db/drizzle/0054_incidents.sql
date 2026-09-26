CREATE TABLE "incident_badge" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_key" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_slug" text NOT NULL,
	"kind" text NOT NULL,
	"item_id" text NOT NULL,
	"value" text,
	"correct" boolean,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incident_badge" ADD CONSTRAINT "incident_badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_progress" ADD CONSTRAINT "incident_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_incident_badge_user_badge" ON "incident_badge" USING btree ("user_id","badge_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_incident_progress_item" ON "incident_progress" USING btree ("user_id","case_slug","kind","item_id");--> statement-breakpoint
CREATE INDEX "idx_incident_progress_user" ON "incident_progress" USING btree ("user_id","created_at");