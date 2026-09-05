import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { db } from "../../db/connection.js";
import {
  deleteMasterAdminStaffData,
  deleteMasterAdminStaff,
  updateMasterAdminStaff,
} from "./master-admin.service.js";

vi.mock("../../db/connection.js", () => ({
  db: {},
}));

type AuthUser = NonNullable<AuthRequest["user"]>;

const createChainable = (value: any) => {
  const p = Promise.resolve(value);
  return {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
    where: vi.fn(() => createChainable(value)),
    limit: vi.fn(() => createChainable(value)),
    returning: vi.fn(() => createChainable(value)),
    from: vi.fn(() => createChainable(value)),
    set: vi.fn(() => createChainable(value)),
  };
};

const matchedStaff = [
  {
    id: "staff-1",
    companyId: "company-1",
    employeeId: "E001",
    name: "Test Staff",
  },
];

describe("deleteMasterAdminStaffData", () => {
  const authUser: AuthUser = {
    userId: "master-1",
    role: "MASTER_ADMIN",
    companyId: "company-1",
  } as AuthUser;

  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() => createChainable(matchedStaff)),
      update: vi.fn(() =>
        createChainable([{ id: "staff-1", employeeId: "E001", name: "Test Staff" }])
      ),
      delete: vi.fn(() => createChainable([{ id: "staff-1" }])),
      transaction: vi.fn((cb: (tx: any) => Promise<any>) => cb(db)),
    });
  });

  it("soft-deletes one staff member and does not hard-delete users or attendance", async () => {
    const result = await deleteMasterAdminStaffData(authUser, {
      companyId: "company-1",
      employeeId: "E001",
    });

    expect(result.success).toBe(true);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when no narrowing filter is supplied", async () => {
    await expect(
      deleteMasterAdminStaffData(authUser, {
        companyId: "company-1",
      })
    ).rejects.toThrow("At least one filter");

    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("deleteMasterAdminStaff", () => {
  const masterAdmin: AuthUser = {
    userId: "master-1",
    role: "MASTER_ADMIN",
    companyId: "company-1",
  } as AuthUser;

  const normalAdmin: AuthUser = {
    userId: "admin-1",
    role: "ADMIN",
    companyId: "company-1",
  } as AuthUser;

  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() => createChainable(matchedStaff)),
      update: vi.fn(() => createChainable([])),
      delete: vi.fn(() => createChainable([{ id: "staff-1" }])),
      transaction: vi.fn((cb: (tx: any) => Promise<any>) => cb(db)),
    });
  });

  it("permanently deletes a staff member and their attendance records", async () => {
    const result = await deleteMasterAdminStaff(masterAdmin, ["staff-1"]);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Staff permanently deleted");
    expect(result.count).toBe(1);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(2); // attendance, then user
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects when called by a non-master admin", async () => {
    await expect(
      deleteMasterAdminStaff(normalAdmin, ["staff-1"])
    ).rejects.toThrow("Only MASTER_ADMIN can permanently delete staff");

    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects when the staff belongs to a different company", async () => {
    Object.assign(db, {
      select: vi.fn(() =>
        createChainable([
          {
            id: "staff-2",
            companyId: "company-2",
            employeeId: "E002",
            name: "Other Staff",
          },
        ])
      ),
    });

    await expect(
      deleteMasterAdminStaff(masterAdmin, ["staff-2"])
    ).rejects.toThrow("You do not have permission");
  });

  it("throws not-found for an already-deleted or missing staff", async () => {
    Object.assign(db, {
      select: vi.fn(() => createChainable([])),
    });

    await expect(
      deleteMasterAdminStaff(masterAdmin, ["missing-staff"])
    ).rejects.toThrow("No staff members found");
  });
});

describe("updateMasterAdminStaff", () => {
  const masterAdmin: AuthUser = {
    userId: "master-1",
    role: "MASTER_ADMIN",
    companyId: "company-1",
  } as AuthUser;

  const normalAdmin: AuthUser = {
    userId: "admin-1",
    role: "ADMIN",
    companyId: "company-1",
  } as AuthUser;

  const otherCompanyMaster: AuthUser = {
    userId: "master-2",
    role: "MASTER_ADMIN",
    companyId: "company-2",
  } as AuthUser;

  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() =>
        createChainable([{ id: "staff-1", employeeId: "E001", name: "Test Staff" }])
      ),
      update: vi.fn(() =>
        createChainable([{ id: "staff-1", employeeId: "001", name: "Updated Staff" }])
      ),
    });
  });

  it("updates a staff member and preserves leading zeros in employeeId", async () => {
    db.select = vi.fn()
      .mockReturnValueOnce(createChainable([{ id: "staff-1", employeeId: "E001" }]))
      .mockReturnValueOnce(createChainable([]));

    const result = await updateMasterAdminStaff(masterAdmin, "staff-1", {
      employeeId: "001",
      name: "Updated Staff",
      phone: "+123",
      designation: "Dev",
    });

    expect(result.success).toBe(true);
    expect(result.data.employeeId).toBe("001");
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("allows unchanged employeeId without triggering duplicate check", async () => {
    const result = await updateMasterAdminStaff(masterAdmin, "staff-1", {
      employeeId: "E001",
      name: "Updated Staff",
      phone: "+123",
      designation: "Dev",
    });

    expect(result.success).toBe(true);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("rejects a duplicate employeeId for another active staff in the same company", async () => {
    db.select = vi.fn()
      .mockReturnValueOnce(createChainable([{ id: "staff-1", employeeId: "E001" }]))
      .mockReturnValueOnce(createChainable([{ id: "staff-2" }]));

    await expect(
      updateMasterAdminStaff(masterAdmin, "staff-1", {
        employeeId: "E002",
        name: "Updated Staff",
        phone: "+123",
        designation: "Dev",
      })
    ).rejects.toThrow("Employee ID already exists for this company.");

    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects cross-company staff update", async () => {
    db.select = vi.fn(() => createChainable([]));

    await expect(
      updateMasterAdminStaff(otherCompanyMaster, "staff-1", {
        employeeId: "E001",
        name: "Updated Staff",
        phone: "+123",
        designation: "Dev",
      })
    ).rejects.toThrow("Staff member not found");

    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects when called by a non-master admin", async () => {
    await expect(
      updateMasterAdminStaff(normalAdmin, "staff-1", {
        employeeId: "E001",
        name: "Updated Staff",
        phone: "+123",
        designation: "Dev",
      })
    ).rejects.toThrow("Only MASTER_ADMIN can update staff");

    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects when company context is missing", async () => {
    const noCompany = { ...masterAdmin, companyId: null } as AuthUser;

    await expect(
      updateMasterAdminStaff(noCompany, "staff-1", {
        employeeId: "E001",
        name: "Updated Staff",
        phone: "+123",
        designation: "Dev",
      })
    ).rejects.toThrow("Company context is required");

    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
