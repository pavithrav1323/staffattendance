-- Add device reset approval flag for admin-authorized new device login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "device_reset_allowed" boolean DEFAULT false;
