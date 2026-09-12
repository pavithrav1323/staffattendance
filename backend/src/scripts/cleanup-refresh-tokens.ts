import { cleanupRefreshTokens } from "../modules/auth/refresh-token.service.js";
import { pool } from "../db/connection.js";

const dryRun = !process.argv.includes("--apply");

const result = await cleanupRefreshTokens(dryRun);
console.log(JSON.stringify(result, null, 2));

await pool.end();
