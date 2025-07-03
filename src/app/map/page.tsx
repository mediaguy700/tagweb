'use client';
import GoogleMap from '@/components/GoogleMap';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function MapPage() {
  const router = useRouter();

  const handleHelp = () => {
    // You can implement help functionality here
    alert('Help feature coming soon!');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        router.push('/signin');
      } else {
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <div>
      {/* Simple header with navigation */}
      <header className="bg-white shadow-sm border-b absolute top-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16 relative">
            <div className="flex items-center">
              <Image 
                src="/nobox.png" 
                alt="NextAG Logo" 
                width={300} 
                height={120} 
                className="h-32 w-auto"
              />
            </div>
            <div className="absolute right-4 flex items-center space-x-4">
              <button
                onClick={handleHelp}
                className="flex items-center space-x-2 text-black hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="text-lg">💡</span>
                <span>Need Help?</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-black hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="text-lg">👋</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Map component */}
      <GoogleMap />
    </div>
  );
} 