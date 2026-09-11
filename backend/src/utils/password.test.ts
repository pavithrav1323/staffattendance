import { describe, it, expect } from "vitest";

import { validatePassword, strongPasswordSchema } from "./password.js";
import { createMasterAdminSchema } from "../modules/program-owner/program-owner.schema.js";
import { createAdminSchema } from "../modules/master-admin/master-admin.schema.js";
import { registerProgramOwnerSchema } from "../modules/auth/auth.schema.js";

const validPassword = "Master@123";

describe("validatePassword", () => {
  it("requires at least 8 characters", () => {
    expect(validatePassword("Test@12")).toBe(false); // 7 characters
    expect(validatePassword("Test@123")).toBe(true); // 8 characters
  });

  it("requires uppercase, lowercase, number and special character", () => {
    expect(validatePassword("master@123")).toBe(false); // no uppercase
    expect(validatePassword("MASTER@123")).toBe(false); // no lowercase
    expect(validatePassword("Master@abc")).toBe(false); // no number
    expect(validatePassword("Master1234")).toBe(false); // no special character
    expect(validatePassword(validPassword)).toBe(true);
  });
});

describe("strongPasswordSchema", () => {
  it("rejects weak passwords with the shared policy message", () => {
    const result = strongPasswordSchema.safeParse("Test@12");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("at least 8 characters");
  });
});

describe("privileged account schemas share one password policy", () => {
  const masterAdminInput = {
    employeeId: "MA001",
    name: "Master Admin",
    email: "master.admin@example.com",
    phone: "+60123456789",
    companyCode: "ILKKM001",
    companyName: "Example College",
  };

  const adminInput = {
    employeeId: "AD001",
    name: "Department Admin",
    email: "dept.admin@example.com",
    departmentId: "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8",
  };

  const programOwnerInput = {
    employeeId: "PO001",
    name: "Program Owner",
    email: "program.owner@example.com",
  };

  it("rejects a 7-character password for MASTER_ADMIN, ADMIN and PROGRAM_OWNER", () => {
    expect(
      createMasterAdminSchema.safeParse({
        ...masterAdminInput,
        password: "Test@12",
      }).success
    ).toBe(false);

    expect(
      createAdminSchema.safeParse({ ...adminInput, password: "Test@12" }).success
    ).toBe(false);

    expect(
      registerProgramOwnerSchema.safeParse({
        ...programOwnerInput,
        password: "Test@12",
      }).success
    ).toBe(false);
  });

  it("rejects an 8-character password without a special character", () => {
    expect(
      createMasterAdminSchema.safeParse({
        ...masterAdminInput,
        password: "Master123",
      }).success
    ).toBe(false);
  });

  it("accepts a compliant password", () => {
    expect(
      createMasterAdminSchema.safeParse({
        ...masterAdminInput,
        password: validPassword,
      }).success
    ).toBe(true);

    expect(
      createAdminSchema.safeParse({ ...adminInput, password: validPassword })
        .success
    ).toBe(true);

    expect(
      registerProgramOwnerSchema.safeParse({
        ...programOwnerInput,
        password: validPassword,
      }).success
    ).toBe(true);
  });
});
