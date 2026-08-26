import {
  pgTable,
  uuid,
  date,
  timestamp,
  numeric,
  integer,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";

import { companies } from "./companies.js";
import { departments } from "./departments.js";
import { workLocations } from "./work-locations.js";
import { users } from "./users.js";
import {
  attendanceStatusEnum,
  attendanceSessionStatusEnum,
  locationStatusEnum,
} from "./attendance-enums.js";

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),

  employeeId: uuid("employee_id")
    .notNull()
    .references(() => users.id),

  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),

  workLocationId: uuid("work_location_id").references(
    () => workLocations.id
  ),

  attendanceDate: date("attendance_date").notNull(),

  clockInTime: timestamp("clock_in_time", {
    withTimezone: true,
  }),

  clockInLatitude: numeric("clock_in_latitude", {
    precision: 10,
    scale: 7,
  }),

  clockInLongitude: numeric("clock_in_longitude", {
    precision: 10,
    scale: 7,
  }),

  clockInLocationName: varchar("clock_in_location_name", {
    length: 300,
  }),

  clockInAccuracy: numeric("clock_in_accuracy", {
    precision: 10,
    scale: 2,
  }),

  clockInDistanceMeters: integer("clock_in_distance_meters"),

  clockInLocationStatus: locationStatusEnum(
    "clock_in_location_status"
  ),

  clockInMethod: varchar("clock_in_method", {
    length: 20,
  }),

  assignedTask: text("assigned_task"),

  clockOutTime: timestamp("clock_out_time", {
    withTimezone: true,
  }),

  clockOutLatitude: numeric("clock_out_latitude", {
    precision: 10,
    scale: 7,
  }),

  clockOutLongitude: numeric("clock_out_longitude", {
    precision: 10,
    scale: 7,
  }),

  clockOutLocationName: varchar("clock_out_location_name", {
    length: 300,
  }),

  clockOutAccuracy: numeric("clock_out_accuracy", {
    precision: 10,
    scale: 2,
  }),

  clockOutDistanceMeters: integer("clock_out_distance_meters"),

  clockOutLocationStatus: locationStatusEnum(
    "clock_out_location_status"
  ),

  clockOutMethod: varchar("clock_out_method", {
    length: 20,
  }),

  attendanceStatus: attendanceStatusEnum("attendance_status")
    .notNull()
    .default("PRESENT"),

  sessionStatus: attendanceSessionStatusEnum("session_status")
    .notNull()
    .default("CLOCKED_IN"),

  workingMinutes: integer("working_minutes"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  isDeleted: boolean("is_deleted")
    .notNull()
    .default(false),

  deletedAt: timestamp("deleted_at", {
    withTimezone: true,
  }),

  deletedBy: uuid("deleted_by"),
});