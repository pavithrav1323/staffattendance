import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db, pool } from "../db/connection.js";

async function runMigrations() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations finished successfully.");
}

runMigrations()
  .catch((error: unknown) => {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
