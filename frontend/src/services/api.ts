const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  data?: any;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    data?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

const saveAccessToken = (token: string) => {
  localStorage.setItem('accessToken', token);
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const parseError = async (response: Response): Promise<ApiError> => {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return new ApiError(
      `Server returned ${response.status} ${response.statusText}`,
      response.status
    );
  }
  try {
    const error = await response.json();
    return new ApiError(
      error.message || `API request failed (${response.status})`,
      response.status,
      error.code,
      error.data
    );
  } catch {
    return new ApiError(
      `API request failed (${response.status})`,
      response.status
    );
  }
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await parseError(response);
    throw error;
  }

  const data = await response.json();
  if (data.success && data.data?.accessToken) {
    saveAccessToken(data.data.accessToken);
    return data.data.accessToken;
  }

  throw new ApiError('Invalid refresh response', 500);
};

const apiRequest = async <T = unknown>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<ApiResponse<T>> => {
  let token = getAccessToken();

  const makeRequest = async (): Promise<ApiResponse<T>> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    config.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        throw new ApiError('Unable to connect to the server. Please try again.', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401 && token) {
        // Token expired, try to refresh
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshAccessToken();
            onTokenRefreshed(newToken);
            token = newToken;
            isRefreshing = false;
          } catch (error) {
            isRefreshing = false;
            clearSession();
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
        } else {
          // Wait for the refresh to complete
          return new Promise<ApiResponse<T>>((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              token = newToken;
              makeRequest().then(resolve).catch(reject);
            });
          });
        }
        // Retry the request with new token
        return makeRequest();
      }

      const error = await parseError(response);

      if (
        endpoint !== '/auth/login' &&
        response.status === 403 &&
        (error.code === 'ACCOUNT_DEACTIVATED' || error.message.toLowerCase().includes('deactivated'))
      ) {
        clearSession();
        sessionStorage.setItem(
          'deactivationError',
          error.message || 'Your account has been deactivated. Please contact your administrator.'
        );
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      throw error;
    }

    return response.json();
  };

  return makeRequest();
};

export { apiRequest, clearSession, getAccessToken, getRefreshToken, saveAccessToken };