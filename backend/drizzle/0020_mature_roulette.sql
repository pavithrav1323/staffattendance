ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "device_reset_allowed" boolean DEFAULT false;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_staff_devices_user_status"
ON "staff_devices" USING btree ("user_id","status");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_staff_devices_token_hash"
ON "staff_devices" USING btree ("token_hash");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token"
ON "refresh_tokens" USING btree ("token");
--> statement-breakpoint

ALTER TABLE "users"
DROP COLUMN IF EXISTS "device_reset_used";