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

export const chatAPI = {
  // Get user's chats
  getChats: () => api.get('/chat'),

  // Get chat messages
  getChatMessages: (chatId, params = {}) => api.get(`/chat/${chatId}`, { params }),

  // Send message
  sendMessage: (chatId, messageData) => api.post(`/chat/${chatId}/messages`, messageData),

  // Upload chat image
  uploadImage: (chatId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/chat/${chatId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Update typing status
  updateTypingStatus: (chatId, isTyping) => api.post(`/chat/${chatId}/typing`, { isTyping }),

  // Mark messages as read
  markAsRead: (chatId) => api.put(`/chat/${chatId}/read`),

  // Delete message
  deleteMessage: (chatId, messageId) => api.delete(`/chat/${chatId}/messages/${messageId}`),
};