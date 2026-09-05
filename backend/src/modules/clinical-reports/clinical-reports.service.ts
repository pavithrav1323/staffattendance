import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { clinicalReports, clinicalReportSequences } from "../../db/schema/clinical-reports.js";
import { users } from "../../db/schema/users.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../utils/app-error.js";
import { generateClinicalReportDocx } from "./clinical-reports.docx.js";
import { generateClinicalReportPdf } from "./clinical-reports.pdf.js";
import type { CreateClinicalReportInput, ReportTrainee } from "./clinical-reports.schema.js";

type AuthUser = NonNullable<AuthRequest["user"]>;

export interface ClinicalReportListItem {
  id: string;
  reportNumber: string | null;
  unitLocation: string;
  monitoringDateTime: Date;
  language: string;
  submittedBy: string;
  submittedByName: string | null;
  traineeCount: number;
  createdAt: Date;
}

export interface ClinicalReportDetail {
  id: string;
  reportNumber: string | null;
  unitLocation: string;
  monitoringDateTime: Date;
  language: string;
  submittedBy: string;
  submittedByName: string | null;
  trainees: ReportTrainee[];
  createdAt: Date;
  updatedAt: Date;
}

export function getReportNumberPrefix(companyId: string): string {
  return companyId.slice(-1).toUpperCase();
}

export function formatReportNumber(prefix: string, sequence: number, year: number): string {
  const yearSuffix = String(year).slice(-2);
  const seq = String(sequence).padStart(7, "0");
  return `${prefix}/${seq}/${yearSuffix}`;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function allocateReportNumber(
  tx: Transaction,
  companyId: string,
  year: number
): Promise<number> {
  const [result] = await tx
    .insert(clinicalReportSequences)
    .values({
      companyId,
      year,
      lastNumber: 1,
    })
    .onConflictDoUpdate({
      target: [clinicalReportSequences.companyId, clinicalReportSequences.year],
      set: { lastNumber: sql`${clinicalReportSequences.lastNumber} + 1` },
    })
    .returning({
      lastNumber: clinicalReportSequences.lastNumber,
    });

  if (!result) {
    throw new AppError(500, "Failed to allocate report number");
  }

  return result.lastNumber;
}

function assertCompanyContext(
  authUser: AuthUser
): asserts authUser is AuthUser & { companyId: string } {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }
}

function parseMonitoringDateTime(value: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new AppError(400, "Invalid monitoring date/time");
  }
  return d;
}

function buildTrainees(
  savedTrainees: ReportTrainee[] | null,
  legacy: {
    traineeName: string;
    group: string;
    monitoringObjective: string;
    teachingLearningActivities: string;
    clinicalPracticeRecordBook: string;
    disciplineTraineeWelfareDiscussion: string;
  }
): ReportTrainee[] {
  if (savedTrainees && Array.isArray(savedTrainees) && savedTrainees.length > 0) {
    return savedTrainees;
  }
  return [
    {
      traineeName: legacy.traineeName,
      group: legacy.group,
      monitoringObjective: legacy.monitoringObjective,
      teachingLearningActivities: legacy.teachingLearningActivities,
      clinicalPracticeRecordBook: legacy.clinicalPracticeRecordBook,
      disciplineTraineeWelfareDiscussion: legacy.disciplineTraineeWelfareDiscussion,
    },
  ];
}

export async function createClinicalReport(
  authUser: AuthUser,
  input: CreateClinicalReportInput
) {
  assertCompanyContext(authUser);

  if (authUser.role !== "STAFF") {
    throw new AppError(403, "Only STAFF can submit clinical reports");
  }

  const firstTrainee = input.trainees[0];
  const submissionYear = new Date().getFullYear();
  const prefix = getReportNumberPrefix(authUser.companyId);

  const report = await db.transaction(async (tx) => {
    const sequenceNumber = await allocateReportNumber(
      tx,
      authUser.companyId,
      submissionYear
    );
    const reportNumber = formatReportNumber(
      prefix,
      sequenceNumber,
      submissionYear
    );

    const [created] = await tx
      .insert(clinicalReports)
      .values({
        companyId: authUser.companyId,
        submittedBy: authUser.userId,
        unitLocation: input.unitLocation,
        monitoringDateTime: parseMonitoringDateTime(input.monitoringDateTime),
        traineeName: firstTrainee.traineeName,
        group: firstTrainee.group,
        monitoringObjective: firstTrainee.monitoringObjective,
        teachingLearningActivities: firstTrainee.teachingLearningActivities,
        clinicalPracticeRecordBook: firstTrainee.clinicalPracticeRecordBook,
        disciplineTraineeWelfareDiscussion:
          firstTrainee.disciplineTraineeWelfareDiscussion,
        trainees: input.trainees,
        language: input.language,
        reportNumber,
        isDeleted: false,
      })
      .returning({
        id: clinicalReports.id,
        reportNumber: clinicalReports.reportNumber,
      });

    if (!created) {
      throw new AppError(500, "Failed to create clinical report");
    }

    return created;
  });

  return report;
}

