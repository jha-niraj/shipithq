CREATE TABLE "option_value_use" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"org" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_value" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"key" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "option_value_use" ADD CONSTRAINT "option_value_use_option_id_option_value_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_option_value_use" ON "option_value_use" USING btree ("option_id","org");--> statement-breakpoint
CREATE INDEX "idx_option_value_use_org" ON "option_value_use" USING btree ("org");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_option_value_kind_key" ON "option_value" USING btree ("kind","key");