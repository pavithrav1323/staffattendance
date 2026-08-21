import { apiRequest } from './api';

interface StaffRecord {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: string;
  createdAt: string;
}

interface StaffListResponse {
  success: boolean;
  data?: StaffRecord[];
}

interface PendingStaffResponse {
  success: boolean;
  data?: StaffRecord[];
}

interface ApproveRejectResponse {
  success: boolean;
  message: string;
}

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  clockInTime: string | null;
  clockInLatitude: string | null;
  clockInLongitude: string | null;
  clockInLocationName: string | null;
  clockInMethod: string | null;
  clockOutTime: string | null;
  clockOutLatitude: string | null;
  clockOutLongitude: string | null;
  clockOutLocationName: string | null;
  clockOutMethod: string | null;
  workingMinutes: number | null;
  attendanceStatus: string;
  sessionStatus: string;
}

export type { AttendanceRecord };

interface AttendanceResponse {
  success: boolean;
  data?: {
    period: string;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    records: AttendanceRecord[];
  };
}

interface AttendanceSummaryResponse {
  success: boolean;
  data?: {
    date: string;
    presentRecords: number;
    activeSessions: number;
    totalWorkingMinutes: number;
  };
}

export const adminService = {
  getStaffList: async (): Promise<StaffListResponse> => {
    return apiRequest('/admin/staff', 'GET');
  },

  getPendingStaff: async (): Promise<PendingStaffResponse> => {
    return apiRequest('/admin/pending-staff', 'GET');
  },

  approveStaff: async (staffId: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}/approve`, 'PATCH');
  },

  rejectStaff: async (staffId: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}/reject`, 'PATCH');
  },

  activateStaff: async (staffId: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}/activate`, 'PATCH');
  },

  deactivateStaff: async (staffId: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}/deactivate`, 'PATCH');
  },

  resetStaffPassword: async (staffId: string, temporaryPassword: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}/reset-password`, 'PATCH', { temporaryPassword });
  },

  resetStaffDevice: async (staffId: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}/reset-device`, 'PATCH');
  },

  deleteStaff: async (staffId: string): Promise<ApproveRejectResponse> => {
    return apiRequest(`/admin/staff/${staffId}`, 'DELETE');
  },

  getAttendance: async (
    reportType?: string,
    date?: string,
    month?: string,
    year?: string,
    employeeId?: string,
    page?: number,
    limit?: number
  ): Promise<AttendanceResponse> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (date) params.append('date', date);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (employeeId) params.append('employeeId', employeeId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return apiRequest(`/admin/attendance${queryString ? `?${queryString}` : ''}`, 'GET');
  },

  getAttendanceSummary: async (): Promise<AttendanceSummaryResponse> => {
    return apiRequest('/admin/attendance/summary', 'GET');
  },

  exportAttendance: async (
    reportType?: string,
    date?: string,
    month?: string,
    year?: string,
    employeeId?: string
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (date) params.append('date', date);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (employeeId) params.append('employeeId', employeeId);
    
    const queryString = params.toString();
    const token = localStorage.getItem('accessToken');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/admin/attendance/export${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Export failed (${response.status})`);
      }
      try {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      } catch {
        throw new Error(`Export failed (${response.status})`);
      }
    }

    return response.blob();
  },
};