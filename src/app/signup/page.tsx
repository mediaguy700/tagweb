'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { registerUser, checkAuth } from '@/lib/auth';
import Link from 'next/link';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const authStatus = await checkAuth();
        if (authStatus.success) {
          // User is already logged in, redirect to main app
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser(
        formData.username,
        formData.password,
        formData.email,
        formData.first_name,
        formData.last_name
      );
      
      if (result.success) {
        // Registration successful, redirect to login
        router.push('/signin?message=Registration successful! Please log in.');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg py-12 px-8 w-full max-w-md flex flex-col items-center">
        <Image src="/translogo.png" alt="Logo" width={160} height={160} className="mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h1>
        
        <form className="w-full flex flex-col gap-4" onSubmit={handleSignUp}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="first_name">First Name</label>
              <input 
                id="first_name" 
                name="first_name"
                type="text" 
                placeholder="First name" 
                value={formData.first_name}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="last_name">Last Name</label>
              <input 
                id="last_name" 
                name="last_name"
                type="text" 
                placeholder="Last name" 
                value={formData.last_name}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="username">Username *</label>
            <input 
              id="username" 
              name="username"
              type="text" 
              placeholder="Choose a username" 
              value={formData.username}
              onChange={handleInputChange}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input 
              id="email" 
              name="email"
              type="email" 
              placeholder="your@email.com" 
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password *</label>
            <input 
              id="password" 
              name="password"
              type="password" 
              placeholder="Create a password" 
              value={formData.password}
              onChange={handleInputChange}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70" 
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">Confirm Password *</label>
            <input 
              id="confirmPassword" 
              name="confirmPassword"
              type="password" 
              placeholder="Confirm your password" 
              value={formData.confirmPassword}
              onChange={handleInputChange}
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
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/signin" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 