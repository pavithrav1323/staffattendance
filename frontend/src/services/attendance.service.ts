import { apiRequest } from './api';

interface ClockInRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  method?: 'BIOMETRIC' | 'MANUAL';
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
    month: string;
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

  getAttendanceHistory: async (month?: string): Promise<AttendanceHistoryResponse> => {
    const params = month ? `?month=${month}` : '';
    return apiRequest(`/attendance/history${params}`, 'GET');
  },
};