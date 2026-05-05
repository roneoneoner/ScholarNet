import axios from 'axios';

const API_BASE = "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const detail = error.response?.data?.detail || 'An unexpected error occurred';
    return Promise.reject(new Error(detail));
  }
);
