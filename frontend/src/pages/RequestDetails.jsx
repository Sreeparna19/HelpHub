import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestAPI } from '../api/request';
import { 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  MessageCircle, 
  Heart,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getRequest(id);
      console.log('API Response:', response.data);
      setRequest(response.data.data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Food': '🍽️',
      'Medical': '🏥',
      'Shelter': '🏠',
      'Education': '📚',
      'Transportation': '🚗',
      'Other': '❓'
    };
    return icons[category] || '❓';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Accepted': 'bg-blue-100 text-blue-800 border-blue-200',
      'On the Way': 'bg-orange-100 text-orange-800 border-orange-200',
      'Completed': 'bg-green-100 text-green-800 border-green-200',
      'Cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'Low': 'bg-green-100 text-green-800 border-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'High': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleAcceptRequest = async () => {
    setAccepting(true);
    try {
      await requestAPI.acceptRequest(id);
      
      // Refresh the request data to get updated status
      await fetchRequestDetails();
      
      toast.success('Request accepted successfully!');
      navigate('/volunteer-dashboard');
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error(error.response?.data?.message || 'Failed to accept request. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleContactRequester = () => {
    // Navigate to chat or open contact modal
    if (request.chatRoom?._id) {
      navigate(`/chat/${request.chatRoom._id}`);
    } else {
      // If no chat room exists yet, show a message
      toast.error('Chat room not available. The request must be accepted first.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  console.log('Request data:', request);

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Request not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The request you're looking for doesn't exist.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/help-request')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/help-request')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Requests
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(request.urgency)}`}>
                  {request.urgency} URGENCY
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  {getCategoryIcon(request.category)} {request.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed">{request.description}</p>
              
              {request.notes && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Additional Notes</h3>
                  <p className="text-sm text-blue-800">{request.notes}</p>
                </div>
              )}
            </div>

            {/* Images */}
            {request.images && request.images.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.images.map((image, index) => (
                    <img
                      key={index}
                      src={image.url}
                      alt={`Request image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-gray-700">
                              {request.location?.coordinates && request.location.coordinates.length === 2 ? (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${request.location.coordinates[1]},${request.location.coordinates[0]}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="no-underline hover:no-underline "
                                  title="Open in Google Maps"
                                >
                                  {request.location?.address || 'Location not specified'}
                                </a>
                              ) : (
                                request.location?.address || 'Location not specified'
                              )}
                              </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requester Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Requester</h2>
              <div className="flex items-center mb-4">
                <img
                  src={request.needyUser?.avatar?.url || request.needyUser?.avatar || 'https://via.placeholder.com/60'}
                  alt={request.needyUser?.name || 'Anonymous'}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {request.needyUser?.name || 'Anonymous'}
                  </h3>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-600">
                      New User
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  Posted {new Date(request.createdAt).toLocaleDateString()}
                </div>
                {request.needyUser?.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {request.needyUser.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Volunteer Info - Show if request is accepted */}
            {request.volunteer && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Volunteer</h2>
                <div className="flex items-center mb-4">
                  <img
                    src={request.volunteer?.avatar?.url || request.volunteer?.avatar || 'https://via.placeholder.com/60'}
                    alt={request.volunteer?.name || 'Anonymous'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="ml-3">
                                      <h3 className="text-sm font-medium text-gray-900">
                    {request.volunteer?.name || 'Anonymous'}
                  </h3>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-600">
                      Volunteer
                    </span>
                  </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Accepted {request.acceptedAt ? new Date(request.acceptedAt).toLocaleDateString() : 'Recently'}
                  </div>
                  {request.volunteer?.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {request.volunteer.phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {user?.role === 'volunteer' && request.status === 'Pending' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleAcceptRequest}
                    disabled={accepting}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {accepting ? (
                      <>
                        <div className="spinner w-4 h-4 mr-2"></div>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Accept Request
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleContactRequester}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Requester
                  </button>
                </div>
              </div>
            )}

            {/* Status Updates */}
            {request.status !== 'Pending' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Updates</h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Request Accepted</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  
                  {request.status === 'Completed' && (
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Request Completed</p>
                        <p className="text-xs text-gray-500">1 hour ago</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetails; 