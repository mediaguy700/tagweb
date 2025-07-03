import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookies
    const session_token = request.cookies.get('session_token')?.value;

    if (!session_token) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Call the database function to validate session
    const { data, error } = await supabase.rpc('validate_session', {
      p_session_token: session_token
    });

    if (error) {
      console.error('Session validation error:', error);
      return NextResponse.json(
        { error: 'Session validation failed', details: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      // Clear invalid cookies
      const response = NextResponse.json(
        { error: data.error },
        { status: 401 }
      );

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
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 