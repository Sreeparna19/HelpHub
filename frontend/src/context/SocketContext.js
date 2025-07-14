import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection with better error handling
      try {
        socketRef.current = io('http://localhost:5000', {
          auth: {
            token: localStorage.getItem('token')
          },
          timeout: 10000, // 10 second timeout
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        // Join user's room
        socketRef.current.emit('join', user._id);

        // Join chat rooms if user has active chats
        // This will be handled when user enters a specific chat

        // Socket event listeners
        socketRef.current.on('connect', () => {
          console.log('Connected to server');
        });

        socketRef.current.on('disconnect', () => {
          console.log('Disconnected from server');
        });

        socketRef.current.on('receive_message', (data) => {
          // Handle new message
          console.log('New message received:', data);
          // You can emit a custom event or use a state management solution
          // to update the chat UI
          toast.success(`New message from ${data.sender?.name || 'Someone'}`);
        });

        socketRef.current.on('user_typing', (data) => {
          // Handle typing indicator
          console.log('User typing:', data);
        });

        socketRef.current.on('request_status_changed', (data) => {
          // Handle request status updates
          console.log('Request status changed:', data);
          toast.success(`Request status updated: ${data.status}`);
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          // Don't show error toast for connection issues, just log
          console.log('Socket connection failed, will retry automatically');
        });

        socketRef.current.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Socket reconnection attempt ${attemptNumber}`);
        });

        socketRef.current.on('reconnect_failed', () => {
          console.log('Socket reconnection failed');
          toast.error('Unable to connect to chat server. Some features may not work.');
        });

        // Cleanup on unmount
        return () => {
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    }
  }, [isAuthenticated, user]);

  // Send message
  const sendMessage = (chatId, messageData) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        chatId,
        ...messageData
      });
    }
  };

  // Update typing status
  const updateTypingStatus = (chatId, isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', {
        chatId,
        sender: user?._id,
        isTyping
      });
    }
  };

  // Update request status
  const updateRequestStatus = (requestId, status) => {
    if (socketRef.current) {
      socketRef.current.emit('request_update', {
        requestId,
        status
      });
    }
  };

  // Get socket instance
  const getSocket = () => socketRef.current;

  const value = {
    sendMessage,
    updateTypingStatus,
    updateRequestStatus,
    getSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 