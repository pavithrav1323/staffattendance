import { apiRequest } from './api';

interface ClockInRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  method?: 'BIOMETRIC' | 'MANUAL';
  assignedTask: string;
}

interface ClockOutRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  method?: 'BIOMETRIC' | 'MANUAL';
}

interface ClockInResponse {
  success: boolean;
  message: string;
  data?: {
    attendanceId: string;
    clockInTime: string;
    locationStatus: 'INSIDE_GEOFENCE' | 'OUTSIDE_GEOFENCE';
    distanceMeters: number;
  };
}

interface ClockOutResponse {
  success: boolean;
  message: string;
  data?: {
    attendanceId: string;
    clockOutTime: string;
    locationStatus: 'INSIDE_GEOFENCE' | 'OUTSIDE_GEOFENCE';
    distanceMeters: number;
    workingMinutes: number;
  };
}

interface CurrentSessionResponse {
  success: boolean;
  data?: {
    attendanceId: string;
    clockInTime: string;
    clockInLocationStatus: 'INSIDE_GEOFENCE' | 'OUTSIDE_GEOFENCE';
    clockInDistanceMeters: number;
    assignedTask: string | null;
  } | null;
}

interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  clockInTime: string;
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
  clockInLocationStatus: string;
  clockOutLocationStatus: string | null;
}

interface AttendanceHistoryResponse {
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

export const attendanceService = {
  clockIn: async (request: ClockInRequest): Promise<ClockInResponse> => {
    return apiRequest('/attendance/clock-in', 'POST', request);
  },

  clockOut: async (request: ClockOutRequest): Promise<ClockOutResponse> => {
    return apiRequest('/attendance/clock-out', 'POST', request);
  },

  getCurrentSession: async (): Promise<CurrentSessionResponse> => {
    return apiRequest('/attendance/current-session', 'GET');
  },

  getAttendanceHistory: async (
    reportType?: string,
    date?: string,
    month?: string,
    year?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number
  ): Promise<AttendanceHistoryResponse> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (date) params.append('date', date);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    const queryString = params.toString();
    return apiRequest(`/attendance/history${queryString ? `?${queryString}` : ''}`, 'GET');
  },

  exportAttendanceHistory: async (
    reportType?: string,
    date?: string,
    month?: string,
    year?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    if (date) params.append('date', date);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
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
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/attendance/history/export${queryString ? `?${queryString}` : ''}`,
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