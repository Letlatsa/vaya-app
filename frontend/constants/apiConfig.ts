import axios from 'axios';
import authStorage from '@/utils/authStorage';

// API Configuration
// Store all API URLs and endpoints in one place

// Base API URL
export const API_BASE_URL = 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  // User endpoints
  USERS: '/api/users',
  REGISTER: '/api/users/register',
  VERIFY_OTP: '/api/users/verify-otp',
  LOGIN: '/api/users/login',
  LOGIN_VERIFY: '/api/users/login-verify',
  LOGOUT: '/api/users/logout',
  VALIDATE_TOKEN: '/api/users/validate-token',
  GET_USER: '/api/users/:id',
  
  // Driver endpoints
  DRIVERS: '/api/drivers',
  DRIVER_REGISTER: '/api/drivers/register',
  
  // Trip endpoints
  TRIPS: '/api/trips',
  CREATE_TRIP: '/api/trips',
  GET_TRIP: '/api/trips/:id',
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    const token = await authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      authStorage.clearSession();
    }
    return Promise.reject(error);
  }
);

// Helper function to get full URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to get URL with params
export const getApiUrlWithParams = (endpoint: string, params: Record<string, string>): string => {
  let url = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, value);
  });
  return `${API_BASE_URL}${url}`;
};

export { authStorage };
export default api;
