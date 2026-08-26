ALTER TABLE "users" ADD COLUMN "device_reset_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_reset_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_reset_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_reset_used" boolean DEFAULT false;