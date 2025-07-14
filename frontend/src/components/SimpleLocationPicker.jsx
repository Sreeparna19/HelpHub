import React, { useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const SimpleLocationPicker = ({ 
  onLocationChange, 
  onAddressChange, 
  initialCoordinates = null,
  className = "" 
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialCoordinates);
  const [address, setAddress] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingAddress(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.longitude, position.coords.latitude];
          setSelectedLocation(coords);
          onLocationChange(coords);
          reverseGeocode(coords);
          toast.success('Current location detected!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get current location');
          setIsLoadingAddress(false);
        }
      );
    } else {
      toast.error('Geolocation not supported by this browser');
    }
  };

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = async (coordinates) => {
    if (!coordinates) return;
    
    setIsLoadingAddress(true);
    try {
      const [lng, lat] = coordinates;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HelpHub-App/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedAddress = formatAddress(data);
        setAddress(formattedAddress);
        onAddressChange(formattedAddress);
        toast.success('Address fetched successfully!');
      } else {
        throw new Error('Failed to fetch address');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      toast.error('Could not fetch address for this location');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Forward geocoding to get coordinates from address
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'User-Agent': 'HelpHub-App/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
          setSelectedLocation(coords);
          onLocationChange(coords);
          setAddress(data[0].display_name);
          onAddressChange(data[0].display_name);
          toast.success('Location found!');
        } else {
          toast.error('Location not found. Please try a different search term.');
        }
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Format address from Nominatim response
  const formatAddress = (data) => {
    const parts = [];
    
    if (data.address) {
      if (data.address.house_number) parts.push(data.address.house_number);
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb) parts.push(data.address.suburb);
      if (data.address.city) parts.push(data.address.city);
      if (data.address.state) parts.push(data.address.state);
      if (data.address.postcode) parts.push(data.address.postcode);
      if (data.address.country) parts.push(data.address.country);
    }
    
    return parts.length > 0 ? parts.join(', ') : data.display_name;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a location..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
          />
        </div>
        <button
          type="button"
          onClick={searchLocation}
          disabled={isSearching || !searchQuery.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSearching ? (
            <div className="spinner w-4 h-4"></div>
          ) : (
            <>
              <Search className="w-4 h-4 mr-1" />
              Search
            </>
          )}
        </button>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoadingAddress}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <Navigation className="w-4 h-4 mr-1" />
          Current
        </button>
      </div>

      {/* Map Placeholder */}
      <div className="relative">
        <div className="h-80 w-full rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Interactive Map</p>
            <p className="text-sm text-gray-500">
              Use the search bar above to find your location,<br />
              or click "Current" to use your GPS location
            </p>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-3 py-2 rounded-md text-sm text-gray-700 shadow-sm">
          <MapPin className="inline w-4 h-4 mr-1" />
          Search for your location above
        </div>
      </div>

      {/* Address Display */}
      {address && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center text-sm text-blue-700">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="font-medium">Selected Address:</span>
          </div>
          <p className="mt-1 text-sm text-blue-600">{address}</p>
          {isLoadingAddress && (
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <div className="spinner w-3 h-3 mr-1"></div>
              Fetching address...
            </div>
          )}
        </div>
      )}

      {/* Selected Coordinates Display */}
      {selectedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center text-sm text-green-700">
            <MapPin className="w-4 h-4 mr-2" />
            <span>
              Coordinates: {selectedLocation[1].toFixed(6)}, {selectedLocation[0].toFixed(6)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleLocationPicker; 