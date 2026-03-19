import axios from 'axios';

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
  GET_USER: '/api/users/:id',
  
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

export default api;
