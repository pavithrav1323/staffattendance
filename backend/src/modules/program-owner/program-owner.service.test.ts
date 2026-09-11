import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { db } from "../../db/connection.js";
import { createMasterAdmin } from "./program-owner.service.js";

vi.mock("../../db/connection.js", () => ({
  db: {},
}));

type AuthUser = NonNullable<AuthRequest["user"]>;

const programOwner: AuthUser = {
  userId: "program-owner-1",
  role: "PROGRAM_OWNER",
  companyId: null,
  departmentId: null,
  workLocationId: null,
};

let insertedValues: Record<string, any>[] = [];

const createChainable = (value: any): any => {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(value)),
    returning: vi.fn(() => Promise.resolve(value)),
  };
  return chain;
};

beforeEach(() => {
  insertedValues = [];

  const tx = {
    // No existing company, no existing employee id
    select: vi.fn(() => createChainable([])),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, any>) => {
        insertedValues.push(values);
        return {
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: "created-1",
                employeeId: values.employeeId,
                name: values.name,
                email: values.email,
                phone: values.phone ?? null,
                status: values.status,
                companyId: values.companyId ?? "company-1",
                companyCode: values.companyCode,
                createdAt: new Date(),
              },
            ])
          ),
        };
      }),
    })),
  };

  Object.assign(db, {
    // Email uniqueness pre-check returns no rows
    select: vi.fn(() => createChainable([])),
    transaction: vi.fn((cb: (tx: any) => Promise<any>) => cb(tx)),
  });
});

describe("createMasterAdmin", () => {
  const input = {
    employeeId: "ma001",
    name: "Master Admin",
    email: "Master.Admin@Example.com",
    phone: "+60123456789",
    password: "Master@123",
    companyCode: "ilkkm001",
    companyName: "Example College",
  };

  it("forces a password change on first login", async () => {
    await createMasterAdmin(programOwner, input);

    const masterAdminValues = insertedValues.find(
      (values) => values.role === "MASTER_ADMIN"
    );

    expect(masterAdminValues).toBeDefined();
    expect(masterAdminValues!.mustChangePassword).toBe(true);
  });

  it("stores an approved MASTER_ADMIN with normalized identifiers and a hashed password", async () => {
    await createMasterAdmin(programOwner, input);

    const masterAdminValues = insertedValues.find(
      (values) => values.role === "MASTER_ADMIN"
    )!;

    expect(masterAdminValues.status).toBe("APPROVED");
    expect(masterAdminValues.email).toBe("master.admin@example.com");
    expect(masterAdminValues.employeeId).toBe("MA001");
    expect(masterAdminValues.passwordHash).not.toBe(input.password);
    expect(masterAdminValues.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(masterAdminValues).not.toHaveProperty("password");
  });
});
