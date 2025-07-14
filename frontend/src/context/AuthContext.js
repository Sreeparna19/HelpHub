import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' });
          const response = await authAPI.getMe();
          console.log('GetMe response:', response.data);
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: response.data.data,
              token
            }
          });
        } catch (error) {
          console.error('Check auth error:', error);
          localStorage.removeItem('token');
          dispatch({
            type: 'AUTH_FAILURE',
            payload: 'Authentication failed'
          });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: null });
      }
    };

    checkAuth();
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authAPI.register(userData);
      
      console.log('Register response:', response.data);
      
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success('Registration successful! Welcome to HelpHub!');
      navigate('/');
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      let message = 'Registration failed';
      
      if (error.response?.status === 429) {
        message = 'Too many registration attempts. Please wait a few minutes and try again.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      dispatch({
        type: 'AUTH_FAILURE',
        payload: message
      });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authAPI.login(credentials);
      
      console.log('Login response:', response.data);
      
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success(`Welcome back, ${user.name}!`);
      
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (user.role === 'volunteer') {
        navigate('/volunteer-dashboard');
      } else {
        navigate('/help-request');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed';
      
      if (error.response?.status === 429) {
        message = 'Too many login attempts. Please wait a few minutes and try again.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      dispatch({
        type: 'AUTH_FAILURE',
        payload: message
      });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
    navigate('/');
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.data
      });
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Update password
  const updatePassword = async (passwordData) => {
    try {
      const response = await authAPI.updatePassword(passwordData);
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success('Password updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Upload avatar
  const uploadAvatar = async (file) => {
    try {
      const response = await authAPI.uploadAvatar(file);
      dispatch({
        type: 'UPDATE_USER',
        payload: { avatar: response.data.data }
      });
      toast.success('Avatar updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload avatar';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Upload ID proof
  const uploadIdProof = async (file) => {
    try {
      const response = await authAPI.uploadIdProof(file);
      dispatch({
        type: 'UPDATE_USER',
        payload: { idProof: response.data.data }
      });
      toast.success('ID proof uploaded successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload ID proof';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      await authAPI.forgotPassword(email);
      toast.success('Password reset email sent successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      const response = await authAPI.resetPassword(token, password);
      const { user, token: newToken } = response.data;
      localStorage.setItem('token', newToken);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token: newToken }
      });
      
      toast.success('Password reset successfully');
      navigate('/');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    updatePassword,
    uploadAvatar,
    uploadIdProof,
    forgotPassword,
    resetPassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};