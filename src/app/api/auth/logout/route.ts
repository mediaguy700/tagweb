import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookies
    const session_token = request.cookies.get('session_token')?.value;

    if (!session_token) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Call the database function to logout user
    const { data, error } = await supabase.rpc('logout_user', {
      p_session_token: session_token
    });

    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Logout failed', details: error.message },
        { status: 500 }
      );
    }

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear session cookies
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 