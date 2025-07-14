import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestAPI } from '../api/request';
import { 
  Heart, 
  Award, 
  Clock, 
  CheckCircle, 
  MapPin, 
  Star,
  TrendingUp,
  Users,
  Calendar,
  MessageCircle,
  AlertCircle,
  UserCheck,
  DollarSign
} from 'lucide-react';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    acceptedRequests: 0,
    completedRequests: 0,
    averageRating: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch volunteer statistics, available requests, and accepted requests
      const [statsResponse, requestsResponse, acceptedResponse] = await Promise.all([
        requestAPI.getVolunteerStats(),
        requestAPI.getRequests({ status: 'Pending', limit: 5 }),
        requestAPI.getVolunteerRequests({ status: ['Accepted', 'On the Way', 'Completed'], limit: 5 })
      ]);
      setStats(statsResponse.data.data);
      setRecentRequests(requestsResponse.data.data.docs || requestsResponse.data.data);
      setAcceptedRequests(acceptedResponse.data.data.docs || acceptedResponse.data.data);
      
      // Generate recent activity from accepted requests
      generateRecentActivity(acceptedResponse.data.data.docs || acceptedResponse.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivity = (requests) => {
    const activities = [];
    
    requests.forEach(request => {
      if (request.status === 'Completed') {
        activities.push({
          type: 'completed',
          title: 'Completed help request',
          description: request.title,
          time: request.updatedAt,
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        });
      } else if (request.status === 'Accepted') {
        activities.push({
          type: 'accepted',
          title: 'Accepted new request',
          description: request.title,
          time: request.updatedAt,
          icon: Heart,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        });
      }
    });

    // Sort by time and take the most recent 5
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivity(activities.slice(0, 5));
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setUpdating(prev => ({ ...prev, [requestId]: true }));
      await requestAPI.updateStatus(requestId, { status: newStatus });
      // Refresh dashboard data
      fetchDashboardData();
      // Show success message (you can implement a toast notification here)
      alert(`Request status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update request status. Please try again.');
    } finally {
      setUpdating(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted': return 'text-blue-600 bg-blue-100';
      case 'On the Way': return 'text-orange-600 bg-orange-100';
      case 'Completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const statCards = [
    {
      title: 'Total Requests',
      value: stats.totalRequests,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Accepted Requests',
      value: stats.acceptedRequests,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Completed Requests',
      value: stats.completedRequests||0,
      icon: Award,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Average Rating',
      value: stats.averageRating ? stats.averageRating.toFixed(1) : '0.0',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Volunteer Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.name}! Here's your impact on the community.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity and Available Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start helping people to see your activity here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${activity.bgColor} rounded-full flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400">{formatTimeAgo(activity.time)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Available Requests */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Available Requests</h2>
            </div>
            <div className="p-6">
              {(Array.isArray(recentRequests) ? recentRequests : []).length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No requests available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Check back later for new help requests.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(recentRequests) ? recentRequests : []).slice(0, 3).map((request) => (
                    <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {request.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {request.description}
                          </p>
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {request.location?.coordinates && request.location.coordinates.length === 2 ? (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${request.location.coordinates[1]},${request.location.coordinates[0]}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-900 no-underline hover:no-underline hover:text-gray-900"
                                  title="Open in Google Maps"
                                >
                                  {request.location?.address || 'Location not specified'}
                                </a>
                              ) : (
                                request.location?.address || 'Location not specified'
                              )}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/request/${request._id}`}
                          className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                  <div className="text-center">
                    <Link
                      to="/help-request"
                      className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                    >
                      View all requests →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Accepted Requests */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Accepted Requests</h2>
          </div>
          <div className="p-6">
            {(Array.isArray(acceptedRequests) ? acceptedRequests : []).length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No accepted requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start accepting help requests to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(Array.isArray(acceptedRequests) ? acceptedRequests : []).map((request) => (
                  <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {request.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                          {request.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {request.location?.coordinates && request.location.coordinates.length === 2 ? (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${request.location.coordinates[1]},${request.location.coordinates[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 no-underline hover:no-underline hover:text-gray-900"
                                title="Open in Google Maps"
                              >
                                {request.location?.address || 'Location not specified'}
                              </a>
                            ) : (
                              request.location?.address || 'Location not specified'
                            )}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Link
                          to={`/request/${request._id}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                          View
                        </Link>
                        {request.status === 'Accepted' && (
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'On the Way')}
                            disabled={updating[request._id]}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updating[request._id] ? 'Updating...' : 'Start Journey'}
                          </button>
                        )}
                        {request.status === 'On the Way' && (
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'Completed')}
                            disabled={updating[request._id]}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updating[request._id] ? 'Updating...' : 'Mark Complete'}
                          </button>
                        )}
                        <Link
                          to={`/chat/${request.chatRoom?._id || request._id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/help-request"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Heart className="w-6 h-6 text-primary-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Browse Requests</h3>
                  <p className="text-sm text-gray-500">Find people who need help</p>
                </div>
              </Link>
              
              <Link
                to="/chat"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="w-6 h-6 text-primary-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Chat</h3>
                  <p className="text-sm text-gray-500">Message with users</p>
                </div>
              </Link>
              
              <Link
                to="/profile"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Award className="w-6 h-6 text-primary-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-500">Update your information</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerDashboard;