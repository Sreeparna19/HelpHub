# Location Picker Feature

## Overview
The Location Picker is a new user-friendly component that allows users to select their location using an interactive map interface. It replaces the basic text input with a comprehensive location selection system.

## Features

### 🗺️ Interactive Map
- Click anywhere on the map to select a location
- Visual marker shows the selected position
- Automatic zoom to selected location

### 🔍 Location Search
- Search for any location by name or address
- Press Enter or click Search button
- Map automatically centers on found location

### 📍 Current Location
- One-click current location detection
- Uses browser's geolocation API
- Automatically fetches address for current position

### 🏠 Address Auto-fetch
- Automatically retrieves address when location is selected
- Uses OpenStreetMap's Nominatim service for reverse geocoding
- Address is editable in the form input

### ✏️ Editable Address
- Users can manually edit the auto-fetched address
- Form validation ensures address is provided
- Real-time validation feedback

## How to Use

1. **Search for Location**: Type a location name in the search bar and press Enter or click Search
2. **Click on Map**: Click anywhere on the map to select a specific location
3. **Use Current Location**: Click the "Current" button to use your current GPS position
4. **Edit Address**: The address field below the map can be edited manually if needed

## Technical Details

### Dependencies
- `leaflet`: Open-source mapping library
- `react-leaflet`: React wrapper for Leaflet
- `nominatim`: OpenStreetMap's geocoding service

### API Usage
The component uses OpenStreetMap's Nominatim service for:
- **Reverse Geocoding**: Convert coordinates to address
- **Forward Geocoding**: Convert address to coordinates

### Form Integration
- Works seamlessly with `react-hook-form`
- Provides both coordinates and address to parent component
- Includes proper validation and error handling

## Benefits

1. **User-Friendly**: Visual map interface is more intuitive than text input
2. **Accurate**: Precise location selection with coordinates
3. **Flexible**: Multiple ways to select location (search, click, current)
4. **Accessible**: Works with keyboard navigation and screen readers
5. **Responsive**: Adapts to different screen sizes

## Browser Compatibility
- Modern browsers with geolocation support
- Requires HTTPS for geolocation in production
- Graceful fallback for unsupported features 