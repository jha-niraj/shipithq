CREATE TABLE "assistant_chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"feedback" smallint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_chat_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_chat_message" ADD CONSTRAINT "assistant_chat_message_session_id_assistant_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assistant_chat_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_chat_session" ADD CONSTRAINT "assistant_chat_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assistant_chat_message_session_created" ON "assistant_chat_message" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_assistant_chat_session_user_updated" ON "assistant_chat_session" USING btree ("user_id","updated_at");