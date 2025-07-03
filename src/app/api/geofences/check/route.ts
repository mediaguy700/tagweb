import { NextRequest, NextResponse } from 'next/server';
import { supabase, databaseToArea, DatabaseArea } from '../../../../lib/supabase';

// POST /api/geofences/check - Check if a location is inside any geofences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('API: Checking location against geofences:', body);

    // Validate required fields
    const { lat, lng } = body;
    
    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: lat, lng' },
        { status: 400 }
      );
    }

    // Fetch all active geofences
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch geofences', details: error.message },
        { status: 500 }
      );
    }

    // Convert to app format
    const geofences = data?.map(databaseToArea) || [];
    
    // Check which geofences the location is inside
    const insideGeofences = geofences.filter((geofence: any) => {
      const distance = calculateDistance(
        lat, lng,
        geofence.center.lat, geofence.center.lng
      );
      
      // Convert geofence radius from feet to meters (1 foot = 0.3048 meters)
      const radiusInMeters = geofence.radius * 0.3048;
      
      return distance <= radiusInMeters;
    });

    console.log(`API: Location (${lat}, ${lng}) is inside ${insideGeofences.length} geofences`);

    return NextResponse.json({
      success: true,
      location: { lat, lng },
      totalGeofences: geofences.length,
      insideGeofences: insideGeofences.length,
      geofences: insideGeofences
    });

  } catch (error) {
    console.error('API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Utility function to calculate distance between two points (in meters)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
} 