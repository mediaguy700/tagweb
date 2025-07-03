import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, first_name, last_name } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Call the database function to register user
    const { data, error } = await supabase.rpc('register_user', {
      p_username: username,
      p_email: email || null,
      p_password: password,
      p_first_name: first_name || null,
      p_last_name: last_name || null
    });

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json(
        { error: 'Registration failed', details: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user_id: data.user_id
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 