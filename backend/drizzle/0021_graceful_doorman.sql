CREATE TABLE "clinical_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"unit_location" varchar(200) NOT NULL,
	"trainee_name" varchar(150) NOT NULL,
	"group" varchar(100) NOT NULL,
	"monitoring_objective" text NOT NULL,
	"teaching_learning_activities" text NOT NULL,
	"clinical_practice_record_book" text NOT NULL,
	"discipline_trainee_welfare_discussion" text NOT NULL,
	"language" varchar(2) DEFAULT 'en' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clinical_reports_company_id" ON "clinical_reports" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_clinical_reports_submitted_by" ON "clinical_reports" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "idx_clinical_reports_created_at" ON "clinical_reports" USING btree ("created_at");