import { sql } from "drizzle-orm";
import { db } from "./connection.js";

async function testDatabaseConnection() {
  await db.execute(sql`SELECT 1`);
  console.log("Database connection successful");
}

testDatabaseConnection().catch((error) => {
  console.error("Database connection failed:", error);
  process.exit(1);
});