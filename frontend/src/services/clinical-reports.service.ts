import { apiRequest, getAccessToken } from './api';

export interface ReportTrainee {
  traineeName: string;
  group: string;
  monitoringObjective: string;
  teachingLearningActivities: string;
  clinicalPracticeRecordBook: string;
  disciplineTraineeWelfareDiscussion: string;
}

export interface ClinicalReportListItem {
  id: string;
  reportNumber: string | null;
  unitLocation: string;
  monitoringDateTime: string;
  language: 'en' | 'ms';
  submittedBy: string;
  submittedByName: string | null;
  traineeCount: number;
  createdAt: string;
}

export interface ClinicalReportDetail {
  id: string;
  reportNumber: string | null;
  unitLocation: string;
  monitoringDateTime: string;
  language: 'en' | 'ms';
  submittedBy: string;
  submittedByName: string | null;
  trainees: ReportTrainee[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalReportInput {
  unitLocation: string;
  monitoringDateTime: string;
  language: 'en' | 'ms';
  trainees: ReportTrainee[];
}

async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token || ''}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${filename}`);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(objectUrl);
}

export const clinicalReportsService = {
  getReports: async (): Promise<{ success: boolean; data?: ClinicalReportListItem[]; message?: string }> =>
    apiRequest('/clinical-reports', 'GET'),

  getReport: async (id: string): Promise<{ success: boolean; data?: ClinicalReportDetail; message?: string }> =>
    apiRequest(`/clinical-reports/${id}`, 'GET'),

  create: async (input: CreateClinicalReportInput): Promise<{ success: boolean; data?: { id: string; reportNumber: string | null }; message?: string }> =>
    apiRequest('/clinical-reports', 'POST', input),

  update: async (id: string, input: CreateClinicalReportInput): Promise<{ success: boolean; data?: ClinicalReportDetail; message?: string }> =>
    apiRequest(`/clinical-reports/${id}`, 'PUT', input),

  downloadPdf: (id: string) => {
    downloadFile(`/clinical-reports/${id}/pdf`, `clinical-report-${id}.pdf`);
  },

  downloadDocx: (id: string) => {
    downloadFile(`/clinical-reports/${id}/docx`, `clinical-report-${id}.docx`);
  },
};
