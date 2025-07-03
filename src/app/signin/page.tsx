'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { loginUser, checkAuth, type User } from '@/lib/auth';
import Link from 'next/link';

export default function SignIn() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const authStatus = await checkAuth();
        if (authStatus.success) {
                  // User is already logged in, redirect to map
        router.push('/map');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUser(username, password);
      if (result.success && result.user) {
        // Show user info including is_active state
        setUserInfo(result.user);
        setLoginSuccess(true);
        
        // Redirect after 3 seconds to show the user their status
        setTimeout(() => {
          router.push('/map');
        }, 3000);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg py-12 px-8 w-full max-w-md flex flex-col items-center">
          <Image src="/translogo.png" alt="Logo" width={160} height={160} className="mb-4" />
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login success with user info
  if (loginSuccess && userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg py-12 px-8 w-full max-w-md flex flex-col items-center">
          <Image src="/translogo.png" alt="Logo" width={160} height={160} className="mb-4" />
          <div className="text-center w-full">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Login Successful!</h2>
            <p className="text-gray-600 mb-4">
              Welcome back, <span className="font-medium">{userInfo.username}</span>!
            </p>
            
            {/* User Status Information */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Account Status:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Username:</span>
                  <span className="font-medium">{userInfo.username}</span>
                </div>
                {userInfo.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Email:</span>
                    <span className="font-medium">{userInfo.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Account Active:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    userInfo.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userInfo.is_active ? '✅ Active' : '❌ Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Verified:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    userInfo.is_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {userInfo.is_verified ? '✅ Verified' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Message */}
            {!userInfo.is_active ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-red-600 text-sm font-medium">⚠️ Account Inactive</p>
                <p className="text-red-500 text-xs mt-1">
                  Your account is currently inactive. Contact support to activate it.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                <p className="text-green-600 text-sm font-medium">🎉 Access Granted</p>
                <p className="text-green-500 text-xs mt-1">
                  Redirecting to the map in 3 seconds...
                </p>
              </div>
            )}

            <div className="animate-pulse">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Redirecting...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg py-12 px-8 w-full max-w-md flex flex-col items-center">
        <Image src="/translogo.png" alt="Logo" width={160} height={160} className="mb-4" />
        <form className="w-full flex flex-col gap-6" onSubmit={handleSignIn}>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="username">Username</label>
            <input 
              id="username" 
              type="text" 
              placeholder="Enter your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
            <input 
              id="password" 
              type="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
              required
              disabled={loading}
            />
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-black" disabled={loading} />
              Remember me
            </label>
            <a href="#" className="text-black/70 hover:underline">Forgot password?</a>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-black font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
          <button 
            type="submit" 
            className={`w-full py-2 rounded-md font-semibold transition ${
              loading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-black text-white hover:bg-black/90'
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
} 