-- Migration generated manually: drop legacy program-owner tables
-- Tables were verified to have no references in backend/src, frontend/src, or active Drizzle schema
-- Backup saved to E:\StaffTrackerGeo\backups before running this migration

DROP TABLE IF EXISTS "program_owner_audit_logs" CASCADE;
DROP TABLE IF EXISTS "program_owner_invites" CASCADE;
