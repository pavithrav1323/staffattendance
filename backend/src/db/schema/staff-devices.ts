import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const staffDevices = pgTable("staff_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 })
    .notNull(),
  deviceName: text("device_name"),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 20 })
    .notNull()
    .default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type NewStaffDevice = typeof staffDevices.$inferInsert;
export type StaffDevice = typeof staffDevices.$inferSelect;
