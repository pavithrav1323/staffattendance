import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  transports: text("transports"),
  counter: text("counter").notNull().default("0"),
  deviceType: text("device_type"),
  backedUp: boolean("backed_up").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;