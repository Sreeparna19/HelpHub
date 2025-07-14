import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../api/chat';
import { User, MessageCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const ChatList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChats();
      console.log('Chats response:', response.data);
      setChats(response.data.data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load chats');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = (chat) => {
    if (!chat.participants || !user) return null;
    return chat.participants.find(p => p._id !== user._id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
          <p className="text-gray-500 mb-4">
            Start helping others or create a help request to begin chatting
          </p>
          <button
            onClick={() => navigate('/help-request')}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            View Help Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const otherUser = getOtherParticipant(chat);
        return (
          <div
            key={chat._id}
            onClick={() => navigate(`/chat/${chat._id}`)}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                {otherUser?.avatar ? (
                  <img
                    src={otherUser.avatar.url}
                    alt={otherUser.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-primary-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {otherUser?.name || 'Unknown User'}
                  </h3>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {chat.lastActivity ? formatTime(chat.lastActivity) : 'Never'}
                  </span>
                </div>
                
                {chat.helpRequest && (
                  <p className="text-xs text-gray-500 truncate">
                    Re: {chat.helpRequest.title}
                  </p>
                )}
                
                {chat.lastMessage && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {chat.lastMessage.content}
                  </p>
                )}
                
                {chat.unreadCount > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {chat.unreadCount} unread message{chat.unreadCount !== 1 ? 's' : ''}
                    </span>
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList; 