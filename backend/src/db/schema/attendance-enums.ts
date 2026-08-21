import { pgEnum } from "drizzle-orm/pg-core";

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LEAVE",
]);

export const attendanceSessionStatusEnum = pgEnum(
  "attendance_session_status",
  [
    "CLOCKED_IN",
    "COMPLETED",
  ]
);

export const locationStatusEnum = pgEnum("location_status", [
  "INSIDE_GEOFENCE",
  "OUTSIDE_GEOFENCE",
]);