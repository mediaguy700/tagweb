'use client';

import { useEffect, useRef } from 'react';

export default function TestPage() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Maps script directly
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBDeSO-0ABqF8X90eB-C5undjnUFH4Gc30&libraries=places';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Script loaded, creating map...');
      if (mapRef.current && window.google) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 12
        });
        console.log('Map created!');
      }
    };
    
    document.head.appendChild(script);
  }, []);

  return (
    <div className="w-full h-screen">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
} 