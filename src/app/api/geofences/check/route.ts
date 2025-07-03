import { NextRequest, NextResponse } from 'next/server';
import { supabase, databaseToArea } from '../../../../lib/supabase';

interface Location {
  lat: number;
  lng: number;
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

export async function POST(request: NextRequest) {
  try {
    const body: { location: Location } = await request.json();
    const { location } = body;

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid location data' },
        { status: 400 }
      );
    }

    // Fetch all active areas from database
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching areas:', error);
      return NextResponse.json(
        { error: 'Failed to fetch areas' },
        { status: 500 }
      );
    }

    const areas: Area[] = data ? data.map(databaseToArea) : [];
    const results: { areaId: string; isInside: boolean; distance: number }[] = [];

    // Check each area
    for (const area of areas) {
      const distance = calculateDistance(
        location.lat, location.lng,
        area.center.lat, area.center.lng
      );
      
      const radiusInMeters = area.radius * 0.3048; // Convert feet to meters
      const isInside = distance <= radiusInMeters;
      
      results.push({
        areaId: area.id,
        isInside,
        distance
      });
    }

    return NextResponse.json({
      location,
      results,
      totalAreas: areas.length,
      areasChecked: results.length
    });

  } catch (error) {
    console.error('Error checking geofences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 