CREATE TABLE "company_role" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"preset_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_member" ADD COLUMN "role_id" text;--> statement-breakpoint
ALTER TABLE "member_invitation" ADD COLUMN "role_id" text;--> statement-breakpoint
ALTER TABLE "company_role" ADD CONSTRAINT "company_role_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_role_company_id_name" ON "company_role" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "idx_company_role_company_id" ON "company_role" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "company_member" ADD CONSTRAINT "company_member_role_id_company_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_role"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invitation" ADD CONSTRAINT "member_invitation_role_id_company_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_role"("id") ON DELETE set null ON UPDATE no action;