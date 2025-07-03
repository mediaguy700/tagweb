'use client';

import { useEffect, useRef } from 'react';

export default function TestPage() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof window !== 'undefined' && !window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('Google Maps loaded successfully');
          // setGoogleMapsLoaded(true); // This line was removed from the original file
        };
        
        script.onerror = () => {
          console.error('Failed to load Google Maps');
          // setGoogleMapsLoaded(false); // This line was removed from the original file
        };

        document.head.appendChild(script);
      } else if (typeof window !== 'undefined' && window.google) {
        // setGoogleMapsLoaded(true); // This line was removed from the original file
      }
    };

    loadGoogleMaps();
  }, []);

  return (
    <div className="w-full h-screen">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
} 