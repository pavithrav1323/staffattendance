import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../utils/app-error.js";
import {
  generateClinicalReportPdf,
  resolveLogoPath,
} from "./clinical-reports.pdf.js";
import type { ClinicalReportDetail } from "./clinical-reports.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// <backend>/assets/ilkkmlogo.png — the same relative location resolved from
// dist/modules/clinical-reports in the production container.
const bundledLogoPath = path.resolve(__dirname, "../../../assets/ilkkmlogo.png");

const sampleReport: ClinicalReportDetail = {
  id: "report-1",
  reportNumber: "7/0000001/26",
  unitLocation: "Ward 5A",
  monitoringDateTime: new Date("2026-09-03T10:00:00Z"),
  language: "en",
  submittedBy: "staff-1",
  submittedByName: "Staff One",
  trainees: [
    {
      traineeName: "Ahmad Bin Ali",
      group: "January 2024 Intake",
      monitoringObjective: "According to the clinical placement objectives",
      teachingLearningActivities: "8.00 am - 1.00 pm\n1. Bed making",
      clinicalPracticeRecordBook: "1. Check practice record achievements",
      disciplineTraineeWelfareDiscussion: "Discussed welfare with supervisor",
    },
  ],
  createdAt: new Date("2026-09-03T10:00:00Z"),
  updatedAt: new Date("2026-09-03T10:00:00Z"),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveLogoPath", () => {
  it("resolves the backend-bundled ILKKM logo that ships in the deployment image", () => {
    expect(fs.existsSync(bundledLogoPath)).toBe(true);
    expect(resolveLogoPath()).toBe(bundledLogoPath);
  });

  it("throws a controlled AppError with internal logging when the logo is missing", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      resolveLogoPath();
      expect.unreachable("resolveLogoPath should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(500);
      expect((error as AppError).code).toBe("PDF_ASSET_MISSING");
      expect((error as AppError).message).not.toContain("not found");
      expect(consoleSpy).toHaveBeenCalledOnce();
    }
  });
});

describe("generateClinicalReportPdf", () => {
  it("produces a PDF that embeds the ILKKM logo image", async () => {
    const pdf = await generateClinicalReportPdf(sampleReport);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // The embedded logo is stored as an image XObject.
    expect(pdf.includes("/Image")).toBe(true);
    // A report without the logo would be far smaller than the 146 KB PNG.
    expect(pdf.length).toBeGreaterThan(50_000);
  });

  it("rejects with a controlled AppError instead of a raw exception when the logo is missing", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(generateClinicalReportPdf(sampleReport)).rejects.toMatchObject({
      statusCode: 500,
      code: "PDF_ASSET_MISSING",
    });
  });
});
