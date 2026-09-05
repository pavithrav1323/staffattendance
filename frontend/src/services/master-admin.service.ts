import { apiRequest } from './api';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Admin {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  departmentId: string;
  designation: string | null;
  status: string;
}

interface PendingStaff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  departmentId: string;
  departmentName: string | null;
  departmentCode: string | null;
  status: string;
  createdAt: string;
}

interface ApprovedStaff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  departmentId: string;
  departmentName: string | null;
  departmentCode: string | null;
  status: string;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  attendanceDate: string;
  clockInTime: string | null;
  clockInLatitude: string | null;
  clockInLongitude: string | null;
  clockInLocationName: string | null;
  clockInMethod: string | null;
  assignedTask: string | null;
  clockOutTime: string | null;
  clockOutLatitude: string | null;
  clockOutLongitude: string | null;
  clockOutLocationName: string | null;
  clockOutMethod: string | null;
  workingMinutes: number | null;
  attendanceStatus: string;
  sessionStatus: string;
  isDeleted?: boolean;
}

interface DeletedStaffMember {
  id: string;
  employeeId: string;
  name: string;
}

interface DeletedStaffResponse {
  success: boolean;
  data?: DeletedStaffMember[];
}

interface DeletedStaffAttendanceResponse {
  success: boolean;
  data?: {
    staff: DeletedStaffMember;
    records: AttendanceRecord[];
  };
}

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

interface DepartmentsResponse {
  success: boolean;
  data?: Department[];
}

interface AdminsResponse {
  success: boolean;
  data?: Admin[];
}

interface DashboardStats {
  totalRegistered: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

interface DashboardStatsResponse {
  success: boolean;
  data?: DashboardStats;
}

interface CreateResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface AttendancePreviewRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  attendanceDate: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  clockInLocationName: string | null;
  clockOutLocationName: string | null;
}

interface AttendancePreviewResponse {
  records: AttendancePreviewRecord[];
  total: number;
}

interface StaffDataPreviewRecord {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  attendanceCount: number;
  dateRange: string;
}

interface StaffDataPreviewResponse {
  records: StaffDataPreviewRecord[];
  total: number;
}

