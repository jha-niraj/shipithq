CREATE TABLE "incident_case" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"topic" text NOT NULL,
	"minutes" integer NOT NULL,
	"status" text DEFAULT 'LIVE' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" text NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_mock_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_slug" text NOT NULL,
	"step_key" text NOT NULL,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"mode" text,
	"interaction_id" text,
	"consent_text" text,
	"consented_at" timestamp,
	"turns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signed_url_count" integer DEFAULT 0 NOT NULL,
	"ends_at" timestamp,
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"feedback" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_step" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"key" text NOT NULL,
	"ordinal" integer NOT NULL,
	"part" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incident_mock_session" ADD CONSTRAINT "incident_mock_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_step" ADD CONSTRAINT "incident_step_case_id_incident_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."incident_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_incident_case_slug" ON "incident_case" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_incident_case_topic" ON "incident_case" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "idx_incident_mock_user_day" ON "incident_mock_session" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_incident_mock_case" ON "incident_mock_session" USING btree ("user_id","case_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_incident_step_key" ON "incident_step" USING btree ("case_id","key");--> statement-breakpoint
CREATE INDEX "idx_incident_step_order" ON "incident_step" USING btree ("case_id","ordinal");