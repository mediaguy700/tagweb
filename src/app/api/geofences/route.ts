import { NextRequest, NextResponse } from 'next/server';
import { supabase, databaseToArea } from '../../../lib/supabase';

// GET /api/geofences - Retrieve all geofences
export async function GET(request: NextRequest) {
  try {
    console.log('=== MOBILE GEOFENCE API CALL ===');
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('Query parameters:', { activeOnly, limit, offset });

    // Build the query
    let query = supabase
      .from('areas')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch geofences',
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Convert database format to API format
    const geofences = data?.map(databaseToArea) || [];

    console.log(`Fetched ${geofences.length} geofences`);

    // Return the response
    return NextResponse.json({
      success: true,
      data: {
        geofences,
        pagination: {
          total: count || geofences.length,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        },
        filters: {
          activeOnly
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/geofences - Create a new geofence
export async function POST(request: NextRequest) {
  try {
    console.log('=== MOBILE GEOFENCE CREATE ===');
    
    const body = await request.json();
    const { name, center, radius, color } = body;

    // Validate required fields
    if (!name || !center || !radius) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, center, radius' 
        },
        { status: 400 }
      );
    }

    // Validate center coordinates
    if (!center.lat || !center.lng) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid center coordinates' 
        },
        { status: 400 }
      );
    }

    // Create the geofence
    const { data, error } = await supabase
      .from('areas')
      .insert({
        id: crypto.randomUUID(),
        name,
        center_lat: center.lat,
        center_lng: center.lng,
        radius,
        color: color || '#FF4444',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create geofence',
          details: error.message 
        },
        { status: 500 }
      );
    }

    const geofence = databaseToArea(data);

    console.log('Created geofence:', geofence.name);

    return NextResponse.json({
      success: true,
      data: geofence,
      message: 'Geofence created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 