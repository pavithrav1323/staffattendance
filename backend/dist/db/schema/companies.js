import { pgTable, uuid, varchar, boolean, timestamp, } from "drizzle-orm/pg-core";
export const companies = pgTable("companies", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyCode: varchar("company_code", { length: 50 })
        .notNull()
        .unique(),
    companyName: varchar("company_name", { length: 150 })
        .notNull(),
    timezone: varchar("timezone", { length: 100 })
        .notNull(),
    email: varchar("email", { length: 150 }),
    phone: varchar("phone", { length: 30 }),
    isActive: boolean("is_active")
        .notNull()
        .default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
//# sourceMappingURL=companies.js.map