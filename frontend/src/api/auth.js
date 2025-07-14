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

export const authAPI = {
  // Register user
  register: (userData) => api.post('/auth/register', userData),

  // Login user
  login: (credentials) => api.post('/auth/login', credentials),

  // Get current user
  getMe: () => api.get('/auth/me'),

  // Update profile
  updateProfile: (profileData) => api.put('/auth/updateprofile', profileData),

  // Update password
  updatePassword: (passwordData) => api.put('/auth/updatepassword', passwordData),

  // Upload avatar
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/uploadavatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload ID proof
  uploadIdProof: (file) => {
    const formData = new FormData();
    formData.append('idProof', file);
    return api.post('/auth/uploadidproof', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Logout
  logout: () => api.post('/auth/logout'),

  // Forgot password
  forgotPassword: (email) => api.post('/auth/forgotpassword', { email }),

  // Reset password
  resetPassword: (token, password) => api.put(`/auth/resetpassword/${token}`, { password }),

  updateRole: (role) => api.put('/auth/role', { role }),
};