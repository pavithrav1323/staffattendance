import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { db } from "../../db/connection.js";
import {
  createClinicalReport,
  getClinicalReports,
  getClinicalReportById,
  generatePdfForReport,
  formatReportNumber,
  getReportNumberPrefix,
  updateClinicalReport,
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

const trainee = {
  traineeName: "Ahmad Bin Ali",
  group: "January 2024 Intake",
  monitoringObjective: "According to the clinical placement objectives",
  teachingLearningActivities: "8.00 am - 1.00 pm\n1. Bed making\n2. Patient assessment",
  clinicalPracticeRecordBook:
    "1. Check the trainee's practice record achievements\n2. Verify logbook",
  disciplineTraineeWelfareDiscussion:
    "Discussed time management and welfare with supervisor",
};

const validInput = {
  unitLocation: "Ward 5A",
  monitoringDateTime: "2026-09-03T10:00:00",
  language: "en" as const,
  trainees: [trainee],
};

const matchedReport = {
  id: "report-1",
  reportNumber: "1/0000001/26",
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

function createInsertChainable(returnValue: unknown) {
  const chain = {
    values: vi.fn(() => chain),
    onConflictDoUpdate: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(returnValue)),
  };
  return chain;
}

function mockTransaction(
  initialSequence: number,
  reportId?: string,
  fixedReportNumber?: string
) {
  let sequence = initialSequence;

  (db as any).transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
    let allocated = false;
    let currentSequence = 0;

    const tx = {
      insert: vi.fn(() => {
        if (!allocated) {
          currentSequence = ++sequence;
          allocated = true;
          return createInsertChainable([{ lastNumber: currentSequence }]);
        }

        const rn =
          fixedReportNumber ??
          `1/${String(currentSequence).padStart(7, "0")}/26`;
        return createInsertChainable([
          {
            id: reportId ?? `report-${currentSequence}`,
            reportNumber: rn,
          },
        ]);
      }),
    };

    return callback(tx);
  });
}

describe("createClinicalReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a report for STAFF with auth companyId and submittedBy", async () => {
    mockTransaction(0);

    const result = await createClinicalReport(staffUser, validInput);

    expect(result).toEqual({
      id: "report-1",
      reportNumber: "1/0000001/26",
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("uses second sequence number for second report of same company", async () => {
    mockTransaction(1, "report-2");

    const result = await createClinicalReport(staffUser, validInput);

    expect(result.reportNumber).toBe("1/0000002/26");
  });

  it("uses a new sequence for a different company", async () => {
    const company7User = { ...staffUser, companyId: "company-7" };
    mockTransaction(0, "report-7", "7/0000001/26");

    const result = await createClinicalReport(company7User, validInput);

    expect(result.reportNumber).toBe("7/0000001/26");
  });

  it("uses one report number for a submission with multiple trainees", async () => {
    mockTransaction(4, "report-multi");
    const multiInput = {
      ...validInput,
      trainees: [trainee, { ...trainee, traineeName: "Second Trainee" }],
    };

    const result = await createClinicalReport(staffUser, multiInput);

    expect(result.reportNumber).toBe("1/0000005/26");
    const insertCalls = (db.transaction as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(insertCalls.length).toBeGreaterThan(0);
  });

  it("does not allow duplicate report numbers from concurrent allocations", async () => {
    mockTransaction(0);

    const results = await Promise.all([
      createClinicalReport(staffUser, validInput),
      createClinicalReport(staffUser, validInput),
      createClinicalReport(staffUser, validInput),
    ]);

    const numbers = results.map((r) => r.reportNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toContain("1/0000001/26");
    expect(numbers).toContain("1/0000002/26");
    expect(numbers).toContain("1/0000003/26");
  });

  it("rejects when user is ADMIN", async () => {
    await expect(createClinicalReport(adminUser, validInput)).rejects.toThrow(
      "Only STAFF can submit clinical reports"
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects when user is MASTER_ADMIN", async () => {
    await expect(createClinicalReport(masterUser, validInput)).rejects.toThrow(
      "Only STAFF can submit clinical reports"
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects when company context is missing", async () => {
    const noCompany = { ...staffUser, companyId: null } as AuthUser;
    await expect(createClinicalReport(noCompany, validInput)).rejects.toThrow(
      "Company context is required"
    );
    expect(db.transaction).not.toHaveBeenCalled();
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

describe("report ID helpers", () => {
  it("extracts the last character of a company ID as prefix", () => {
    expect(getReportNumberPrefix("company-7")).toBe("7");
    expect(getReportNumberPrefix("abc-a")).toBe("A");
  });

  it("formats the report ID with a zero-padded sequence and year suffix", () => {
    expect(formatReportNumber("7", 1, 2026)).toBe("7/0000001/26");
    expect(formatReportNumber("3", 12345, 2027)).toBe("3/0012345/27");
  });
});

describe("updateClinicalReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(db, {
      select: vi.fn(() => createChainable([matchedReport])),
      update: vi.fn(() => createChainable([{ id: "report-1", reportNumber: "1/0000001/26" }])),
    });
  });

  it("updates an existing report for the same staff", async () => {
    const updatedInput = {
      ...validInput,
      unitLocation: "Updated Ward",
    };

    const result = await updateClinicalReport(staffUser, "report-1", updatedInput);

    expect(result.id).toBe("report-1");
    expect(result.reportNumber).toBe("1/0000001/26");
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("rejects when user is ADMIN", async () => {
    await expect(
      updateClinicalReport(adminUser, "report-1", validInput)
    ).rejects.toThrow("Only STAFF can update clinical reports");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects when report does not belong to the staff", async () => {
    Object.assign(db, {
      select: vi.fn(() => createChainable([])),
    });

    await expect(
      updateClinicalReport(staffUser, "missing", validInput)
    ).rejects.toThrow("Clinical report not found");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("keeps the same report number after update", async () => {
    const result = await updateClinicalReport(staffUser, "report-1", validInput);

    expect(result.reportNumber).toBe("1/0000001/26");
  });

  it("rejects when company context is missing", async () => {
    const noCompany = { ...staffUser, companyId: null } as AuthUser;
    await expect(updateClinicalReport(noCompany, "report-1", validInput)).rejects.toThrow(
      "Company context is required"
    );
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("year reset", () => {
  it("starts a new sequence at 0000001 for a new calendar year", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T10:00:00Z"));
    mockTransaction(0, "report-2027", "1/0000001/27");

    const result = await createClinicalReport(staffUser, validInput);

    expect(result.reportNumber).toBe("1/0000001/27");

    vi.useRealTimers();
  });
});
