# Google Maps Setup Guide

## Getting Your Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API (optional, for additional features)
4. Go to "Credentials" and create an API key
5. Restrict the API key to your domain for security

## Environment Setup

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

## Features

- ✅ Full-screen Google Map
- ✅ Current location detection
- ✅ Custom location marker
- ✅ Map controls (zoom, street view, map type)
- ✅ Error handling for location services
- ✅ Loading states
- ✅ Responsive design

## Browser Permissions

The app will request location permissions from your browser. Make sure to:
1. Allow location access when prompted
2. Enable location services in your browser settings
3. If using HTTPS, ensure your site has a valid SSL certificate

## Troubleshooting

- If the map doesn't load, check your API key
- If location doesn't work, check browser permissions
- For development, you can use `http://localhost:3000` without SSL 