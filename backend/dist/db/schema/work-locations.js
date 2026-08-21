import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
export const workLocations = pgTable("work_locations", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
        .notNull()
        .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    latitude: numeric("latitude", {
        precision: 10,
        scale: 7,
    }).notNull(),
    longitude: numeric("longitude", {
        precision: 10,
        scale: 7,
    }).notNull(),
    allowedRadiusMeters: integer("allowed_radius_meters")
        .notNull()
        .default(200),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
//# sourceMappingURL=work-locations.js.map