import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import AuthModal from './AuthModal';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ 
  children, 
  fallback,
  requireAuth = false 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(!user && requireAuth);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !user) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🧑‍🍳</span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                Welcome to Pantry Buddy Pro
              </h1>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                Sign in to access your personalized pantry, AI-generated recipes, 
                and cooking preferences across all your devices.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
                >
                  Sign In to Continue
                </button>
                
                <div className="text-sm text-gray-500">
                  New to Pantry Buddy?{' '}
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create a free account
                  </button>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">🎉 Free Account Benefits:</h3>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Store up to 50 pantry items
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Generate 5 AI recipes daily
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Cross-device synchronization
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    Recipe ratings and reviews
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      </>
    );
  }

  // User is authenticated or authentication is not required
  return <>{children}</>;
}

// Component for showing user info in header
export function UserMenu() {
  const { user, profile, signOut, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium text-sm"
        >
          Sign In
        </button>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      </>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-800">
            {profile?.name || 'User'}
          </div>
          <div className="text-xs text-gray-500">
            {user.email}
          </div>
        </div>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-800">
              {profile?.name || 'User'}
            </div>
            <div className="text-xs text-gray-500">
              {user.email}
            </div>
            <div className="text-xs text-blue-600 font-medium mt-1">
              {profile?.subscription_tier?.toUpperCase() || 'FREE'} Plan
            </div>
          </div>
          
          <div className="py-1">
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Profile Settings
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Subscription
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Help & Support
            </button>
          </div>
          
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}