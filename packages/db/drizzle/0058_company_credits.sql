CREATE TABLE "company_credit_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"amount" integer NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"key" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company_credit_transaction" ADD CONSTRAINT "company_credit_transaction_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_credit_tx_company" ON "company_credit_transaction" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_credit_tx_key" ON "company_credit_transaction" USING btree ("company_id","key");