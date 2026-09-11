import { describe, it, expect, vi, beforeEach } from "vitest";

import { db } from "../../db/connection.js";
import { comparePassword } from "../../utils/password.js";
import { createAccessToken } from "../../utils/jwt.js";
import { login } from "./auth.service.js";

vi.mock("../../db/connection.js", () => ({
  db: {},
}));

vi.mock("../../utils/jwt.js", () => ({
  createAccessToken: vi.fn(() => "access-token"),
  createRefreshToken: vi.fn(() => "refresh-token"),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("./refresh-token.service.js", () => ({
  saveRefreshToken: vi.fn(),
  getValidRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeAllUserRefreshTokens: vi.fn(),
}));

vi.mock("../../utils/password.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/password.js")>();
  return {
    ...actual,
    comparePassword: vi.fn(),
  };
});

const approvedMasterAdmin = {
  id: "user-1",
  employeeId: "MA001",
  name: "Master Admin",
  email: "admin@example.com",
  role: "MASTER_ADMIN" as const,
  passwordHash: "hashed",
  status: "APPROVED" as const,
  isDeleted: false,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
  companyId: "company-1",
  companyName: "Company One",
  companyCode: "ILKKM001",
  departmentId: null,
  departmentName: null,
  workLocationId: null,
  mustChangePassword: false,
  deviceResetAllowed: false,
  deviceResetExpiry: null,
};

/** Collects every string contained in a (possibly cyclic) drizzle condition. */
const collectStrings = (
  value: unknown,
  found: string[] = [],
  seen = new WeakSet<object>()
): string[] => {
  if (typeof value === "string") {
    found.push(value);
  } else if (value && typeof value === "object") {
    if (seen.has(value)) {
      return found;
    }
    seen.add(value);
    Object.values(value).forEach((item) => collectStrings(item, found, seen));
  }
  return found;
};

let whereConditions: unknown[] = [];
let updates: Record<string, any>[] = [];

const setupDb = (rows: any[]) => {
  const selectChain: any = {
    from: vi.fn(() => selectChain),
    leftJoin: vi.fn(() => selectChain),
    where: vi.fn((condition: unknown) => {
      whereConditions.push(condition);
      return selectChain;
    }),
    limit: vi.fn(() => Promise.resolve(rows)),
  };

  Object.assign(db, {
    select: vi.fn(() => selectChain),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, any>) => {
        updates.push(values);
        return { where: vi.fn(() => Promise.resolve(undefined)) };
      }),
    })),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  whereConditions = [];
  updates = [];
});

describe("login email normalization", () => {
  it("queries PostgreSQL with the lowercased email", async () => {
    setupDb([approvedMasterAdmin]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    const result = await login({
      email: "Admin@Example.COM",
      password: "Master@123",
    } as any);

    expect(result.user.email).toBe("admin@example.com");

    const strings = collectStrings(whereConditions);
    expect(strings).toContain("admin@example.com");
    expect(strings).not.toContain("Admin@Example.COM");
  });

  it("authenticates all casing variants of the same stored email", async () => {
    for (const email of [
      "admin@example.com",
      "ADMIN@EXAMPLE.COM",
      "Admin@Example.com",
    ]) {
      whereConditions = [];
      setupDb([approvedMasterAdmin]);
      vi.mocked(comparePassword).mockResolvedValue(true);

      const result = await login({ email, password: "Master@123" } as any);

      expect(result.accessToken).toBe("access-token");
      expect(collectStrings(whereConditions)).toContain("admin@example.com");
    }
  });
});

describe("login soft-delete protection", () => {
  it("rejects a soft-deleted user before any token is generated", async () => {
    setupDb([{ ...approvedMasterAdmin, isDeleted: true }]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    await expect(
      login({ email: "admin@example.com", password: "Master@123" } as any)
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });

    expect(createAccessToken).not.toHaveBeenCalled();
    expect(comparePassword).not.toHaveBeenCalled();
  });
});

describe("login account lockout", () => {
  it("blocks a locked account with ACCOUNT_LOCKED before verifying the password", async () => {
    setupDb([
      {
        ...approvedMasterAdmin,
        lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      },
    ]);

    await expect(
      login({ email: "admin@example.com", password: "Master@123" } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "ACCOUNT_LOCKED",
    });

    expect(comparePassword).not.toHaveBeenCalled();
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("ignores an expired lock and allows login", async () => {
    setupDb([
      {
        ...approvedMasterAdmin,
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() - 60 * 1000),
      },
    ]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    const result = await login({
      email: "admin@example.com",
      password: "Master@123",
    } as any);

    expect(result.accessToken).toBe("access-token");
    expect(updates[0]).toMatchObject({
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  });

  it("counts a failed attempt without locking the account", async () => {
    setupDb([{ ...approvedMasterAdmin, failedLoginAttempts: 1 }]);
    vi.mocked(comparePassword).mockResolvedValue(false);

    await expect(
      login({ email: "admin@example.com", password: "wrong" } as any)
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].failedLoginAttempts).toBe(2);
    expect(updates[0].lockedUntil).toBeNull();
    expect(updates[0]).not.toHaveProperty("status");
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("temporarily locks the account on the 5th failed attempt", async () => {
    setupDb([{ ...approvedMasterAdmin, failedLoginAttempts: 4 }]);
    vi.mocked(comparePassword).mockResolvedValue(false);

    await expect(
      login({ email: "admin@example.com", password: "wrong" } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "ACCOUNT_LOCKED",
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].failedLoginAttempts).toBe(0);
    expect(updates[0].lockedUntil).toBeInstanceOf(Date);
    expect(updates[0].lockedUntil.getTime()).toBeGreaterThan(Date.now());
    // The account must never be disabled because of failed logins
    expect(updates[0]).not.toHaveProperty("status");
    expect(updates[0]).not.toHaveProperty("isDeleted");
  });

  it("resets the failure counter after a successful login", async () => {
    setupDb([{ ...approvedMasterAdmin, failedLoginAttempts: 3 }]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    const result = await login({
      email: "admin@example.com",
      password: "Master@123",
    } as any);

    expect(result.accessToken).toBe("access-token");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  });

  it("does not write to the database when there is nothing to reset", async () => {
    setupDb([approvedMasterAdmin]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    await login({ email: "admin@example.com", password: "Master@123" } as any);

    expect(updates).toHaveLength(0);
  });
});

describe("login status checks still apply", () => {
  it("rejects a disabled account with ACCOUNT_DEACTIVATED", async () => {
    setupDb([{ ...approvedMasterAdmin, status: "DISABLED" }]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    await expect(
      login({ email: "admin@example.com", password: "Master@123" } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "ACCOUNT_DEACTIVATED",
    });

    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("returns mustChangePassword so the frontend can force a rotation", async () => {
    setupDb([{ ...approvedMasterAdmin, mustChangePassword: true }]);
    vi.mocked(comparePassword).mockResolvedValue(true);

    const result = await login({
      email: "admin@example.com",
      password: "Master@123",
    } as any);

    expect(result.user.mustChangePassword).toBe(true);
    expect(result.user.role).toBe("MASTER_ADMIN");
  });
});
