import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

import { companies } from "./companies.js";
import { users } from "./users.js";

export const clinicalReports = pgTable(
  "clinical_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),

    unitLocation: varchar("unit_location", { length: 200 }).notNull(),

    traineeName: varchar("trainee_name", { length: 150 }).notNull(),

    group: varchar("group", { length: 100 }).notNull(),

    monitoringObjective: text("monitoring_objective").notNull(),

    teachingLearningActivities: text("teaching_learning_activities").notNull(),

    clinicalPracticeRecordBook: text("clinical_practice_record_book").notNull(),

    disciplineTraineeWelfareDiscussion: text(
      "discipline_trainee_welfare_discussion"
    ).notNull(),

    language: varchar("language", { length: 2 }).notNull().default("en"),

    isDeleted: boolean("is_deleted").notNull().default(false),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_clinical_reports_company_id").on(table.companyId),
    index("idx_clinical_reports_submitted_by").on(table.submittedBy),
    index("idx_clinical_reports_created_at").on(table.createdAt),
  ]
);
