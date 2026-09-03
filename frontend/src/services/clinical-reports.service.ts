import { apiRequest, getAccessToken } from './api';

export interface ClinicalReport {
  id: string;
  unitLocation: string;
  traineeName: string;
  group: string;
  monitoringObjective: string;
  teachingLearningActivities: string;
  clinicalPracticeRecordBook: string;
  disciplineTraineeWelfareDiscussion: string;
  language: 'en' | 'ms';
  submittedBy: string;
  submittedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalReportInput {
  unitLocation: string;
  traineeName: string;
  group: string;
  monitoringObjective: string;
  teachingLearningActivities: string;
  clinicalPracticeRecordBook: string;
  disciplineTraineeWelfareDiscussion: string;
  language: 'en' | 'ms';
}

export const clinicalReportsService = {
  getReports: async (): Promise<{ success: boolean; data?: ClinicalReport[]; message?: string }> =>
    apiRequest('/clinical-reports', 'GET'),

  getReport: async (id: string): Promise<{ success: boolean; data?: ClinicalReport; message?: string }> =>
    apiRequest(`/clinical-reports/${id}`, 'GET'),

  create: async (input: CreateClinicalReportInput): Promise<{ success: boolean; data?: { id: string }; message?: string }> =>
    apiRequest('/clinical-reports', 'POST', input),

  downloadPdf: async (id: string) => {
    const token = getAccessToken();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/clinical-reports/${id}/pdf`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-report-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
