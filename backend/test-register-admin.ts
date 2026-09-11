import "dotenv/config";

import { registerStaff } from "./src/modules/auth/auth.service.ts";

/**
 * Manual smoke test for staff registration.
 *
 * Credentials must be supplied via environment variables so that no test
 * account details are committed to the repository:
 *
 *   TEST_COMPANY_CODE, TEST_EMPLOYEE_ID, TEST_NAME, TEST_EMAIL,
 *   TEST_PHONE, TEST_PASSWORD, TEST_DEPARTMENT_ID
 */
const requiredEnvironmentVariables = [
  "TEST_COMPANY_CODE",
  "TEST_EMPLOYEE_ID",
  "TEST_NAME",
  "TEST_EMAIL",
  "TEST_PHONE",
  "TEST_PASSWORD",
  "TEST_DEPARTMENT_ID",
] as const;

async function test() {
  const missing = requiredEnvironmentVariables.filter(
    (name) => !process.env[name]?.trim()
  );

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  try {
    const result = await registerStaff({
      companyCode: process.env.TEST_COMPANY_CODE!,
      employeeId: process.env.TEST_EMPLOYEE_ID!,
      name: process.env.TEST_NAME!,
      email: process.env.TEST_EMAIL!,
      phone: process.env.TEST_PHONE!,
      password: process.env.TEST_PASSWORD!,
      departmentId: process.env.TEST_DEPARTMENT_ID!,
      designation: process.env.TEST_DESIGNATION ?? "Tester",
    });

    console.log("Registration result:", JSON.stringify(result, null, 2));

    const adminName = result.admin?.name ?? null;
    console.log("Admin name:", adminName);
  } catch (error: any) {
    console.error("Registration error:", error.message);
  }
}

test();
