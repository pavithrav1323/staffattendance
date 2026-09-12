import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/connection.js";
import { bootstrap } from "./bootstrap-program-admin.js";

vi.mock("../db/connection.js", () => ({
  db: {},
  pool: { end: () => Promise.resolve() },
}));

let insertedValues: any = null;
let selectQueue: any[][] = [];

function setupTransaction(results: any[][]) {
  selectQueue = [...results];
  const tx = {
    execute: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: any) => {
        insertedValues = values;
        return Promise.resolve(undefined);
      }),
    })),
  };
  (db as any).transaction = vi.fn(async (callback: any) => callback(tx));
}

beforeEach(() => {
  vi.clearAllMocks();
  insertedValues = null;
  selectQueue = [];
  (db as any).transaction = vi.fn();

  process.env.BOOTSTRAP_EMAIL = "reena@gmail.com";
  process.env.BOOTSTRAP_PASSWORD = "Strong@123";
  process.env.BOOTSTRAP_NAME = "Program_Owner";
  process.env.BOOTSTRAP_EMPLOYEE_ID = "po001";
});

describe("bootstrap program admin", () => {
  it("creates a new PROGRAM_OWNER when other PROGRAM_OWNERs already exist", async () => {
    setupTransaction([[], []]);

    await bootstrap();

    expect(insertedValues.role).toBe("PROGRAM_OWNER");
    expect(insertedValues.status).toBe("APPROVED");
    expect(insertedValues.companyId).toBeNull();
    expect(insertedValues.departmentId).toBeNull();
    expect(insertedValues.workLocationId).toBeNull();
    expect(insertedValues.email).toBe("reena@gmail.com");
    expect(insertedValues.employeeId).toBe("PO001");
    expect(insertedValues.name).toBe("Program_Owner");
    expect(insertedValues.passwordHash).not.toBe("Strong@123");
  });

  it("creates a new PROGRAM_OWNER when MASTER_ADMIN or ADMIN accounts already exist", async () => {
    setupTransaction([[], []]);

    await bootstrap();

    expect(insertedValues.role).toBe("PROGRAM_OWNER");
    expect(insertedValues.status).toBe("APPROVED");
    expect(insertedValues.companyId).toBeNull();
  });

  it("rejects a duplicate email", async () => {
    setupTransaction([[{ id: "existing-user" }], []]);

    await expect(bootstrap()).rejects.toThrow("Bootstrap aborted: email already registered.");
    expect(insertedValues).toBeNull();
  });

  it("rejects a duplicate employee ID for an existing PROGRAM_OWNER", async () => {
    setupTransaction([[], [{ id: "existing-owner" }]]);

    await expect(bootstrap()).rejects.toThrow("Bootstrap aborted: employee ID already registered.");
    expect(insertedValues).toBeNull();
  });

  it("rejects a weak password", async () => {
    process.env.BOOTSTRAP_PASSWORD = "weakpass";

    await expect(bootstrap()).rejects.toThrow("Invalid bootstrap account details");
    expect((db as any).transaction).not.toHaveBeenCalled();
  });

  it("does not create duplicates when run again with the same values", async () => {
    setupTransaction([[{ id: "reena-owner" }], []]);

    await expect(bootstrap()).rejects.toThrow("Bootstrap aborted: email already registered.");
    expect(insertedValues).toBeNull();
  });
});
