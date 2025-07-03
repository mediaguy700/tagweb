'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase, databaseToArea, areaToDatabase } from '../lib/supabase';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}



interface Area {
  id: string;
  name: string;
  center: Location;
  radius: number;
  color: string;
  isActive: boolean;
  isInside: boolean;
  created: Date;
}





export default function GoogleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Getting your location...');
  const [mapMode, setMapMode] = useState<'3D' | '2D'>('3D');
  const [mapType, setMapType] = useState<'satellite' | 'roadmap' | 'terrain' | 'hybrid'>('hybrid');
  const [showLabels, setShowLabels] = useState(true);
  const [mapTypePosition, setMapTypePosition] = useState({ x: 16, y: 128 }); // Default position
  const [areasPosition, setAreasPosition] = useState({ x: 16, y: 128 }); // Default position for Areas dialog
  const [showMapControls, setShowMapControls] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [newArea, setNewArea] = useState({
    name: '',
    radius: 50, // 50 feet default
    color: '#FF4444'
  });
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [areaAlerts, setAreaAlerts] = useState<string[]>([]);
  const [clickMode, setClickMode] = useState(false);
  const [clickLocation, setClickLocation] = useState<Location | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingAreas, setIsDraggingAreas] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mapReady, setMapReady] = useState(false);
  const [isRedrawing, setIsRedrawing] = useState(false);

  // Store map and marker references
  const mapRefInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const areaCirclesRef = useRef<{ [key: string]: google.maps.Circle }>({});
  const areaLabelsRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const clickMarkerRef = useRef<google.maps.Marker | null>(null);
  const clickModeRef = useRef(false);
  const watchId = useRef<number | null>(null);
  const isMounted = useRef(true);
  const mapCreated = useRef(false);

  // Debug logging
  console.log('GoogleMap component rendered');
  console.log('Google Maps API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');

  // Utility function to calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Simple Supabase connection test
  const testSupabaseConnection = async () => {
    try {
      console.log('Testing basic Supabase connection...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Supabase connection error:', error);
        return false;
      }
      
      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  };

  // Check if areas table exists
  const checkTableExists = async () => {
    try {
      console.log('Checking if areas table exists...');
      const { data, error } = await supabase
        .from('areas')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Table check error:', error);
        if (error.code === '42P01') {
          console.error('Table does not exist!');
          setDatabaseError('Areas table not found. Please run the SQL schema in Supabase.');
          return false;
        }
        return false;
      }

      console.log('Areas table exists and is accessible');
      return true;
    } catch (error) {
      console.error('Error checking table:', error);
      return false;
    }
  };

  // Test database connection
  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      
      // First test basic Supabase connection
      const basicConnection = await testSupabaseConnection();
      if (!basicConnection) {
        setDatabaseStatus('disconnected');
        setDatabaseError('Failed to connect to Supabase. Check your credentials.');
        return false;
      }
      
      // Then check if table exists
      const tableExists = await checkTableExists();
      if (!tableExists) {
        setDatabaseStatus('disconnected');
        return false;
      }
      
      const { data, error } = await supabase
        .from('areas')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Database connection test failed:', error);
        setDatabaseStatus('disconnected');
        setDatabaseError(`Database connection failed: ${error.message}`);
        return false;
      }

      console.log('Database connection test successful');
      setDatabaseStatus('connected');
      setDatabaseError(null);
      return true;
    } catch (error) {
      console.error('Database connection test error:', error);
      setDatabaseStatus('disconnected');
      setDatabaseError(`Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Generate UUID (with fallback for older browsers)
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Load areas from database
  const loadAreasFromDatabase = async () => {
    try {
      console.log('=== LOADING AREAS FROM DATABASE ===');
      setDatabaseStatus('loading');
      setDatabaseError(null);
      
      // Test database connection first
      const connectionOk = await testDatabaseConnection();
      if (!connectionOk) {
        console.log('Database connection failed, aborting area load');
        return;
      }
      
      console.log('Database connection OK, fetching areas...');
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading areas:', error);
        setDatabaseStatus('disconnected');
        setDatabaseError(`Database error: ${error.message}`);
        return;
      }

      console.log('Raw database response:', data);
      
      if (data && data.length > 0) {
        const loadedAreas = data.map(databaseToArea);
        console.log('Converted areas from database:', loadedAreas);
        setAreas(loadedAreas);
        setDatabaseStatus('connected');
        setDatabaseError(null);
        console.log('Areas state updated, count:', loadedAreas.length);
      } else {
        console.log('No areas found in database');
        setAreas([]);
        setDatabaseStatus('connected');
        setDatabaseError(null);
      }
    } catch (error) {
      console.error('Error loading areas from database:', error);
      setDatabaseStatus('disconnected');
      setDatabaseError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Load areas on component mount
  useEffect(() => {
    console.log('=== LOADING AREAS ON MOUNT ===');
    loadAreasFromDatabase();
  }, []);

  // Redraw areas when both areas and map are ready
  useEffect(() => {
    console.log('=== AREA REDRAW EFFECT ===');
    console.log('Areas count:', areas.length);
    console.log('Map ready:', mapReady);
    console.log('Google Maps available:', !!window.google);
    
    if (areas.length > 0 && mapReady && window.google) {
      console.log('Areas and map ready, triggering redraw');
      // Use a longer delay to ensure map is fully initialized
      setTimeout(() => {
        redrawAllAreas();
      }, 1000);
    } else {
      console.log('Not ready to redraw areas:', {
        areasCount: areas.length,
        mapReady,
        googleAvailable: !!window.google
      });
    }
  }, [areas, mapReady]);

  // Handle component unmounting
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Clean up map instance
      if (mapRefInstance.current) {
        mapRefInstance.current = null;
      }
      mapCreated.current = false;
    };
  }, []);

  useEffect(() => {
    // Load Google Maps immediately
    const loadGoogleMaps = async () => {
      try {
        console.log('Loading Google Maps...');
        console.log('API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
        if (!isMounted.current) return;
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps) {
          // Only now is it safe to get location and create the map
          getCurrentLocation();
          return;
        }

        // Load Google Maps script
        const script = document.createElement('script');
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBDeSO-0ABqF8X90eB-C5undjnUFH4Gc30';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        
        console.log('Loading Google Maps script with URL:', script.src);
        console.log('API Key being used:', apiKey);
        
        script.onload = () => {
          console.log('Google Maps script loaded successfully');
          if (isMounted.current) {
            console.log('Google Maps API loaded successfully');
            getCurrentLocation();
          }
        };
        
        script.onerror = (error) => {
          console.error('Failed to load Google Maps script:', error);
          if (isMounted.current) {
            setError('Google Maps API key is invalid or restricted. Please get a valid API key from Google Cloud Console.');
            setLoading(false);
            
            // Show a placeholder instead of trying to create a map
                      setCurrentLocation({ lat: 33.1844264401088, lng: -96.90661699192682 });
          setLocationStatus('Map not available - API key required');
          }
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        if (isMounted.current) {
          setError('Failed to load Google Maps');
          setLoading(false);
          
          // Create fallback map with default location
          const fallbackLocation = { lat: 37.7749, lng: -122.4194 };
          createMap(fallbackLocation, '📍 Default Location (Location access denied)');
        }
      }
    };

    const getAverageLocation = (locations: Location[]): Location => {
      if (locations.length === 0) {
        return { lat: 33.1844264401088, lng: -96.90661699192682 };
      }

      // Weight locations by accuracy (lower accuracy = higher weight)
      let totalWeight = 0;
      let weightedLat = 0;
      let weightedLng = 0;

      locations.forEach(loc => {
        const weight = 1 / Math.max(loc.accuracy || 1, 1); // Avoid division by zero
        totalWeight += weight;
        weightedLat += loc.lat * weight;
        weightedLng += loc.lng * weight;
      });

      return {
        lat: weightedLat / totalWeight,
        lng: weightedLng / totalWeight,
        accuracy: Math.min(...locations.map(loc => loc.accuracy || 1))
      };
    };

    const getCurrentLocation = () => {
      if (!window.google || !window.google.maps) {
        console.log('Google Maps not loaded yet, retrying getCurrentLocation in 500ms');
        setTimeout(getCurrentLocation, 500);
        return;
      }
      console.log('Getting current location...');
      console.log('Geolocation available:', !!navigator.geolocation);
      console.log('Google Maps available:', !!window.google);
      setLocationStatus('Getting your location...');
      
      // Add a timeout to prevent hanging
      const locationTimeout = setTimeout(() => {
        console.log('⚠️ Location request timed out, using fallback');
        setLocationStatus('Location timeout - using fallback location');
        setLoading(false);
        const fallbackLocation = { lat: 33.1844264401088, lng: -96.90661699192682 }; // Your actual location
        createMap(fallbackLocation, '📍 Fallback Location (Timeout)');
      }, 10000); // 10 second timeout
      
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        setError('Geolocation is not supported by your browser');
        setLoading(false);
        
        // Create fallback map with default location
        const fallbackLocation = { lat: 33.1844264401088, lng: -96.90661699192682 };
        createMap(fallbackLocation, '📍 Default Location (Location access denied)');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted.current) return;
          
          // Clear the timeout since we got location
          clearTimeout(locationTimeout);
          
          const initialLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          console.log('✅ Initial location obtained:', initialLocation);
          console.log('✅ About to create map with location:', initialLocation);
          console.log('✅ Google Maps available:', !!window.google);
          console.log('✅ Map ref available:', !!mapRef.current);
          
          setCurrentLocation(initialLocation);
          setAccuracy(position.coords.accuracy);
          setLocationStatus(`Location found: ±${Math.round(position.coords.accuracy)}m accuracy`);
          
          // Create map with initial location
          console.log('✅ Calling createMap...');
          createMap(initialLocation, '📍 Business Location');
          
          // Start continuous monitoring
          console.log('✅ Starting location monitoring...');
          startLocationMonitoring();
          
          // Set loading to false after location is obtained and map is created
          if (isMounted.current) setLoading(false);
        },
        (error) => {
          if (!isMounted.current) return;
          
          // Clear the timeout since we got an error
          clearTimeout(locationTimeout);
          
          console.log('Location error:', error);
          console.log('Error code:', error.code);
          console.log('Error message:', error.message);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your device location settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = `An unknown error occurred while getting location: ${error.message}`;
          }
          
          setError(errorMessage);
          setLoading(false);
          
          // Create fallback map with default location
          const fallbackLocation = { lat: 37.7749, lng: -122.4194 };
          createMap(fallbackLocation, '📍 Default Location (Location access denied)');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    };

    const startLocationMonitoring = () => {
      if (!navigator.geolocation) return;

      setLocationStatus('Monitoring for better accuracy...');

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!isMounted.current) return;

          const newLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          console.log('New location reading:', newLocation);

          // Add to history (keep last 10 readings)
          setLocationHistory(prev => {
            const updated = [...prev, newLocation].slice(-10);
            
            // Calculate average location if we have multiple readings
            if (updated.length >= 3) {
              const avgLocation = getAverageLocation(updated);
              console.log('Average location calculated:', avgLocation);
              
              setCurrentLocation(avgLocation);
              setAccuracy(avgLocation.accuracy || newLocation.accuracy || null);
              setLocationStatus(`High accuracy: ±${Math.round(avgLocation.accuracy || newLocation.accuracy || 1)}m (${updated.length} readings)`);
              
              // Check areas with new location
              checkAreas(avgLocation);
            } else {
              setCurrentLocation(newLocation);
              setAccuracy(newLocation.accuracy || null);
              setLocationStatus(`Improving accuracy: ±${Math.round(newLocation.accuracy || 1)}m (${updated.length}/3 readings)`);
              
              // Check areas with new location
              checkAreas(newLocation);
            }
            
            return updated;
          });
        },
        (error) => {
          console.log('Location monitoring error:', error);
          setLocationStatus('Location monitoring stopped');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000 // Update every second
        }
      );
    };

    const checkAreas = async (location: Location) => {
      console.log('Checking areas for location:', location);
      
      const newAlerts: string[] = [];
      const updatedAreas: Area[] = [];

      for (const area of areas) {
        if (!area.isActive) continue;

        const distance = calculateDistance(
          location.lat, location.lng,
          area.center.lat, area.center.lng
        );
        
        const radiusInMeters = area.radius * 0.3048; // Convert feet to meters
        const isInside = distance <= radiusInMeters;
        
        // Check if status changed
        if (isInside !== area.isInside) {
          const action = isInside ? 'entered' : 'exited';
          newAlerts.push(`${action} ${area.name}`);
          
          // Update in database
          try {
            const { error } = await supabase
              .from('areas')
              .update({ is_inside: isInside })
              .eq('id', area.id);

            if (error) {
              console.error('Error updating area isInside status:', error);
            } else {
              console.log('Updated area isInside status in database:', area.id, isInside);
            }
          } catch (error) {
            console.error('Error updating area isInside status:', error);
          }

          // Show notification if enabled
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Area Alert: ${action} ${area.name}`, {
              body: `You have ${action} the ${area.name} area`,
              icon: '/favicon.ico'
            });
          }
        }

        updatedAreas.push({ ...area, isInside });
      }

      if (newAlerts.length > 0) {
        setAreaAlerts(prev => [...prev, ...newAlerts]);
        setTimeout(() => {
          setAreaAlerts(prev => prev.filter(alert => !newAlerts.includes(alert)));
        }, 5000);
      }

      setAreas(updatedAreas);
    };

    const updateMapLocation = (location: Location) => {
      if (!mapRef.current || !window.google || !window.google.maps) return;

      // Update map center smoothly
      if (mapRefInstance.current) {
        mapRefInstance.current.panTo({ lat: location.lat, lng: location.lng });
      }
      
      // Update marker position
      if (markerRef.current) {
        markerRef.current.setPosition({ lat: location.lat, lng: location.lng });
      }

      console.log('Map location updated to:', location);
    };

    const createMap = (location: Location, title: string) => {
      try {
        console.log('🗺️ Creating 3D map for location:', location);
        console.log('🗺️ Map ref exists:', !!mapRef.current);
        console.log('🗺️ Google Maps available:', !!window.google);
        console.log('🗺️ Map already created:', mapCreated.current);
        
        // Prevent multiple map creations
        if (mapCreated.current && mapRefInstance.current) {
          console.log('Map already exists, updating location instead');
          updateMapLocation(location);
          return;
        }
        
        if (!mapRef.current) {
          console.error('Map container not found - ref is null');
          setError('Map container not found. Please refresh the page.');
          setLoading(false);
          return;
        }

        if (!window.google || !window.google.maps) {
          console.error('Google Maps not available');
          setError('Google Maps not available');
          setLoading(false);
          return;
        }

        console.log('Map container found:', mapRef.current);
        console.log('Container dimensions:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight);

        // Create map with 3D satellite view
        const map = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 20, // Higher zoom for maximum accuracy detail
          mapTypeId: (() => {
            switch (mapType) {
              case 'satellite':
                return window.google.maps.MapTypeId.SATELLITE;
              case 'roadmap':
                return window.google.maps.MapTypeId.ROADMAP;
              case 'terrain':
                return window.google.maps.MapTypeId.TERRAIN;
              case 'hybrid':
                return window.google.maps.MapTypeId.HYBRID;
              default:
                return window.google.maps.MapTypeId.SATELLITE;
            }
          })(),
          tilt: mapMode === '3D' && (mapType === 'satellite' || mapType === 'hybrid') ? 45 : 0, // 45-degree tilt for 3D perspective
          heading: 0, // North-facing
          fullscreenControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          zoomControl: true,
          scaleControl: true,
          rotateControl: true, // Enable rotation for 3D
          gestureHandling: 'auto', // Enable mouse wheel zoom
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Store map reference and mark as created
        mapRefInstance.current = map;
        mapCreated.current = true;
        setMapReady(true);
        
        // If areas are already loaded, redraw them now that the map is ready
        if (areas.length > 0) {
          console.log('Map created and areas already loaded, redrawing areas');
          setTimeout(() => {
            redrawAllAreas();
          }, 100);
        }

        // Create custom 3D marker for current location
        const marker = new window.google.maps.Marker({
          position: location,
          map: map,
          title: title,
          draggable: true, // Enable dragging for manual accuracy adjustment
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                  </filter>
                </defs>
                <circle cx="20" cy="20" r="16" fill="#4285F4" stroke="white" stroke-width="3" filter="url(#shadow)"/>
                <circle cx="20" cy="20" r="8" fill="white"/>
                <circle cx="20" cy="20" r="4" fill="#4285F4"/>
                <circle cx="20" cy="20" r="2" fill="white"/>
                <!-- Drag indicator -->
                <rect x="15" y="35" width="10" height="2" fill="#4285F4" rx="1"/>
                <rect x="17" y="37" width="6" height="2" fill="#4285F4" rx="1"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20)
          }
        });

        // Store marker reference
        markerRef.current = marker;

        // Add drag event listeners for manual location adjustment
        marker.addListener('dragstart', () => {
          console.log('Started dragging location marker');
          setLocationStatus('Dragging marker for manual adjustment...');
        });

        marker.addListener('drag', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const draggedLocation: Location = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
              accuracy: 1 // Manual adjustment has high accuracy
            };
            setCurrentLocation(draggedLocation);
            setAccuracy(1);
            setLocationStatus('Dragging to adjust location...');
          }
        });

        marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newLocation: Location = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
              accuracy: 1 // Manual adjustment has high accuracy
            };
            
            console.log('Location marker dragged to:', newLocation);
            setCurrentLocation(newLocation);
            setAccuracy(1);
            setLocationStatus('Location manually adjusted - High accuracy');
            
            // Accuracy circle removed - no circle around current location
            
            // Check areas with new location
            checkAreas(newLocation);
          }
        });

        // Accuracy circle removed - no blue circle around current location

        // Add info window with location details
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 180px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4285F4, #34A853); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                  <span style="color: white; font-size: 12px;">📍</span>
                </div>
                <div>
                  <h3 style="margin: 0; color: #1a1a1a; font-size: 12px; font-weight: 600;">${title}</h3>
                  <p style="margin: 2px 0 0 0; color: #666; font-size: 10px;">GPS Location</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; background: linear-gradient(135deg, #4285F4, #34A853); border-radius: 4px; color: white;">
                <span style="font-size: 10px; font-weight: 500;">${mapMode} ${mapType.charAt(0).toUpperCase() + mapType.slice(1)} View</span>
                <span style="font-size: 12px;">🌍</span>
              </div>
              <div style="margin-top: 8px; padding: 4px; background: #e8f5e8; border-radius: 4px; border-left: 2px solid #34A853;">
                <p style="margin: 0; color: #2d5a2d; font-size: 9px; line-height: 1.4;">
                  💡 <strong>Tip:</strong> Drag this marker to adjust your location manually for better accuracy
                </p>
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Auto-open info window for business location
        if (title.includes('Business Location')) {
          setTimeout(() => {
            infoWindow.open(map, marker);
          }, 1500);
        }

        // Add click event listener for creating areas
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          console.log('Map clicked! Click mode:', clickModeRef.current, 'Event:', event);
          if (clickModeRef.current && event.latLng) {
            console.log('Creating area at clicked location:', event.latLng.lat(), event.latLng.lng());
            const clickedLocation: Location = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            
            setClickLocation(clickedLocation);
            setShowAreaForm(true);
            console.log('=== AREA FORM SHOWN ===');
            console.log('Current newArea state:', newArea);
            console.log('Click location:', clickedLocation);
            
            // Show temporary marker at clicked location
            if (clickMarkerRef.current) {
              clickMarkerRef.current.setMap(null);
            }
            
            clickMarkerRef.current = new window.google.maps.Marker({
              position: clickedLocation,
              map: map,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="12" fill="#FF4444" stroke="white" stroke-width="2"/>
                    <circle cx="15" cy="15" r="6" fill="white"/>
                    <circle cx="15" cy="15" r="3" fill="#FF4444"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(30, 30),
                anchor: new window.google.maps.Point(15, 15)
              },
              title: 'Click to create area here'
            });
          } else {
            console.log('Click mode not active or no latLng');
          }
        });

        // Add 3D controls and animations
        setTimeout(() => {
          // Smooth zoom animation to show 3D buildings (only for satellite/hybrid)
          if (mapType === 'satellite' || mapType === 'hybrid') {
            map.setZoom(21); // Maximum zoom for highest detail
            map.setTilt(60);
          } else {
            map.setZoom(20); // Standard zoom for other map types
            map.setTilt(0);
          }
        }, 2000);

        console.log('3D map created successfully');
        
        // Redraw all existing areas on the new map
        setTimeout(() => {
          redrawAllAreas();
        }, 100);
        
        // Also redraw areas after a longer delay to ensure everything is loaded
        setTimeout(() => {
          console.log('Delayed redraw of areas after map creation');
          redrawAllAreas();
        }, 1000);
        
      } catch (err) {
        console.error('Error creating map:', err);
        if (isMounted.current) {
          const errorMessage = (err as Error).message;
          console.log('Full error details:', err);
          setError(`Failed to create map: ${errorMessage}`);
          setLoading(false);
        }
      }
    };

    // Load Google Maps immediately
    loadGoogleMaps();

    return () => {
      isMounted.current = false;
      // Clean up location watching
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      // Clean up map instance
      if (mapRefInstance.current) {
        mapRefInstance.current = null;
      }
      mapCreated.current = false;
    };
  }, []); // Remove areas dependency to prevent re-renders

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging || isDraggingAreas) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isDraggingAreas, dragOffset]);

  // Monitor areas changes and redraw when needed
  useEffect(() => {
    console.log('=== AREAS CHANGED ===');
    console.log('New areas count:', areas.length);
    console.log('Map available:', !!mapRefInstance.current);
    
    if (areas.length > 0 && mapRefInstance.current && window.google) {
      console.log('Auto-redrawing areas due to state change');
      setTimeout(() => {
        redrawAllAreas();
      }, 100);
    }
  }, [areas]);

  // Monitor newArea state changes for debugging
  useEffect(() => {
    console.log('=== NEWAREA STATE CHANGED ===');
    console.log('Current newArea:', newArea);
  }, [newArea]);

  const createArea = async () => {
    const locationToUse = clickLocation || currentLocation;
    if (!locationToUse || !newArea.name.trim()) return;

    console.log('=== CREATING PLAY SPACE ===');
    console.log('Location to use:', locationToUse);
    console.log('Play Space data:', {
      name: newArea.name,
      radius: newArea.radius,
      color: newArea.color
    });

    const area: Area = {
      id: generateUUID(),
      name: newArea.name,
      center: { ...locationToUse },
      radius: newArea.radius,
      color: newArea.color,
      isActive: true,
      isInside: false,
      created: new Date()
    };

    console.log('Created play space object:', area);

    try {
      // Save to database
      console.log('Attempting to save play space to database:', areaToDatabase(area));
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key present:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY);
      
      const { data, error } = await supabase
        .from('areas')
        .insert([areaToDatabase(area)])
        .select()
        .single();

      console.log('Database response:', { data, error });

      if (error) {
        console.error('Error saving play space to database:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Show user-friendly error
        if (error.code === '42P01') {
          setError('Database table not found. Please run the SQL schema in Supabase.');
        } else if (error.code === '23505') {
          setError('Play space with this name already exists.');
        } else {
          setError(`Database error: ${error.message}`);
        }
        return;
      }

      // Update local state with database data
      const savedArea = databaseToArea(data);
      setAreas(prev => {
        const newAreas = [...prev, savedArea];
        console.log('Updated areas array:', newAreas);
        return newAreas;
      });

      console.log('Play space saved to database successfully:', savedArea);
    } catch (error) {
      console.error('Error creating play space:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      setError(`Failed to create play space: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
    
    setShowAreaForm(false);
    setNewArea({ name: '', radius: 50, color: '#FF4444' });
    setClickLocation(null);
    setClickMode(false);
    clickModeRef.current = false;

    // Remove temporary click marker
    if (clickMarkerRef.current) {
      clickMarkerRef.current.setMap(null);
      clickMarkerRef.current = null;
    }

    // Draw area on map
    if (mapRefInstance.current && window.google) {
      console.log('=== DRAWING AREA CIRCLE ===');
      try {
        const circle = new window.google.maps.Circle({
          strokeColor: area.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: area.color,
          fillOpacity: 0.1,
          map: mapRefInstance.current,
          center: area.center,
          radius: area.radius * 0.3048 // Convert feet to meters
        });

        console.log('Circle created:', circle);
        areaCirclesRef.current[area.id] = circle;

        // Add click listener to circle
        circle.addListener('click', () => {
          console.log('Area circle clicked:', area.name);
          setSelectedArea(area);
        });
        
        console.log('=== AREA CIRCLE CREATED SUCCESSFULLY ===');
        console.log('Current circles ref:', Object.keys(areaCirclesRef.current));
      } catch (error) {
        console.error('Error creating circle:', error);
      }
    } else {
      console.error('=== CANNOT DRAW AREA ===');
      console.error('Map instance:', mapRefInstance.current);
      console.error('Google Maps:', !!window.google);
    }
  };

  // Function to redraw all existing areas on the map
  const redrawAllAreas = () => {
    if (isRedrawing) {
      console.log('Redraw already in progress, skipping...');
      return;
    }
    
    console.log('=== REDRAWING ALL AREAS ===');
    console.log('Areas to redraw:', areas.length);
    console.log('Map instance:', mapRefInstance.current);
    console.log('Google Maps available:', !!window.google);
    
    if (!mapRefInstance.current || !window.google) {
      console.error('Cannot redraw areas: map or Google Maps not available');
      return;
    }

    setIsRedrawing(true);

    console.log('Clearing existing circles and labels...');
    // Clear existing circles
    Object.values(areaCirclesRef.current).forEach(circle => {
      if (circle) {
        console.log('Removing circle from map');
        circle.setMap(null);
      }
    });
    areaCirclesRef.current = {};

    // Clear existing labels
    Object.values(areaLabelsRef.current).forEach(label => {
      if (label) {
        console.log('Removing label from map');
        label.setMap(null);
      }
    });
    areaLabelsRef.current = {};

    console.log('Redrawing', areas.length, 'areas');
    
    // Redraw all areas
    areas.forEach((area, index) => {
      console.log(`Drawing area ${index + 1}/${areas.length}:`, area.name);
      try {
        const circle = new window.google.maps.Circle({
          strokeColor: area.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: area.color,
          fillOpacity: 0.1,
          map: mapRefInstance.current,
          center: area.center,
          radius: area.radius * 0.3048, // Convert feet to meters
          draggable: true // Enable dragging
        });

        areaCirclesRef.current[area.id] = circle;

        // Add click listener to circle
        circle.addListener('click', () => {
          console.log('Area circle clicked:', area.name);
          setSelectedArea(area);
        });

        // Add drag listeners to update database when area is moved
        circle.addListener('dragstart', () => {
          console.log('Started dragging area:', area.name);
          setLocationStatus(`Dragging ${area.name}...`);
        });

        circle.addListener('drag', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newCenter = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            
            // Update the label position in real-time during drag
            if (areaLabelsRef.current[area.id]) {
              areaLabelsRef.current[area.id].setPosition(newCenter);
            }
            
            setLocationStatus(`Moving ${area.name}...`);
          }
        });

        circle.addListener('dragend', async (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newCenter = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            
            console.log(`Area ${area.name} dragged to:`, newCenter);
            
            // Update local state immediately
            setAreas(prev => prev.map(a => 
              a.id === area.id ? { ...a, center: newCenter } : a
            ));
            
            // Update label position
            if (areaLabelsRef.current[area.id]) {
              areaLabelsRef.current[area.id].setPosition(newCenter);
            }
            
            // Update database
            try {
              const { error } = await supabase
                .from('areas')
                .update({ 
                  center_lat: newCenter.lat,
                  center_lng: newCenter.lng
                })
                .eq('id', area.id);

              if (error) {
                console.error('Error updating area position in database:', error);
                setLocationStatus(`Failed to save ${area.name} position`);
              } else {
                console.log('Area position updated in database:', area.id, newCenter);
                setLocationStatus(`${area.name} moved successfully`);
                
                // Check if user is now inside the moved area
                if (currentLocation) {
                  // Re-check areas with current location
                  const distance = calculateDistance(
                    currentLocation.lat, currentLocation.lng,
                    newCenter.lat, newCenter.lng
                  );
                  const radiusInMeters = area.radius * 0.3048;
                  const isInside = distance <= radiusInMeters;
                  
                  // Update area's isInside status
                  setAreas(prev => prev.map(a => 
                    a.id === area.id ? { ...a, isInside } : a
                  ));
                }
              }
            } catch (error) {
              console.error('Error updating area position:', error);
              setLocationStatus(`Failed to save ${area.name} position`);
            }
          }
        });

        // Create label for the area
        const label = new window.google.maps.Marker({
          position: area.center,
          map: mapRefInstance.current,
          label: {
            text: area.name,
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 'bold',
            className: 'geofence-label'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 0,
            fillColor: area.color,
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          },
          clickable: false,
          zIndex: 1000
        });

        areaLabelsRef.current[area.id] = label;
        
        console.log(`Area ${area.name} drawn successfully with label`);
      } catch (error) {
        console.error(`Error drawing area ${area.name}:`, error);
      }
    });
    
    console.log('=== ALL AREAS REDRAWN ===');
    console.log('Final circles count:', Object.keys(areaCirclesRef.current).length);
    console.log('Final labels count:', Object.keys(areaLabelsRef.current).length);
    
    // Add a check to ensure areas are still visible after a short delay
    setTimeout(() => {
      console.log('=== POST-REDRAW CHECK ===');
      console.log('Circles still on map:', Object.keys(areaCirclesRef.current).length);
      console.log('Labels still on map:', Object.keys(areaLabelsRef.current).length);
      console.log('Map instance still valid:', !!mapRefInstance.current);
    }, 2000);
    
    // Mark redraw as complete
    setIsRedrawing(false);
  };

  const deleteArea = async (id: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting area from database:', error);
        return;
      }

      console.log('Area deleted from database successfully:', id);
    } catch (error) {
      console.error('Error deleting area:', error);
      return;
    }

    // Update local state
    setAreas(prev => prev.filter(a => a.id !== id));
    
    // Remove circle from map
    if (areaCirclesRef.current[id]) {
      areaCirclesRef.current[id].setMap(null);
      delete areaCirclesRef.current[id];
    }

    // Remove label from map
    if (areaLabelsRef.current[id]) {
      areaLabelsRef.current[id].setMap(null);
      delete areaLabelsRef.current[id];
    }
    
    setSelectedArea(null);
  };

  const toggleArea = async (id: string) => {
    const area = areas.find(a => a.id === id);
    if (!area) return;

    const newIsActive = !area.isActive;

    try {
      // Update in database
      const { error } = await supabase
        .from('areas')
        .update({ is_active: newIsActive })
        .eq('id', id);

      if (error) {
        console.error('Error updating area in database:', error);
        return;
      }

      console.log('Area status updated in database:', id, newIsActive);
    } catch (error) {
      console.error('Error updating area:', error);
      return;
    }

    // Update local state
    setAreas(prev => prev.map(a => 
      a.id === id ? { ...a, isActive: newIsActive } : a
    ));
  };

  const toggleMapMode = () => {
    setMapMode(prev => prev === '3D' ? '2D' : '3D');
  };

  const changeMapType = (newMapType: 'satellite' | 'roadmap' | 'terrain' | 'hybrid') => {
    setMapType(newMapType);
    
    if (mapRefInstance.current) {
      let mapTypeId: google.maps.MapTypeId;
      
      switch (newMapType) {
        case 'satellite':
          mapTypeId = window.google.maps.MapTypeId.SATELLITE;
          break;
        case 'roadmap':
          mapTypeId = window.google.maps.MapTypeId.ROADMAP;
          break;
        case 'terrain':
          mapTypeId = window.google.maps.MapTypeId.TERRAIN;
          break;
        case 'hybrid':
          mapTypeId = window.google.maps.MapTypeId.HYBRID;
          break;
        default:
          mapTypeId = window.google.maps.MapTypeId.SATELLITE;
      }
      
      mapRefInstance.current.setMapTypeId(mapTypeId);
      
      // Update showLabels state based on map type
      // Hybrid and roadmap have labels, satellite and terrain have limited/no labels
      setShowLabels(newMapType === 'hybrid' || newMapType === 'roadmap');
      
      // Adjust tilt based on map type and mode
      if (mapMode === '3D' && (newMapType === 'satellite' || newMapType === 'hybrid')) {
        mapRefInstance.current.setTilt(45);
      } else {
        mapRefInstance.current.setTilt(0);
      }
    }
  };

  const toggleLabels = () => {
    const newShowLabels = !showLabels;
    setShowLabels(newShowLabels);
    
    if (mapRefInstance.current) {
      // Handle different map types for label toggling
      if (mapType === 'satellite') {
        // Toggle between satellite (no labels) and hybrid (with labels)
        const newMapType = newShowLabels ? 'hybrid' : 'satellite';
        setMapType(newMapType);
        mapRefInstance.current.setMapTypeId(
          newShowLabels ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.SATELLITE
        );
      } else if (mapType === 'hybrid') {
        // Toggle between hybrid (with labels) and satellite (no labels)
        const newMapType = newShowLabels ? 'hybrid' : 'satellite';
        setMapType(newMapType);
        mapRefInstance.current.setMapTypeId(
          newShowLabels ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.SATELLITE
        );
      } else if (mapType === 'roadmap') {
        // For roadmap, we can toggle between roadmap and terrain (which has different label styles)
        const newMapType = newShowLabels ? 'roadmap' : 'terrain';
        setMapType(newMapType);
        mapRefInstance.current.setMapTypeId(
          newShowLabels ? window.google.maps.MapTypeId.ROADMAP : window.google.maps.MapTypeId.TERRAIN
        );
      } else if (mapType === 'terrain') {
        // For terrain, toggle back to roadmap
        const newMapType = newShowLabels ? 'roadmap' : 'terrain';
        setMapType(newMapType);
        mapRefInstance.current.setMapTypeId(
          newShowLabels ? window.google.maps.MapTypeId.ROADMAP : window.google.maps.MapTypeId.TERRAIN
        );
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleAreasMouseDown = (e: React.MouseEvent) => {
    setIsDraggingAreas(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 200; // Approximate dialog width
      const maxY = window.innerHeight - 150; // Approximate dialog height
      
      setMapTypePosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    } else if (isDraggingAreas) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 350; // Approximate areas dialog width
      const maxY = window.innerHeight - 400; // Approximate areas dialog height
      
      setAreasPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingAreas(false);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const toggleClickMode = () => {
    console.log('Toggling click mode from:', clickMode, 'to:', !clickMode);
    const newClickMode = !clickMode;
    setClickMode(newClickMode);
    clickModeRef.current = newClickMode;
    
    if (clickMode) {
      // Cancel click mode
      console.log('Canceling click mode');
      setClickLocation(null);
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setMap(null);
        clickMarkerRef.current = null;
      }
    } else {
      console.log('Enabling click mode');
    }
  };

  const cancelAreaCreation = () => {
    setShowAreaForm(false);
    setClickLocation(null);
    setClickMode(false);
    clickModeRef.current = false;
    if (clickMarkerRef.current) {
      clickMarkerRef.current.setMap(null);
      clickMarkerRef.current = null;
    }
  };

  const selectArea = (area: Area) => {
    console.log('Selecting area:', area.name);
    setSelectedArea(area);
  };

  const clearAreaSelection = () => {
    setSelectedArea(null);
  };

  // Function to reset location to GPS
  const resetToGPSLocation = () => {
    console.log('Resetting to GPS location');
    setLocationStatus('Resetting to GPS location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          console.log('GPS location obtained:', gpsLocation);
          setCurrentLocation(gpsLocation);
          setAccuracy(position.coords.accuracy);
          setLocationStatus(`GPS location: ±${Math.round(position.coords.accuracy)}m accuracy`);
          
          // Update marker position
          if (markerRef.current) {
            markerRef.current.setPosition(gpsLocation);
          }
          
          // Update map center
          if (mapRefInstance.current) {
            mapRefInstance.current.panTo(gpsLocation);
          }
          
          // Note: Areas will be checked automatically by the location monitoring
        },
        (error) => {
          console.error('Error getting GPS location:', error);
          setLocationStatus('Failed to get GPS location');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      setLocationStatus('GPS not available');
    }
  };

  // Test function to create a sample area
  const createTestArea = () => {
    console.log('=== CREATING TEST AREA ===');
    if (!currentLocation) {
      console.error('No business location available for test area');
      return;
    }

    const testArea: Area = {
      id: 'test-' + Date.now(),
      name: 'Test Area',
      center: { ...currentLocation },
      radius: 50, // 50 feet
      color: '#FF0000',
      isActive: true,
      isInside: false,
      created: new Date()
    };

    console.log('Test area:', testArea);

    setAreas(prev => {
      const newAreas = [...prev, testArea];
      console.log('Updated areas with test:', newAreas);
      return newAreas;
    });

    // Draw test area on map
    if (mapRefInstance.current && window.google) {
      console.log('Drawing test area circle');
      try {
        const circle = new window.google.maps.Circle({
          strokeColor: testArea.color,
          strokeOpacity: 0.8,
          strokeWeight: 3,
          fillColor: testArea.color,
          fillOpacity: 0.2,
          map: mapRefInstance.current,
          center: testArea.center,
          radius: testArea.radius * 0.3048 // Convert feet to meters
        });

        areaCirclesRef.current[testArea.id] = circle;
        console.log('Test area circle created successfully');
      } catch (error) {
        console.error('Error creating test area circle:', error);
      }
    } else {
      console.error('Cannot draw test area: map or Google Maps not available');
    }
  };

  // Create areas table
  const createAreasTable = async () => {
    try {
      console.log('Creating areas table...');
      setDatabaseStatus('loading');
      
      // SQL to create the areas table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS areas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          center_lat DOUBLE PRECISION NOT NULL,
          center_lng DOUBLE PRECISION NOT NULL,
          radius INTEGER NOT NULL,
          color TEXT NOT NULL DEFAULT '#FF4444',
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_inside BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow all operations" ON areas;
        CREATE POLICY "Allow all operations" ON areas FOR ALL USING (true);

        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_areas_updated_at ON areas;
        CREATE TRIGGER update_areas_updated_at 
            BEFORE UPDATE ON areas 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
      `;

      // Note: This would require server-side execution
      // For now, we'll show instructions
      setDatabaseError('Please run the SQL schema manually in your Supabase SQL Editor. See database_setup.sql file.');
      setDatabaseStatus('disconnected');
      
    } catch (error) {
      console.error('Error creating table:', error);
      setDatabaseError(`Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDatabaseStatus('disconnected');
    }
  };

  // Show inactive user message if user is not active
  // TEMPORARILY DISABLED - UNCOMMENT AFTER RUNNING SQL SCRIPT IN SUPABASE
  /*
  if (user && !user.is_active) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <div className="text-gray-400 text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Account Not Active</h2>
          <p className="text-gray-600 mb-4">
            Welcome, <span className="font-medium">{user.username}</span>! Your account is currently inactive.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">What you can do:</p>
            <ul className="text-xs text-blue-600 mt-2 space-y-1">
              <li>• Contact support to activate your account</li>
              <li>• Check your email for activation instructions</li>
              <li>• Wait for admin approval</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Once your account is active, you'll have access to the full map functionality.
          </p>
        </div>
      </div>
    );
  }
  */

  return (
    <div className="w-full h-screen relative">
      {/* Always render the map container */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100vh',
          minHeight: '400px'
        }}
      />
      
      {/* Placeholder when map is not available */}
      {error && !mapRefInstance.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-gray-400 text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Map Placeholder</h2>
            <p className="text-gray-600 mb-4">Google Maps is not available due to API key issues.</p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Current Location:</p>
              <p className="text-xs text-blue-600 mt-1">
                {currentLocation ? 
                  `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : 
                  'Location not available'
                }
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Database Error Display - DISABLED FOR TESTING */}
      {/* {databaseError && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg max-w-md">
            <p className="text-sm font-medium">Database Error</p>
            <p className="text-xs">{databaseError}</p>
            <button
              onClick={() => setDatabaseError(null)}
              className="text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )} */}
      
      {/* Click Mode Indicator */}
      {clickMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            <p className="text-sm font-medium">🎯 Click Mode Active - Click anywhere on the map to create an area</p>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-center bg-white rounded-lg p-6 shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{locationStatus}</p>
            <p className="text-xs text-gray-500 mt-2">Loading {mapMode.toLowerCase()} {mapType} view...</p>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Google Maps Not Available</h2>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="text-xs text-gray-500 mb-4">
              <p>To fix this:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Google Cloud Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable "Maps JavaScript API"</li>
                <li>Create an API key in Credentials</li>
                <li>Add the key to your .env.local file as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</li>
              </ol>
            </div>
            <button
              onClick={() => setError(null)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Area Alerts */}
      {areaAlerts.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          {areaAlerts.map((alert, index) => (
            <div key={index} className="bg-white bg-opacity-95 rounded-lg p-3 shadow-lg mb-2 animate-pulse">
              <p className="text-sm font-medium text-gray-800">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Area Controls */}
      <div className="absolute top-32 right-4 z-20 space-y-2">
        <button
          onClick={toggleClickMode}
          className={`w-full px-4 py-2 rounded-lg shadow-lg transition-all duration-200 font-medium ${
            clickMode 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {clickMode ? '❌ Cancel Click Mode' : '🎯 Create Area'}
        </button>

        {/* Map Type Control */}
        <div className="bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
          <h3 className="font-semibold text-sm text-gray-800 mb-2">🗺️ Map Type</h3>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <button
              onClick={() => changeMapType('satellite')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                mapType === 'satellite' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => changeMapType('roadmap')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                mapType === 'roadmap' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Roadmap
            </button>
            <button
              onClick={() => changeMapType('terrain')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                mapType === 'terrain' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => changeMapType('hybrid')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                mapType === 'hybrid' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Hybrid
            </button>
          </div>
          {/* Labels Toggle */}
          <div className="border-t pt-2">
            <button
              onClick={toggleLabels}
              className={`w-full px-2 py-1 text-xs rounded font-medium transition-colors ${
                showLabels 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showLabels ? '🏷️ Labels On' : '🏷️ Labels Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Area Form */}
      {showAreaForm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Create Play Space {clickLocation ? 'at Clicked Location' : 'at Business Location'}
            </h3>
            {clickLocation && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  📍 Location: {clickLocation.lat.toFixed(6)}, {clickLocation.lng.toFixed(6)}
                </p>
              </div>
            )}
            {/* Debug section */}
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-800 font-mono">
                Debug - Current Play Space Form State:
              </p>
              <p className="text-xs text-yellow-800 font-mono">
                Play Space Name: "{newArea.name}" | Radius: {newArea.radius} | Color: {newArea.color}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Play Space Name</label>
                <input
                  type="text"
                  value={newArea.name}
                  onChange={(e) => {
                    console.log('Play Space Name input changed:', e.target.value);
                    setNewArea(prev => {
                      const updated = { ...prev, name: e.target.value };
                      console.log('Updated newArea state:', updated);
                      return updated;
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Playground, Sandbox, Jungle Gym, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Play Space Radius (feet)</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={newArea.radius}
                  onChange={(e) => {
                    console.log('Play Space Radius input changed:', e.target.value);
                    setNewArea(prev => {
                      const updated = { ...prev, radius: parseInt(e.target.value) };
                      console.log('Updated newArea state:', updated);
                      return updated;
                    });
                  }}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">{newArea.radius} feet</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Play Space Color</label>
                <input
                  type="color"
                  value={newArea.color}
                  onChange={(e) => {
                    console.log('Play Space Color input changed:', e.target.value);
                    setNewArea(prev => {
                      const updated = { ...prev, color: e.target.value };
                      console.log('Updated newArea state:', updated);
                      return updated;
                    });
                  }}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={createArea}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
              >
                Create Play Space
              </button>
              <button
                onClick={cancelAreaCreation}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area List */}
      {areas.length > 0 && (
        <div 
          className="absolute z-20 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg max-w-sm cursor-move"
          style={{
            position: 'absolute',
            top: areasPosition.y,
            left: areasPosition.x,
            zIndex: 20,
            userSelect: 'none'
          }}
          onMouseDown={handleAreasMouseDown}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg text-gray-800">🏗️ Play Spaces ({areas.length})</h3>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-500">
                {areas.filter(a => a.isActive).length} active
              </div>
              <div className="w-4 h-4 bg-gray-300 rounded cursor-move flex items-center justify-center">
                <span className="text-xs">⋮⋮</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {areas.map(area => (
              <div 
                key={area.id} 
                className={`bg-gray-50 rounded-lg p-3 border-l-4 cursor-pointer transition-all duration-200 hover:bg-gray-100 ${
                  selectedArea?.id === area.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`} 
                style={{ borderLeftColor: area.color }}
                onClick={() => selectArea(area)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-800">{area.name}</h4>
                      <span 
                        className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: area.color }}
                      ></span>
                      {selectedArea?.id === area.id && (
                        <span className="text-blue-500 text-xs">✓ Selected</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      📍 {area.center.lat.toFixed(6)}, {area.center.lng.toFixed(6)}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Radius: {area.radius} feet</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          area.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {area.isActive ? '● Active' : '○ Paused'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          area.isInside 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {area.isInside ? '📍 Inside' : '📍 Outside'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {area.created.toLocaleDateString()} {area.created.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArea(area.id);
                      }}
                      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                        area.isActive 
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {area.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteArea(area.id);
                      }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {areas.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                <p>💡 Click on area circles on the map to select them</p>
                <p>🎯 Use different colors to distinguish areas</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Area Summary (when no areas exist) */}
      {areas.length === 0 && (
        <div 
          className="absolute z-20 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg max-w-sm cursor-move"
          style={{
            position: 'absolute',
            top: areasPosition.y,
            left: areasPosition.x,
            zIndex: 20,
            userSelect: 'none'
          }}
          onMouseDown={handleAreasMouseDown}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg text-gray-800">🏗️ No Play Spaces Yet</h3>
            <div className="w-4 h-4 bg-gray-300 rounded cursor-move flex items-center justify-center">
              <span className="text-xs">⋮⋮</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Create your first play space to start monitoring:
          </p>
          <div className="space-y-2 text-xs text-gray-600">
            <p>• Click "🎯 Create Area" to place play spaces anywhere</p>
            <p>• Or use "🏗️ Create at Business Location"</p>
            <p>• Perfect for monitoring room entry/exit</p>
          </div>
        </div>
      )}

      {/* Selected Area Details */}
      {selectedArea && (
        <div className="absolute bottom-4 right-4 z-20 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg text-gray-800">📍 {selectedArea.name}</h3>
            <button
              onClick={clearAreaSelection}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: selectedArea.color }}
              ></span>
              <span className="text-sm text-gray-600">Color: {selectedArea.color}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Radius: {selectedArea.radius} feet</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedArea.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {selectedArea.isActive ? '● Active' : '○ Paused'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedArea.isInside 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {selectedArea.isInside ? '📍 Inside Area' : '📍 Outside Area'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              <p>Created: {selectedArea.created.toLocaleDateString()}</p>
              <p>Time: {selectedArea.created.toLocaleTimeString()}</p>
            </div>
            {currentLocation && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Distance from business location:</p>
                <p className="text-sm font-medium text-blue-600">
                  {(calculateDistance(
                    currentLocation.lat, 
                    currentLocation.lng, 
                    selectedArea.center.lat, 
                    selectedArea.center.lng
                  ) * 3.28084).toFixed(1)} feet
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 