export async function getClinicalReports(
  authUser: AuthUser
): Promise<ClinicalReportListItem[]> {
  assertCompanyContext(authUser);

  const conditions = [
    eq(clinicalReports.companyId, authUser.companyId),
    eq(clinicalReports.isDeleted, false),
  ];

  if (authUser.role === "STAFF") {
    conditions.push(eq(clinicalReports.submittedBy, authUser.userId));
  }

  const rows = await db
    .select({
      id: clinicalReports.id,
      reportNumber: clinicalReports.reportNumber,
      unitLocation: clinicalReports.unitLocation,
      monitoringDateTime: clinicalReports.monitoringDateTime,
      language: clinicalReports.language,
      submittedBy: clinicalReports.submittedBy,
      submittedByName: users.name,
      trainees: clinicalReports.trainees,
      createdAt: clinicalReports.createdAt,
    })
    .from(clinicalReports)
    .leftJoin(users, eq(clinicalReports.submittedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(clinicalReports.createdAt));

  return rows.map((r) => ({
    ...r,
    traineeCount: Array.isArray(r.trainees) ? r.trainees.length : 1,
  }));
}

export async function getClinicalReportById(
  authUser: AuthUser,
  reportId: string
): Promise<ClinicalReportDetail> {
  assertCompanyContext(authUser);

  const conditions = [
    eq(clinicalReports.id, reportId),
    eq(clinicalReports.companyId, authUser.companyId),
    eq(clinicalReports.isDeleted, false),
  ];

  if (authUser.role === "STAFF") {
    conditions.push(eq(clinicalReports.submittedBy, authUser.userId));
  }

  const [report] = await db
    .select({
      id: clinicalReports.id,
      reportNumber: clinicalReports.reportNumber,
      unitLocation: clinicalReports.unitLocation,
      monitoringDateTime: clinicalReports.monitoringDateTime,
      language: clinicalReports.language,
      submittedBy: clinicalReports.submittedBy,
      submittedByName: users.name,
      trainees: clinicalReports.trainees,
      traineeName: clinicalReports.traineeName,
      group: clinicalReports.group,
      monitoringObjective: clinicalReports.monitoringObjective,
      teachingLearningActivities: clinicalReports.teachingLearningActivities,
      clinicalPracticeRecordBook: clinicalReports.clinicalPracticeRecordBook,
      disciplineTraineeWelfareDiscussion:
        clinicalReports.disciplineTraineeWelfareDiscussion,
      createdAt: clinicalReports.createdAt,
      updatedAt: clinicalReports.updatedAt,
    })
    .from(clinicalReports)
    .leftJoin(users, eq(clinicalReports.submittedBy, users.id))
    .where(and(...conditions))
    .limit(1);

  if (!report) {
    throw new AppError(404, "Clinical report not found");
  }

  return {
    id: report.id,
    unitLocation: report.unitLocation,
    monitoringDateTime: report.monitoringDateTime,
    language: report.language,
    submittedBy: report.submittedBy,
    submittedByName: report.submittedByName,
    trainees: buildTrainees(report.trainees, {
      traineeName: report.traineeName,
      group: report.group,
      monitoringObjective: report.monitoringObjective,
      teachingLearningActivities: report.teachingLearningActivities,
      clinicalPracticeRecordBook: report.clinicalPracticeRecordBook,
      disciplineTraineeWelfareDiscussion: report.disciplineTraineeWelfareDiscussion,
    }),
    reportNumber: report.reportNumber,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export async function updateClinicalReport(
  authUser: AuthUser,
  reportId: string,
  input: CreateClinicalReportInput
) {
  assertCompanyContext(authUser);

  if (authUser.role !== "STAFF") {
    throw new AppError(403, "Only STAFF can update clinical reports");
  }

  // Verify the report exists, is not deleted, and belongs to the staff
  await getClinicalReportById(authUser, reportId);

  const firstTrainee = input.trainees[0];

  const [updated] = await db
    .update(clinicalReports)
    .set({
      unitLocation: input.unitLocation,
      monitoringDateTime: parseMonitoringDateTime(input.monitoringDateTime),
      traineeName: firstTrainee.traineeName,
      group: firstTrainee.group,
      monitoringObjective: firstTrainee.monitoringObjective,
      teachingLearningActivities: firstTrainee.teachingLearningActivities,
      clinicalPracticeRecordBook: firstTrainee.clinicalPracticeRecordBook,
      disciplineTraineeWelfareDiscussion:
        firstTrainee.disciplineTraineeWelfareDiscussion,
      trainees: input.trainees,
      language: input.language,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clinicalReports.id, reportId),
        eq(clinicalReports.companyId, authUser.companyId),
        eq(clinicalReports.submittedBy, authUser.userId),
        eq(clinicalReports.isDeleted, false)
      )
    )
    .returning({
      id: clinicalReports.id,
      reportNumber: clinicalReports.reportNumber,
    });

  if (!updated) {
    throw new AppError(404, "Clinical report not found");
  }

  return getClinicalReportById(authUser, reportId);
}

export async function generatePdfForReport(
  authUser: AuthUser,
  reportId: string
): Promise<Buffer> {
  assertCompanyContext(authUser);

  const report = await getClinicalReportById(authUser, reportId);
  return generateClinicalReportPdf(report);
}

export async function generateDocxForReport(
  authUser: AuthUser,
  reportId: string
): Promise<Buffer> {
  assertCompanyContext(authUser);

  const report = await getClinicalReportById(authUser, reportId);
  return generateClinicalReportDocx(report);
}
