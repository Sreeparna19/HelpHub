import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, 
  Clock, 
  Heart, 
  User, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Star
} from 'lucide-react';
import { useState } from 'react';
import { requestAPI } from '../api/request';

const RequestCard = ({ request }) => {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);

  // Debug logging in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('RequestCard data:', {
        id: request._id,
        title: request.title,
        status: request.status,
        urgency: request.urgency,
        category: request.category,
        needyUser: request.needyUser?.name
      });
    }
  }, [request]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': {
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertCircle
      },
      'Accepted': {
        label: 'Accepted',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: CheckCircle
      },
      'On the Way': {
        label: 'On the Way',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Loader
      },
      'Completed': {
        label: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle
      },
      'Cancelled': {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle
      }
    };

    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      'Low': {
        label: 'Low',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      'Medium': {
        label: 'Medium',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      'High': {
        label: 'High',
        className: 'bg-red-100 text-red-800 border-red-200'
      }
    };

    const config = urgencyConfig[urgency] || urgencyConfig['Medium'];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const categoryIcons = {
      'Food': '🍽️',
      'Medical': '🏥',
      'Shelter': '🏠',
      'Education': '📚',
      'Transportation': '🚗',
      'Other': '❓'
    };
    return categoryIcons[category] || categoryIcons['Other'];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const canAccept = user?.role === 'volunteer' && request.status === 'Pending';

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await requestAPI.acceptRequest(request._id, { status: 'Accepted' });
      window.location.reload(); // Or trigger a parent refresh if available
    } catch (err) {
      alert('Failed to accept request');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getCategoryIcon(request.category)}</span>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {request.title}
            </h3>
          </div>
          <div className="flex flex-col items-end space-y-1">
            {getStatusBadge(request.status)}
            {getUrgencyBadge(request.urgency)}
          </div>
        </div>

        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {request.description}
        </p>

        {/* Location and Time */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="truncate max-w-32">{request.location?.address || 'Location not specified'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{formatDate(request.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {request.needyUser?.name || 'Anonymous'}
              </p>
              {request.needyUser?.stats?.rating && (
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500 ml-1">
                    {request.needyUser.stats.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {canAccept && (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <Heart className="w-3 h-3 mr-1" />
                {accepting ? 'Accepting...' : 'Accept'}
              </button>
            )}
            <Link
              to={`/request/${request._id}`}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {request.images && request.images.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Images:</span>
            <div className="flex space-x-1">
              {request.images.slice(0, 3).map((image, index) => (
                <div
                  key={index}
                  className="w-8 h-8 bg-gray-200 rounded overflow-hidden"
                >
                  <img
                    src={image.url}
                    alt={`Request image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {request.images.length > 3 && (
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500">
                    +{request.images.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestCard;