import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { db } from "../../db/connection.js";
import {
  createClinicalReport,
  getClinicalReports,
  getClinicalReportById,
  generatePdfForReport,
} from "./clinical-reports.service.js";

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
    leftJoin: vi.fn(() => createChainable(value)),
    orderBy: vi.fn(() => createChainable(value)),
    set: vi.fn(() => createChainable(value)),
    values: vi.fn(() => createChainable(value)),
  };
};

const staffUser: AuthUser = {
  userId: "staff-1",
  role: "STAFF",
  companyId: "company-1",
  departmentId: null,
  workLocationId: null,
} as AuthUser;

const adminUser: AuthUser = {
  userId: "admin-1",
  role: "ADMIN",
  companyId: "company-1",
  departmentId: null,
  workLocationId: null,
} as AuthUser;

const masterUser: AuthUser = {
  userId: "master-1",
  role: "MASTER_ADMIN",
  companyId: "company-1",
  departmentId: null,
  workLocationId: null,
} as AuthUser;

const validInput = {
  unitLocation: "Ward 5A",
  traineeName: "Ahmad Bin Ali",
  group: "January 2024 Intake",
  monitoringObjective: "According to the clinical placement objectives",
  teachingLearningActivities: "8.00 am - 1.00 pm\n1. Bed making\n2. Patient assessment",
  clinicalPracticeRecordBook:
    "1. Check the trainee's practice record achievements\n2. Verify logbook",
  disciplineTraineeWelfareDiscussion:
    "Discussed time management and welfare with supervisor",
  language: "en" as const,
};

const matchedReport = {
  id: "report-1",
  companyId: "company-1",
  submittedBy: "staff-1",
  submittedByName: "Staff One",
  unitLocation: "Ward 5A",
  traineeName: "Ahmad Bin Ali",
  group: "January 2024 Intake",
  monitoringObjective: "Objective",
  teachingLearningActivities: "Activities",
  clinicalPracticeRecordBook: "Record book",
  disciplineTraineeWelfareDiscussion: "Discussion",
  language: "en",
  createdAt: new Date("2026-09-03T10:00:00Z"),
  updatedAt: new Date("2026-09-03T10:00:00Z"),
};

describe("createClinicalReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      insert: vi.fn(() => createChainable([{ id: "report-1" }])),
    });
  });

  it("submits a report for STAFF with auth companyId and submittedBy", async () => {
    const result = await createClinicalReport(staffUser, validInput);

    expect(result).toEqual({ id: "report-1" });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("rejects when user is ADMIN", async () => {
    await expect(createClinicalReport(adminUser, validInput)).rejects.toThrow(
      "Only STAFF can submit clinical reports"
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects when user is MASTER_ADMIN", async () => {
    await expect(createClinicalReport(masterUser, validInput)).rejects.toThrow(
      "Only STAFF can submit clinical reports"
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects when company context is missing", async () => {
    const noCompany = { ...staffUser, companyId: null } as AuthUser;
    await expect(createClinicalReport(noCompany, validInput)).rejects.toThrow(
      "Company context is required"
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("getClinicalReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() => createChainable([matchedReport])),
    });
  });

  it("returns reports for STAFF", async () => {
    const result = await getClinicalReports(staffUser);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("report-1");
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("returns reports for ADMIN", async () => {
    const result = await getClinicalReports(adminUser);
    expect(result.length).toBe(1);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("returns reports for MASTER_ADMIN", async () => {
    const result = await getClinicalReports(masterUser);
    expect(result.length).toBe(1);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("rejects when company context is missing", async () => {
    const noCompany = { ...staffUser, companyId: null } as AuthUser;
    await expect(getClinicalReports(noCompany)).rejects.toThrow(
      "Company context is required"
    );
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("getClinicalReportById", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() => createChainable([matchedReport])),
    });
  });

  it("returns the report for STAFF", async () => {
    const result = await getClinicalReportById(staffUser, "report-1");
    expect(result.id).toBe("report-1");
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("returns the report for ADMIN", async () => {
    const result = await getClinicalReportById(adminUser, "report-1");
    expect(result.id).toBe("report-1");
  });

  it("throws not-found when missing", async () => {
    Object.assign(db, {
      select: vi.fn(() => createChainable([])),
    });

    await expect(getClinicalReportById(staffUser, "missing")).rejects.toThrow(
      "Clinical report not found"
    );
  });
});

describe("generatePdfForReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() => createChainable([matchedReport])),
    });
  });

  it("generates a PDF buffer for an authorized report", async () => {
    const pdf = await generatePdfForReport(staffUser, "report-1");

    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
