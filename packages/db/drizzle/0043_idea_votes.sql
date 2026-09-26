ALTER TYPE "public"."feedback_category" ADD VALUE 'CONTENT';--> statement-breakpoint
ALTER TYPE "public"."feedback_category" ADD VALUE 'IMPROVEMENT';--> statement-breakpoint
CREATE TABLE "idea_vote" (
	"user_id" text NOT NULL,
	"feedback_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idea_vote_user_id_feedback_id_pk" PRIMARY KEY("user_id","feedback_id")
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "idea_vote" ADD CONSTRAINT "idea_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_vote" ADD CONSTRAINT "idea_vote_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_idea_vote_feedback_id" ON "idea_vote" USING btree ("feedback_id");