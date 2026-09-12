import dotenv from "dotenv";
dotenv.config();
import pg from "pg";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const backupDir = path.join(projectRoot, "backups");

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("BEGIN TRANSACTION READ ONLY");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
await fs.mkdir(backupDir, { recursive: true });

async function backupTable(tableName) {
  const { rows } = await client.query(`SELECT * FROM "${tableName}"`);
  const fileName = `${tableName}_${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2), "utf-8");

  const sanitized = rows.map((r) => {
    const copy = { ...r };
    if ("token_hash" in copy) copy.token_hash = "<redacted>";
    return copy;
  });

  return { filePath, count: rows.length, preview: sanitized.slice(0, 5) };
}

const audit = await backupTable("program_owner_audit_logs");
const invites = await backupTable("program_owner_invites");

await client.query("ROLLBACK");
await client.end();

console.log("=== BACKUP COMPLETE ===");
console.log("program_owner_audit_logs:", audit.count, "rows ->", audit.filePath);
console.log("program_owner_invites:", invites.count, "rows ->", invites.filePath);
console.log("program_owner_invites preview:", JSON.stringify(invites.preview, null, 2));
