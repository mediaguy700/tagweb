import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1';
    const user_agent = request.headers.get('user-agent') || '';

    // Call the database function to authenticate user
    const { data, error } = await supabase.rpc('authenticate_user', {
      p_username: username,
      p_password: password,
      p_ip_address: ip_address,
      p_user_agent: user_agent
    });

    if (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', details: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 401 }
      );
    }

    // Set HTTP-only cookies for session management
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: data.user,
      expires_at: data.expires_at
    });

    // Set session token as HTTP-only cookie
    response.cookies.set('session_token', data.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    // Set refresh token as HTTP-only cookie
    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 