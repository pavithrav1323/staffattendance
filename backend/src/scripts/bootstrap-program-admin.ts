import "dotenv/config";
import { inArray, sql } from "drizzle-orm";

import { db, pool } from "../db/connection.js";
import { users } from "../db/schema/users.js";
import { normalizeEmail, normalizeEmployeeId } from "../utils/normalization.js";
import { hashPassword, validatePassword } from "../utils/password.js";
import { registerProgramOwnerSchema } from "../modules/auth/auth.schema.js";

const requiredEnvironmentVariables = [
  "BOOTSTRAP_EMAIL",
  "BOOTSTRAP_PASSWORD",
  "BOOTSTRAP_NAME",
  "BOOTSTRAP_EMPLOYEE_ID",
] as const;

const privilegedRoles = ["PROGRAM_OWNER", "MASTER_ADMIN", "ADMIN"] as const;

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

  if (!validatePassword(input.data.password)) {
    throw new Error(
      "BOOTSTRAP_PASSWORD must contain uppercase, lowercase, number, and special character"
    );
  }

  return {
    email: normalizeEmail(input.data.email),
    password: input.data.password,
    name: input.data.name.trim(),
    employeeId: normalizeEmployeeId(input.data.employeeId),
  };
}

async function bootstrap() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('staff-tracker-bootstrap'))`);

    const [existingPrivilegedAccount] = await tx
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, [...privilegedRoles]))
      .limit(1);

    if (existingPrivilegedAccount) {
      console.log("Bootstrap aborted: privileged account already exists.");
      return;
    }

    const account = readEnvironment();
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

    console.log("Bootstrap completed: PROGRAM_OWNER account created.");
  });
}

bootstrap()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
