CREATE TABLE "incident_run_event" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_run" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_slug" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"consent_text" text NOT NULL,
	"consented_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"report_job_id" text,
	"report" jsonb,
	"reported_at" timestamp,
	"share_token" text,
	"shared_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "incident_run_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "incident_run_event" ADD CONSTRAINT "incident_run_event_run_id_incident_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."incident_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_run" ADD CONSTRAINT "incident_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_incident_run_event_run" ON "incident_run_event" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_incident_run_user_case" ON "incident_run" USING btree ("user_id","case_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_incident_run_active" ON "incident_run" USING btree ("user_id","case_slug") WHERE "incident_run"."status" = 'ACTIVE';