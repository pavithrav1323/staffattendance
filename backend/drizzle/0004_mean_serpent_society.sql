CREATE TYPE "public"."user_role" AS ENUM('PROGRAM_OWNER', 'MASTER_ADMIN', 'ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"employee_id" varchar(50),
	"name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"phone" varchar(30),
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"department_id" uuid,
	"work_location_id" uuid,
	"designation" varchar(100),
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_company_employee_unique" UNIQUE("company_id","employee_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_work_location_id_work_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."work_locations"("id") ON DELETE no action ON UPDATE no action;