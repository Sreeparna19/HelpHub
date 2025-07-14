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

export const requestAPI = {
  // Get all requests with filters
  getRequests: (params = {}) => api.get('/requests', { params }),

  // Get single request
  getRequest: (id) => api.get(`/requests/${id}`),

  // Create new request
  createRequest: (requestData) => api.post('/requests', requestData),

  // Update request
  updateRequest: (id, requestData) => api.put(`/requests/${id}`, requestData),

  // Delete request
  deleteRequest: (id) => api.delete(`/requests/${id}`),

  // Accept request (volunteer)
  acceptRequest: (id) => api.post(`/requests/${id}/accept`),

  // Update request status
  updateStatus: (id, statusData) => api.put(`/requests/${id}/status`, statusData),

  // Apply for request (volunteer)
  applyForRequest: (id, applicationData) => api.post(`/requests/${id}/apply`, applicationData),

  // Upload request images
  uploadImages: (id, files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return api.post(`/requests/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Rate volunteer
  rateVolunteer: (id, ratingData) => api.post(`/requests/${id}/rate`, ratingData),

  // Get volunteer statistics
  getVolunteerStats: () => api.get('/requests/volunteer-stats'),

  // Get volunteer's accepted requests
  getVolunteerRequests: (params = {}) => api.get('/requests/volunteer-requests', { params }),
};