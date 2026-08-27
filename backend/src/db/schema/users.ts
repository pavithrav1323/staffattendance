import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { companies } from "./companies.js";
import { departments } from "./departments.js";
import { workLocations } from "./work-locations.js";
import { userRoleEnum, userStatusEnum } from "./user-enums.js";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .references(() => companies.id),

    employeeId: varchar("employee_id", { length: 50 }),

    name: varchar("name", { length: 150 }).notNull(),

    email: varchar("email", { length: 150 })
      .notNull()
      .unique(),

    phone: varchar("phone", { length: 30 }),

    passwordHash: varchar("password_hash", { length: 255 })
      .notNull(),

    role: userRoleEnum("role").notNull(),

    departmentId: uuid("department_id")
      .references(() => departments.id),

    workLocationId: uuid("work_location_id")
      .references(() => workLocations.id),

    designation: varchar("designation", { length: 100 }),

    status: userStatusEnum("status")
      .notNull()
      .default("PENDING"),

    mustChangePassword: boolean("must_change_password")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    isDeleted: boolean("is_deleted")
      .notNull()
      .default(false),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    deviceResetToken: varchar("device_reset_token", { length: 255 }),

    deviceResetRequestedAt: timestamp("device_reset_requested_at", {
      withTimezone: true,
    }),

    deviceResetAllowed: boolean("device_reset_allowed").default(false),

    deviceResetExpiry: timestamp("device_reset_expiry", {
      withTimezone: true,
    }),

    failedLoginAttempts: integer("failed_login_attempts")
      .notNull()
      .default(0),

    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [
    unique("users_company_employee_unique").on(
      table.companyId,
      table.employeeId
    ),
  ]
);