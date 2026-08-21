ALTER TABLE "attendance" DROP CONSTRAINT "attendance_approved_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "session_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "session_status" SET DEFAULT 'CLOCKED_IN'::text;--> statement-breakpoint
DROP TYPE "public"."attendance_session_status";--> statement-breakpoint
CREATE TYPE "public"."attendance_session_status" AS ENUM('CLOCKED_IN', 'COMPLETED');--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "session_status" SET DEFAULT 'CLOCKED_IN'::"public"."attendance_session_status";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "session_status" SET DATA TYPE "public"."attendance_session_status" USING "session_status"::"public"."attendance_session_status";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "approval_status";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "approval_reason";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "approved_by";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "approved_at";--> statement-breakpoint
DROP TYPE "public"."approval_status";