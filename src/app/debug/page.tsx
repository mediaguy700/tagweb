'use client';
import { useEffect, useState } from 'react';

interface DebugInfo {
  environment: Record<string, string | undefined>;
  geolocation: boolean;
  googleMaps: boolean;
  googleMapsLoaded: boolean;
  window: Record<string, unknown>;
  userAgent: string;
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    environment: {},
    geolocation: false,
    googleMaps: false,
    googleMapsLoaded: false,
    window: {},
    userAgent: ''
  });

  useEffect(() => {
    const info: DebugInfo = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
        NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Present' : 'Missing'
      },
      geolocation: 'geolocation' in navigator,
      googleMaps: typeof window !== 'undefined' && 'google' in window,
      googleMapsLoaded: typeof window !== 'undefined' && window.google && 'maps' in window.google,
      window: {
        innerWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        innerHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        platform: typeof window !== 'undefined' ? window.navigator.platform : '',
        language: typeof window !== 'undefined' ? window.navigator.language : ''
      },
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
    };

    setDebugInfo(info);
  }, []);

  const testGoogleMaps = () => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      alert('Google Maps is loaded and available!');
    } else {
      alert('Google Maps is not loaded.');
    }
  };

  const testGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          alert(`Geolocation works! Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}`);
        },
        (error) => {
          alert(`Geolocation error: ${error.message}`);
        }
      );
    } else {
      alert('Geolocation is not supported.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Information</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo.environment, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Browser Capabilities</h2>
            <div className="space-y-2">
              <p><strong>Geolocation:</strong> {debugInfo.geolocation ? '✅ Supported' : '❌ Not Supported'}</p>
              <p><strong>Google Maps:</strong> {debugInfo.googleMaps ? '✅ Loaded' : '❌ Not Loaded'}</p>
              <p><strong>Google Maps API:</strong> {debugInfo.googleMapsLoaded ? '✅ Available' : '❌ Not Available'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Window Information</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo.window, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Agent</h2>
            <p className="text-sm bg-gray-100 p-4 rounded break-all">
              {debugInfo.userAgent}
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Functions</h2>
          <div className="space-x-4">
            <button
              onClick={testGoogleMaps}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Google Maps Loading
            </button>
            <button
              onClick={testGeolocation}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Geolocation
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Refresh Page
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Full Debug Info</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 