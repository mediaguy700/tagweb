'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth, logoutAndRedirect, type User } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const authStatus = await checkAuth();
        if (authStatus.success && authStatus.user) {
          setUser(authStatus.user);
        } else {
          // Clear any invalid session and redirect to login
          await logoutAndRedirect('/signin');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        // Clear any invalid session and redirect to login
        await logoutAndRedirect('/signin');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [router]);

  const handleLogout = async () => {
    await logoutAndRedirect('/signin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div>
      {/* Header with user info and logout */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">NextAG</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user.username}</span>
                {!user.is_active && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Inactive Account
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        {React.isValidElement(children) 
          ? React.cloneElement(children, { user } as any)
          : children
        }
      </main>
    </div>
  );
} 