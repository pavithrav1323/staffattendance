import { pgTable, uuid, varchar, boolean, timestamp, unique, } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { departments } from "./departments.js";
import { workLocations } from "./work-locations.js";
import { userRoleEnum, userStatusEnum } from "./user-enums.js";
export const users = pgTable("users", {
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
}, (table) => [
    unique("users_company_employee_unique").on(table.companyId, table.employeeId),
]);
//# sourceMappingURL=users.js.map