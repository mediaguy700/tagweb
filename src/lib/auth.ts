// Authentication utility functions

export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

// Check if user is authenticated
export async function checkAuth(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Authentication failed'
      };
    }

    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// Login user
export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Login failed'
      };
    }

    return {
      success: true,
      user: data.user,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// Register user
export async function registerUser(
  username: string, 
  password: string, 
  email?: string, 
  first_name?: string, 
  last_name?: string
): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        username, 
        password, 
        email, 
        first_name, 
        last_name 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Registration failed'
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// Logout user
export async function logoutUser(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // Include cookies
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Logout failed'
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// Client-side logout with redirect
export async function logoutAndRedirect(redirectTo: string = '/signin'): Promise<void> {
  try {
    await logoutUser();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always redirect, even if logout fails
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }
}

// Refresh session token
export async function refreshSession(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include cookies
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Session refresh failed'
      };
    }

    return {
      success: true,
      message: 'Session refreshed'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
} 