'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      geolocation: !!navigator.geolocation,
      googleMaps: !!(window as any).google?.maps,
      googleMapsLoaded: !!(window as any).google,
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
        googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing',
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        location: window.location.href,
      },
      timestamp: new Date().toISOString(),
    };

    setDebugInfo(info);
  }, []);

  const testGoogleMaps = () => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      alert('Google Maps loaded successfully!');
      window.location.reload();
    };
    
    script.onerror = () => {
      alert('Failed to load Google Maps');
    };

    document.head.appendChild(script);
  };

  const testGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        alert(`Location: ${position.coords.latitude}, ${position.coords.longitude}`);
      },
      (error) => {
        alert(`Geolocation error: ${error.message}`);
      }
    );
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