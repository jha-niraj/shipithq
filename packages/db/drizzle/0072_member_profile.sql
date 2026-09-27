ALTER TABLE "company_member" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "company_member" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "company_member" ADD COLUMN "show_on_people" boolean DEFAULT true NOT NULL;