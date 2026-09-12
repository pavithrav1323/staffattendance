import { and, eq, ilike, sql } from "drizzle-orm";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { db, pool } from "../db/connection.js";
import { users } from "../db/schema/users.js";
import { normalizeEmail, normalizeEmployeeId } from "../utils/normalization.js";
import { hashPassword } from "../utils/password.js";
import { registerProgramOwnerSchema } from "../modules/auth/auth.schema.js";

const requiredEnvironmentVariables = [
  "BOOTSTRAP_EMAIL",
  "BOOTSTRAP_PASSWORD",
  "BOOTSTRAP_NAME",
  "BOOTSTRAP_EMPLOYEE_ID",
] as const;

function readEnvironment() {
  const values = Object.fromEntries(
    requiredEnvironmentVariables.map((name) => [name, process.env[name]?.trim()])
  ) as Record<(typeof requiredEnvironmentVariables)[number], string | undefined>;

  const missing = requiredEnvironmentVariables.filter((name) => !values[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required bootstrap environment variables: ${missing.join(", ")}`);
  }

  const input = registerProgramOwnerSchema.safeParse({
    email: values.BOOTSTRAP_EMAIL,
    password: values.BOOTSTRAP_PASSWORD,
    name: values.BOOTSTRAP_NAME,
    employeeId: values.BOOTSTRAP_EMPLOYEE_ID,
  });
  if (!input.success) {
    throw new Error(`Invalid bootstrap account details: ${input.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  return {
    email: normalizeEmail(input.data.email),
    password: input.data.password,
    name: input.data.name.trim(),
    employeeId: normalizeEmployeeId(input.data.employeeId),
  };
}

export async function bootstrap() {
  const account = readEnvironment();

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('staff-tracker-bootstrap'))`);

    const [existingByEmail] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, account.email))
      .limit(1);

    if (existingByEmail) {
      throw new Error("Bootstrap aborted: email already registered.");
    }

    const [existingByEmployeeId] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "PROGRAM_OWNER"), ilike(users.employeeId, account.employeeId)))
      .limit(1);

    if (existingByEmployeeId) {
      throw new Error("Bootstrap aborted: employee ID already registered.");
    }

    await tx.insert(users).values({
      companyId: null,
      employeeId: account.employeeId,
      name: account.name,
      email: account.email,
      passwordHash: await hashPassword(account.password),
      role: "PROGRAM_OWNER",
      departmentId: null,
      workLocationId: null,
      status: "APPROVED",
      mustChangePassword: false,
      isDeleted: false,
    });
  });

  console.log("Bootstrap completed: PROGRAM_OWNER account created.");
}

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  dotenvConfig();
  bootstrap()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Bootstrap failed.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
