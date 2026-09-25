ALTER TABLE "company" ADD COLUMN "website_domain" text;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_website_domain_unique" UNIQUE("website_domain");