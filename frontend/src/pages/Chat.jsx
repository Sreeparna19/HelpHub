import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { chatAPI } from '../api/chat';
import ChatList from '../components/ChatList';
import { 
  Send, 
  Image as ImageIcon, 
  Paperclip,
  User,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const Chat = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { sendMessage, updateTypingStatus, getSocket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    // Ensure messages is always an array
    if (!Array.isArray(messages)) {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (chatId && chatId !== 'undefined') {
      fetchMessages();
    } else {
      // If no valid chatId, show empty state
      setLoading(false);
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    if (socket && chatId) {
      // Set connection status
      setConnectionStatus(socket.connected ? 'connected' : 'disconnected');
      
      // Join the chat room
      socket.emit('join', chatId);
      
      // Listen for connection events
      socket.on('connect', () => {
        setConnectionStatus('connected');
      });

      socket.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });

      // Listen for new messages
      socket.on('receive_message', (data) => {
        if (data.chatId === chatId) {
          setMessages(prev => {
            const currentMessages = Array.isArray(prev) ? prev : [];
            return [...currentMessages, data.message];
          });
        }
      });

      // Listen for typing indicators
      socket.on('user_typing', (data) => {
        if (data.chatId === chatId && data.userId !== user?._id) {
          setOtherUserTyping(data.isTyping);
        }
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('receive_message');
        socket.off('user_typing');
        // Leave the chat room when component unmounts
        socket.emit('leave', chatId);
      };
    } else if (!socket && chatId) {
      // If socket is not available, still show the chat but with offline status
      setConnectionStatus('disconnected');
    }
  }, [socket, chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      console.log('Fetching messages for chat:', chatId);
      const response = await chatAPI.getChatMessages(chatId);
      console.log('Messages response:', response.data);
      
      // Ensure messages is always an array
      const responseData = response.data.data;
      console.log('Response data structure:', responseData);
      
      if (responseData && Array.isArray(responseData.messages)) {
        setMessages(responseData.messages);
      } else if (Array.isArray(responseData)) {
        setMessages(responseData);
      } else {
        console.log('No messages found or invalid format, setting empty array');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !fileInputRef.current?.files[0]) return;

    setSending(true);
    try {
      const messageData = {
        content: newMessage.trim(),
        sender: user._id,
        timestamp: new Date().toISOString()
      };

      // Send message via socket if available
      if (socket && socket.connected) {
        sendMessage(chatId, messageData);
      }

      // Always save to database via API
      try {
        console.log('Sending message to API:', {
          chatId,
          content: newMessage.trim(),
          messageType: 'text'
        });
        
        const response = await chatAPI.sendMessage(chatId, {
          content: newMessage.trim(),
          messageType: 'text'
        });
        
        console.log('API response:', response.data);
        
        // If socket is not available, add message to local state
        if (!socket || !socket.connected) {
          setMessages(prev => {
            const currentMessages = Array.isArray(prev) ? prev : [];
            return [...currentMessages, response.data.data];
          });
        }
      } catch (apiError) {
        console.error('API error details:', {
          message: apiError.message,
          status: apiError.response?.status,
          data: apiError.response?.data,
          config: apiError.config
        });
        
        // Handle specific error cases
        if (apiError.response?.status === 404 && apiError.response?.data?.message === 'Chat not found') {
          toast.error('Chat not found. This might happen if the help request hasn\'t been accepted by a volunteer yet.');
        } else if (apiError.response?.status === 403) {
          toast.error('Access denied. You may not have permission to send messages in this chat.');
        } else if (apiError.response?.status === 400) {
          const errorMessage = apiError.response?.data?.message || apiError.response?.data?.errors?.join(', ') || 'Invalid request';
          toast.error(`Validation error: ${errorMessage}`);
        } else {
          toast.error(`Failed to send message: ${apiError.response?.data?.message || apiError.message}`);
        }
        setSending(false);
        return;
      }

      // Clear input
      setNewMessage('');
      setTyping(false);
      updateTypingStatus(chatId, false);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    setSending(true);
    try {
      const response = await chatAPI.uploadImage(chatId, file);
      const messageData = {
        content: 'Image',
        attachments: response.data.data.attachments,
        sender: user._id,
        timestamp: new Date().toISOString()
      };

      sendMessage(chatId, messageData);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (!typing && value.trim()) {
      setTyping(true);
      updateTypingStatus(chatId, true);
    } else if (typing && !value.trim()) {
      setTyping(false);
      updateTypingStatus(chatId, false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (message) => message.sender === user?._id;

  // Debug logging
  console.log('Current messages state:', messages);
  console.log('Messages type:', typeof messages);
  console.log('Is array:', Array.isArray(messages));

  // If no valid chatId, show chat list
  if (!chatId || chatId === 'undefined') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="mt-2 text-gray-600">
              Your conversations and help requests
            </p>
          </div>
          <ChatList />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Chat Room
                </h2>
                <p className="text-sm text-gray-500">
                  {otherUserTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-500 capitalize">
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!Array.isArray(messages) || messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-500">Start the conversation by sending a message!</p>
              </div>
            </div>
          ) : (
            (Array.isArray(messages) ? messages : []).map((message, index) => (
            <div
              key={message._id || index}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwnMessage(message)
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-2">
                    <img
                      src={message.attachments[0].url}
                      alt="Shared image"
                      className="rounded max-w-full h-auto"
                    />
                  </div>
                )}
                
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
                
                <div className={`flex items-center justify-between mt-1 text-xs ${
                  isOwnMessage(message) ? 'text-primary-100' : 'text-gray-500'
                }`}>
                  <span>{formatTime(message.timestamp)}</span>
                  {isOwnMessage(message) && (
                    <div className="flex items-center">
                      {message.read ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
          
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={sending}
            />
            
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !fileInputRef.current?.files[0])}
              className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="spinner w-5 h-5"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;