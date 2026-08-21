import { date, pgEnum, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { departments } from "./departments.js";
import { users } from "./users.js";
export const leaveTypeEnum = pgEnum("leave_type", [
    "CASUAL",
    "SICK",
    "ANNUAL",
    "UNPAID",
    "OTHER",
]);
export const leaveStatusEnum = pgEnum("leave_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);
export const leaveRequests = pgTable("leave_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
        .notNull()
        .references(() => companies.id, {
        onDelete: "cascade",
    }),
    employeeId: uuid("employee_id")
        .notNull()
        .references(() => users.id, {
        onDelete: "cascade",
    }),
    departmentId: uuid("department_id")
        .notNull()
        .references(() => departments.id),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull(),
    status: leaveStatusEnum("status")
        .notNull()
        .default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", {
        withTimezone: true,
    }),
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
});
//# sourceMappingURL=leave-requests.js.map