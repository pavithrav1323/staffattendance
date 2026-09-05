CREATE TABLE "clinical_report_sequences" (
	"company_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "clinical_report_sequences_company_id_year_pk" PRIMARY KEY("company_id","year")
);
--> statement-breakpoint
ALTER TABLE "clinical_reports" ADD COLUMN "report_number" varchar(20);--> statement-breakpoint
ALTER TABLE "clinical_report_sequences" ADD CONSTRAINT "clinical_report_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_report_number_unique" UNIQUE("report_number");