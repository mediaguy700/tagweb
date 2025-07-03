import { NextRequest, NextResponse } from 'next/server';
import { supabase, databaseToArea } from '../../../../lib/supabase';

// GET /api/geofences/[id] - Retrieve a specific geofence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('API: Fetching geofence with ID:', id);
    
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Geofence not found' },
          { status: 404 }
        );
      }
      console.error('API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch geofence', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Successfully fetched geofence:', data);
    
    return NextResponse.json({
      success: true,
      geofence: databaseToArea(data)
    });

  } catch (error) {
    console.error('API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/geofences/[id] - Update a specific geofence
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('API: Updating geofence with ID:', id, body);

    // Validate required fields
    const { name, center, radius, color, isActive } = body;
    
    if (!name || !center || !center.lat || !center.lng || !radius) {
      return NextResponse.json(
        { error: 'Missing required fields: name, center (lat/lng), radius' },
        { status: 400 }
      );
    }

    // Prepare the update data
    const updateData = {
      name,
      center_lat: center.lat,
      center_lng: center.lng,
      radius: Number(radius),
      color: color || '#FF4444',
      is_active: isActive !== undefined ? isActive : true,
      updated_at: new Date().toISOString()
    };

    // Update in database
    const { data, error } = await supabase
      .from('areas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Geofence not found' },
          { status: 404 }
        );
      }
      console.error('API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update geofence', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Successfully updated geofence:', data);
    
    return NextResponse.json({
      success: true,
      geofence: databaseToArea(data)
    });

  } catch (error) {
    console.error('API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/geofences/[id] - Delete a specific geofence
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('API: Deleting geofence with ID:', id);
    
    const { error } = await supabase
      .from('areas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete geofence', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Successfully deleted geofence with ID:', id);
    
    return NextResponse.json({
      success: true,
      message: 'Geofence deleted successfully'
    });

  } catch (error) {
    console.error('API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 