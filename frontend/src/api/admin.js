import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const adminAPI = {
  // Get admin dashboard stats
  getDashboardStats: () => api.get('/admin/dashboard'),

  // Get analytics data
  getAnalytics: () => api.get('/admin/analytics'),

  // Get leaderboard
  getLeaderboard: () => api.get('/admin/leaderboard'),

  // Get all users with pagination and filters
  getUsers: (params = {}) => api.get('/admin/users', { params }),

  // Get user details
  getUser: (id) => api.get(`/admin/users/${id}`),

  // Update user status
  updateUserStatus: (id, statusData) => api.put(`/admin/users/${id}/status`, statusData),

  // Get all requests with pagination and filters
  getRequests: (params = {}) => api.get('/admin/requests', { params }),

  // Flag/unflag a request
  flagRequest: (id, flagData) => api.put(`/admin/requests/${id}/flag`, flagData),

  // Delete a request
  deleteRequest: (id) => api.delete(`/admin/requests/${id}`),

  // Get flagged content
  getFlaggedContent: () => api.get('/admin/flagged'),
}; 