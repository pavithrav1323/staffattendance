CREATE TYPE "public"."approval_status" AS ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_status" AS ENUM('PENDING_APPROVAL', 'CLOCKED_IN', 'COMPLETED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'LEAVE');--> statement-breakpoint
CREATE TYPE "public"."location_status" AS ENUM('INSIDE_GEOFENCE', 'OUTSIDE_GEOFENCE');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"work_location_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"clock_in_time" timestamp with time zone,
	"clock_in_latitude" numeric(10, 7),
	"clock_in_longitude" numeric(10, 7),
	"clock_in_accuracy" numeric(10, 2),
	"clock_in_distance_meters" integer,
	"clock_in_location_status" "location_status",
	"clock_out_time" timestamp with time zone,
	"clock_out_latitude" numeric(10, 7),
	"clock_out_longitude" numeric(10, 7),
	"clock_out_accuracy" numeric(10, 2),
	"clock_out_distance_meters" integer,
	"clock_out_location_status" "location_status",
	"approval_status" "approval_status" DEFAULT 'NOT_REQUIRED' NOT NULL,
	"approval_reason" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"attendance_status" "attendance_status" DEFAULT 'PRESENT' NOT NULL,
	"session_status" "attendance_session_status" DEFAULT 'CLOCKED_IN' NOT NULL,
	"working_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_work_location_id_work_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."work_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;