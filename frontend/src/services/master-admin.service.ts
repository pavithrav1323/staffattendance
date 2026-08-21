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
  clockOutTime: string | null;
  clockOutLatitude: string | null;
  clockOutLongitude: string | null;
  clockOutLocationName: string | null;
  clockOutMethod: string | null;
  workingMinutes: number | null;
  attendanceStatus: string;
  sessionStatus: string;
}

interface AttendanceResponse {
  success: boolean;
  data?: {
    month: string;
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

interface CreateResponse {
  success: boolean;
  message: string;
  data?: any;
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

  getAttendance: async (month?: string, departmentId?: string, employeeId?: string, page?: number, limit?: number): Promise<AttendanceResponse> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (departmentId) params.append('departmentId', departmentId);
    if (employeeId) params.append('employeeId', employeeId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return apiRequest(`/master-admin/attendance?${params.toString()}`, 'GET');
  },

  exportAttendance: async (month?: string, departmentId?: string, employeeId?: string): Promise<Blob> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (departmentId) params.append('departmentId', departmentId);
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
};