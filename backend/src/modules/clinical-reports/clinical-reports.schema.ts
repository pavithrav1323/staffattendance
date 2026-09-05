import { z } from "zod";

export const clinicalReportLanguageEnum = z.enum(["en", "ms"]);
export type ClinicalReportLanguage = z.infer<typeof clinicalReportLanguageEnum>;

export const reportTraineeSchema = z.object({
  traineeName: z.string().trim().min(1, "Trainee name is required").max(150),
  group: z.string().trim().min(1, "Group is required").max(100),
  monitoringObjective: z
    .string()
    .trim()
    .min(1, "Monitoring objective is required")
    .max(2000),
  teachingLearningActivities: z
    .string()
    .trim()
    .min(1, "Teaching and learning activities are required")
    .max(4000),
  clinicalPracticeRecordBook: z
    .string()
    .trim()
    .min(1, "Monitoring of clinical practice record book is required")
    .max(4000),
  disciplineTraineeWelfareDiscussion: z
    .string()
    .trim()
    .min(1, "Discipline / trainee welfare / discussion is required")
    .max(4000),
});

export type ReportTrainee = z.infer<typeof reportTraineeSchema>;

export const createClinicalReportSchema = z.object({
  unitLocation: z.string().trim().min(1, "Unit / Location is required").max(200),
  monitoringDateTime: z.string().trim().min(1, "Date & Time of Monitoring is required"),
  language: clinicalReportLanguageEnum.default("en"),
  trainees: z.array(reportTraineeSchema).min(1, "At least one trainee is required"),
});

export const updateClinicalReportSchema = createClinicalReportSchema;
export type UpdateClinicalReportInput = z.infer<typeof updateClinicalReportSchema>;

export type CreateClinicalReportInput = z.infer<typeof createClinicalReportSchema>;
