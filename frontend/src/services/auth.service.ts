import { apiRequest, clearSession, getAccessToken, getRefreshToken, saveAccessToken } from './api';
import { getOrCreateDeviceToken } from '../utils/device-token';

interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  companyId?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  mustChangePassword?: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

interface RefreshResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
  };
}

const login = async (email: string, password: string): Promise<User> => {
  const deviceToken = await getOrCreateDeviceToken();
  const response: LoginResponse = await apiRequest('/auth/login', 'POST', {
    email,
    password,
    deviceToken,
  });

  if (response.success && response.data) {
    const { accessToken, refreshToken, user } = response.data;
    saveAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  throw new Error(response.message || 'Login failed');
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response: RefreshResponse = await apiRequest('/auth/refresh', 'POST', {
    refreshToken,
  });

  if (response.success && response.data?.accessToken) {
    saveAccessToken(response.data.accessToken);
    return response.data.accessToken;
  }

  throw new Error(response.message || 'Token refresh failed');
};

const logout = async (): Promise<void> => {
  const refreshToken = getRefreshToken();
  
  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', 'POST', { refreshToken });
    }
  } catch (error) {
    // Continue with local cleanup even if API call fails
    console.error('Logout API call failed:', error);
  } finally {
    clearSession();
    // Clear location guidance shown flag on logout
    sessionStorage.removeItem('staff_location_guidance_shown');
  }
};

const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

const isAuthenticated = (): boolean => {
  return getAccessToken() !== null && getCurrentUser() !== null;
};

const saveSession = (accessToken: string, refreshToken: string, user: User): void => {
  saveAccessToken(accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
};

interface PublicDepartment {
  id: string;
  name: string;
  code: string;
}

const getPublicDepartments = async (companyCode: string): Promise<PublicDepartment[]> => {
  const response = await apiRequest<PublicDepartment[]>(
    `/auth/departments?companyCode=${encodeURIComponent(companyCode)}`,
    'GET'
  );

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.message || 'Failed to load departments');
};

interface RegisterStaffInput {
  companyCode: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  departmentId: string;
  designation?: string;
}

interface RegisterStaffData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  status: string;
  admin: { id: string; name: string } | null;
}

const registerStaff = async (input: RegisterStaffInput): Promise<RegisterStaffData> => {
  const deviceToken = await getOrCreateDeviceToken();
  const response = await apiRequest<RegisterStaffData>('/auth/register', 'POST', {
    ...input,
    deviceToken,
  });

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.message || 'Registration failed');
};

interface Profile {
  id: string;
  employeeId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  designation: string | null;
  companyId: string | null;
  companyName: string | null;
  companyCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  mustChangePassword: boolean;
}

const changePassword = async (newPassword: string): Promise<void> => {
  const response = await apiRequest('/auth/change-password', 'POST', { newPassword });

  if (response.success) {
    return;
  }

  throw new Error(response.message || 'Failed to change password');
};

const getMyProfile = async (): Promise<Profile> => {
  const response = await apiRequest<Profile>('/auth/me', 'GET');

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.message || 'Failed to load profile');
};

export const authService = {
  login,
  getMyProfile,
  getPublicDepartments,
  registerStaff,
  refreshAccessToken,
  logout,
  getCurrentUser,
  isAuthenticated,
  saveSession,
  changePassword,
};