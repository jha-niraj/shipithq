CREATE TABLE "company_doc_folder" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_document" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"folder_id" text,
	"name" text NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"text" text NOT NULL,
	"chars" integer DEFAULT 0 NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_doc_folder" ADD CONSTRAINT "company_doc_folder_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_document" ADD CONSTRAINT "company_document_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_document" ADD CONSTRAINT "company_document_folder_id_company_doc_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_doc_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_document" ADD CONSTRAINT "company_document_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_doc_folder_company" ON "company_doc_folder" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_document_company" ON "company_document" USING btree ("company_id","created_at");