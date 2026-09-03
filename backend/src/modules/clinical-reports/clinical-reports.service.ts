import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { clinicalReports } from "../../db/schema/clinical-reports.js";
import { users } from "../../db/schema/users.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../utils/app-error.js";
import { generateClinicalReportPdf } from "./clinical-reports.pdf.js";
import type { CreateClinicalReportInput } from "./clinical-reports.schema.js";

type AuthUser = NonNullable<AuthRequest["user"]>;

export interface ClinicalReportListItem {
  id: string;
  unitLocation: string;
  traineeName: string;
  group: string;
  language: string;
  submittedBy: string;
  submittedByName: string | null;
  createdAt: Date;
}

export interface ClinicalReportDetail extends ClinicalReportListItem {
  monitoringObjective: string;
  teachingLearningActivities: string;
  clinicalPracticeRecordBook: string;
  disciplineTraineeWelfareDiscussion: string;
  updatedAt: Date;
}

function assertCompanyContext(
  authUser: AuthUser
): asserts authUser is AuthUser & { companyId: string } {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }
}

export async function createClinicalReport(
  authUser: AuthUser,
  input: CreateClinicalReportInput
) {
  assertCompanyContext(authUser);

  if (authUser.role !== "STAFF") {
    throw new AppError(403, "Only STAFF can submit clinical reports");
  }

  const [report] = await db
    .insert(clinicalReports)
    .values({
      companyId: authUser.companyId,
      submittedBy: authUser.userId,
      unitLocation: input.unitLocation,
      traineeName: input.traineeName,
      group: input.group,
      monitoringObjective: input.monitoringObjective,
      teachingLearningActivities: input.teachingLearningActivities,
      clinicalPracticeRecordBook: input.clinicalPracticeRecordBook,
      disciplineTraineeWelfareDiscussion:
        input.disciplineTraineeWelfareDiscussion,
      language: input.language,
      isDeleted: false,
    })
    .returning({
      id: clinicalReports.id,
    });

  if (!report) {
    throw new AppError(500, "Failed to create clinical report");
  }

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

  const reports = await db
    .select({
      id: clinicalReports.id,
      unitLocation: clinicalReports.unitLocation,
      traineeName: clinicalReports.traineeName,
      group: clinicalReports.group,
      language: clinicalReports.language,
      submittedBy: clinicalReports.submittedBy,
      submittedByName: users.name,
      createdAt: clinicalReports.createdAt,
    })
    .from(clinicalReports)
    .leftJoin(users, eq(clinicalReports.submittedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(clinicalReports.createdAt));

  return reports;
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
      unitLocation: clinicalReports.unitLocation,
      traineeName: clinicalReports.traineeName,
      group: clinicalReports.group,
      language: clinicalReports.language,
      submittedBy: clinicalReports.submittedBy,
      submittedByName: users.name,
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

  return report;
}

export async function generatePdfForReport(
  authUser: AuthUser,
  reportId: string
): Promise<Buffer> {
  assertCompanyContext(authUser);

  const report = await getClinicalReportById(authUser, reportId);
  return generateClinicalReportPdf(report);
}