export const masterAdminService = {
  getDepartments: async (): Promise<DepartmentsResponse> => {
    return apiRequest('/master-admin/departments', 'GET');
  },

  createDepartment: async (name: string, code: string): Promise<CreateResponse> => {
    return apiRequest('/master-admin/departments', 'POST', { name, code });
  },

  deleteDepartment: async (id: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/departments/${id}`, 'DELETE');
  },

  getAdmins: async (): Promise<AdminsResponse> => {
    return apiRequest('/master-admin/admins', 'GET');
  },

  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    return apiRequest('/master-admin/dashboard', 'GET');
  },

  getDeletedStaff: async (): Promise<DeletedStaffResponse> => {
    return apiRequest('/admin/deleted-staff', 'GET');
  },

  getDeletedStaffAttendance: async (employeeId: string): Promise<DeletedStaffAttendanceResponse> => {
    return apiRequest(`/admin/deleted-staff/${encodeURIComponent(employeeId)}/attendance`, 'GET');
  },

  deleteDeletedStaffAttendance: async (employeeId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/admin/deleted-staff/${encodeURIComponent(employeeId)}/attendance`, 'DELETE');
  },

  createAdmin: async (data: {
    employeeId: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    departmentId: string;
    designation?: string;
  }): Promise<CreateResponse> => {
    return apiRequest('/master-admin/admins', 'POST', data);
  },

  deleteAdmin: async (id: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/admins/${id}`, 'DELETE');
  },

  activateAdmin: async (id: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/admins/${id}/activate`, 'PATCH');
  },

  deactivateAdmin: async (id: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/admins/${id}/deactivate`, 'PATCH');
  },

  getAttendance: async (
    reportType?: string,
    date?: string,
    month?: string,
    year?: string,
    startDate?: string,
    endDate?: string,
    departmentId?: string,
    employeeId?: string,
    page?: number,
    limit?: number
  ): Promise<AttendanceResponse> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (date) params.append('date', date);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (departmentId) params.append('departmentId', departmentId);
    if (employeeId) params.append('employeeId', employeeId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return apiRequest(`/master-admin/attendance?${params.toString()}`, 'GET');
  },

  exportAttendance: async (
    reportType?: string,
    date?: string,
    month?: string,
    year?: string,
    startDate?: string,
    endDate?: string,
    departmentId?: string,
    employeeId?: string
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (date) params.append('date', date);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (departmentId) params.append('departmentId', departmentId);
    if (employeeId) params.append('employeeId', employeeId);
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone) params.append('timezone', browserTimezone);

    const queryString = params.toString();
    const token = localStorage.getItem('accessToken');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/master-admin/attendance/export${queryString ? `?${queryString}` : ''}`,
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

  getPendingStaff: async (): Promise<{ success: boolean; data?: PendingStaff[] }> => {
    return apiRequest('/master-admin/staff/pending', 'GET');
  },

  approveStaff: async (staffId: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/staff/${staffId}/approve`, 'PATCH');
  },

  rejectStaff: async (staffId: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/staff/${staffId}/reject`, 'PATCH');
  },

  getApprovedStaff: async (): Promise<{ success: boolean; data?: ApprovedStaff[] }> => {
    return apiRequest('/master-admin/staff/approved', 'GET');
  },

  activateStaff: async (staffId: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/staff/${staffId}/activate`, 'PATCH');
  },

  deactivateStaff: async (staffId: string): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/staff/${staffId}/deactivate`, 'PATCH');
  },

  updateAttendanceTime: async (
    attendanceId: string,
    data: { clockIn?: string; clockOut?: string; timezone?: string }
  ): Promise<CreateResponse> => {
    return apiRequest(`/master-admin/attendance/${attendanceId}/time`, 'PUT', data);
  },

  deleteStaffData: async (
    data: {
      companyId: string;
      departmentId?: string;
      employeeId?: string;
      dateStart?: string;
      dateEnd?: string;
    }
  ): Promise<CreateResponse> => {
    return apiRequest('/master-admin/staff-data', 'DELETE', data);
  },

  deleteStaff: async (staffIds: string[]): Promise<CreateResponse> => {
    return apiRequest('/master-admin/staff/permanent', 'DELETE', { staffIds });
  },

  deleteAttendanceRecords: async (
    data: {
      companyId: string;
      departmentId?: string;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ success: boolean; message: string; count?: number }> => {
    return apiRequest('/master-admin/attendance-records', 'DELETE', data);
  },

  previewAttendanceRecords: async (
    companyId: string,
    params: {
      departmentId?: string;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: AttendancePreviewResponse;
  }> => {
    const query = new URLSearchParams();
    query.append('companyId', companyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    return apiRequest<AttendancePreviewResponse>(
      `/master-admin/attendance-records/preview?${query.toString()}`,
      'GET'
    );
  },

  previewStaffData: async (
    companyId: string,
    params: {
      departmentId?: string;
      employeeId?: string;
      dateStart?: string;
      dateEnd?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: StaffDataPreviewResponse;
  }> => {
    const query = new URLSearchParams();
    query.append('companyId', companyId);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.dateStart) query.append('dateStart', params.dateStart);
    if (params.dateEnd) query.append('dateEnd', params.dateEnd);

    return apiRequest<StaffDataPreviewResponse>(
      `/master-admin/staff-data/preview?${query.toString()}`,
      'GET'
    );
  },

  resetStaffPassword: async (
    staffId: string,
    temporaryPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/admin/staff/${staffId}/reset-password`, 'PATCH', {
      temporaryPassword,
    });
  },

  resetStaffDevice: async (
    staffId: string
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    return apiRequest(`/admin/staff/${staffId}/reset-device`, 'PATCH');
  },

  updateStaff: async (
    staffId: string,
    data: { employeeId: string; name: string; phone: string; designation: string }
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    return apiRequest(`/master-admin/staff/${staffId}`, 'PATCH', data);
  },

  updateAdmin: async (
    adminId: string,
    data: { name: string; phone: string; designation: string }
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    return apiRequest(`/master-admin/admins/${adminId}`, 'PATCH', data);
  },
};