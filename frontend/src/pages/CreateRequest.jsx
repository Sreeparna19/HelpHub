import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { requestAPI } from '../api/request';
import LocationPicker from '../components/LocationPicker';
import SimpleLocationPicker from '../components/SimpleLocationPicker';
import { 
  Heart, 
  MapPin, 
  AlertCircle, 
  Upload, 
  X,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

const CreateRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState(null);
  const [mapError, setMapError] = useState(false);

  // Check if user is authenticated and has the right role
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login to create a request');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'needy') {
      toast.error('Only needy users can create help requests');
      navigate('/help-request');
      return;
    }
    
    console.log('Current user:', user);
  }, [user, navigate]);

  // Handle map errors
  React.useEffect(() => {
    const handleError = (error) => {
      if (error.message && error.message.includes('render is not a function')) {
        console.log('Map error detected, switching to simple location picker');
        setMapError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  const categories = [
    { value: 'Food', label: 'Food & Groceries', icon: '🍽️' },
    { value: 'Medical', label: 'Medical Assistance', icon: '🏥' },
    { value: 'Shelter', label: 'Shelter & Housing', icon: '🏠' },
    { value: 'Education', label: 'Education', icon: '📚' },
    { value: 'Transportation', label: 'Transportation', icon: '🚗' },
    { value: 'Other', label: 'Other', icon: '❓' }
  ];

  const urgencyLevels = [
    { value: 'Low', label: 'Low', color: 'text-green-600', bgColor: 'bg-green-50' },
    { value: 'Medium', label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { value: 'High', label: 'High', color: 'text-red-600', bgColor: 'bg-red-50' }
  ];

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        return false;
      }
      return true;
    });

    if (uploadedImages.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed.');
      return;
    }

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    setUploadedImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      return newImages;
    });
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting request data:', data);
      console.log('Current user:', user);
      
      // Check authentication
      if (!user) {
        toast.error('Please login to create a request');
        navigate('/login');
        return;
      }
      
      if (user.role !== 'needy') {
        toast.error('Only needy users can create help requests');
        navigate('/help-request');
        return;
      }
      
      // Prepare request data
      const requestData = {
        title: data.title,
        description: data.description,
        category: data.category,
        urgency: data.urgency,
        location: {
          address: data.location,
          coordinates: currentCoordinates || [0, 0], // Use detected coordinates or default
          type: 'Point'
        },
        notes: data.notes || null
      };

      console.log('Request data to send:', requestData);
      console.log('Location object:', requestData.location);

      // Call the backend API
      const response = await requestAPI.createRequest(requestData);
      
      console.log('Create request response:', response.data);
      
      if (response.data.status === 'success') {
        // Handle image uploads if any
        if (uploadedImages.length > 0) {
          try {
            const files = uploadedImages.map(image => image.file);
            await requestAPI.uploadImages(response.data.data._id, files);
            console.log('Images uploaded successfully');
          } catch (imageError) {
            console.error('Image upload error:', imageError);
            toast.error('Request created but image upload failed');
          }
        }
        
        toast.success('Help request created successfully!');
        navigate('/help-request');
        reset();
        setUploadedImages([]);
      } else {
        toast.error('Failed to create request. Please try again.');
      }
    } catch (error) {
      console.error('Create request error:', error);
      let errorMessage = 'Failed to create request. Please try again.';
      
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a few minutes and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(err => err.msg).join(', ');
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Help Request</h1>
          <p className="mt-2 text-gray-600">
            Let the community know how they can help you
          </p>
        </div>

        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800">Debug Info:</h3>
            <p className="text-sm text-blue-700">User: {user?.name} ({user?.role})</p>
            <p className="text-sm text-blue-700">API URL: {process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}</p>
            <p className="text-sm text-blue-700">Coordinates: {currentCoordinates ? `${currentCoordinates[1].toFixed(4)}, ${currentCoordinates[0].toFixed(4)}` : 'Not detected'}</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/health`);
                  const data = await response.json();
                  console.log('Health check response:', data);
                  alert(`API Health: ${data.status} - ${data.message}`);
                } catch (error) {
                  console.error('Health check error:', error);
                  alert('API Health Check Failed');
                }
              }}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Test API Connection
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Request Details
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Title *
              </label>
              <input
                type="text"
                {...register('title', {
                  required: 'Title is required',
                  minLength: {
                    value: 5,
                    message: 'Title must be at least 5 characters'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Title must be less than 100 characters'
                  }
                })}
                placeholder="Brief description of what you need help with"
                className={`w-full rounded-md border ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', {
                  required: 'Description is required',
                  minLength: {
                    value: 10,
                    message: 'Description must be at least 10 characters'
                  },
                  maxLength: {
                    value: 1000,
                    message: 'Description must be less than 1000 characters'
                  }
                })}
                rows={4}
                placeholder="Provide detailed information about your request..."
                className={`w-full rounded-md border ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Category and Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category', {
                    required: 'Category is required'
                  })}
                  className={`w-full rounded-md border ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level *
                </label>
                <select
                  {...register('urgency', {
                    required: 'Urgency level is required'
                  })}
                  className={`w-full rounded-md border ${
                    errors.urgency ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                >
                  <option value="">Select urgency level</option>
                  {urgencyLevels.map((urgency) => (
                    <option key={urgency.value} value={urgency.value}>
                      {urgency.label}
                    </option>
                  ))}
                </select>
                {errors.urgency && (
                  <p className="mt-1 text-sm text-red-600">{errors.urgency.message}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              {mapError ? (
                <SimpleLocationPicker
                  onLocationChange={(coordinates) => {
                    setCurrentCoordinates(coordinates);
                  }}
                  onAddressChange={(address) => {
                    setValue('location', address, { shouldValidate: true });
                  }}
                  initialCoordinates={currentCoordinates}
                />
              ) : (
                <LocationPicker
                  onLocationChange={(coordinates) => {
                    setCurrentCoordinates(coordinates);
                  }}
                  onAddressChange={(address) => {
                    setValue('location', address, { shouldValidate: true });
                  }}
                  initialCoordinates={currentCoordinates}
                />
              )}
              
              {/* Editable Address Input */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address (Editable) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    {...register('location', {
                      required: 'Location is required'
                    })}
                    placeholder="Address will be auto-filled when you select a location on the map"
                    className={`pl-10 w-full rounded-md border ${
                      errors.location ? 'border-red-300' : 'border-gray-300'
                    } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  You can edit the address manually if needed
                </p>
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">
                    <Plus className="inline w-4 h-4 mr-2" />
                    Upload Images
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload up to 5 images (max 5MB each)
                </p>
              </div>

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Any additional information that might be helpful..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/help-request')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner w-4 h-4 mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Create Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRequest; 