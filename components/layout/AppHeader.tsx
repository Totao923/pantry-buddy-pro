import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from '../auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { isAuthEnabled } from '../../lib/config/environment';

interface AppHeaderProps {
  appState: any;
  pantryInventory: any;
  showDashboard: boolean;
  showInventory: boolean;
  setShowDashboard: (show: boolean) => void;
  setShowInventory: (show: boolean) => void;
  aiStatus: string;
  onShowAuth?: () => void;
}

export default function AppHeader({
  appState,
  pantryInventory,
  showDashboard,
  showInventory,
  setShowDashboard,
  setShowInventory,
  aiStatus,
  onShowAuth,
}: AppHeaderProps) {
  const authEnabled = isAuthEnabled();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-pantry-50/90 backdrop-blur-md shadow-lg border-b border-pantry-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center min-h-[64px]">
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-pantry-700 to-pantry-800 rounded-2xl flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Pantry Buddy Logo"
                width={96}
                height={96}
                className="w-12 h-12 sm:w-20 sm:h-20 object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-pantry-700 to-pantry-600 bg-clip-text text-transparent truncate">
                Pantry Buddy Pro
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">
                AI-Powered Culinary Assistant
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0 overflow-hidden">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{appState.ingredients.length} ingredients</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2 h-2 bg-pantry-500 rounded-full"></span>
                <span>{appState.generatedRecipes.length} recipes</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiStatus === 'enabled'
                      ? 'bg-green-500'
                      : aiStatus === 'disabled'
                        ? 'bg-yellow-500'
                        : aiStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-400 animate-pulse'
                  }`}
                ></span>
                <span>AI {aiStatus === 'loading' ? 'initializing' : aiStatus}</span>
              </div>
            </div>

            {authEnabled && user ? (
              <Link href="/dashboard">
                <button className="px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm min-h-[44px]">
                  <span className="text-lg">🏠</span>
                  <span>Dashboard</span>
                </button>
              </Link>
            ) : (
              <Link href="/ingredients">
                <button className="px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm min-h-[44px]">
                  <span className="text-lg">🥗</span>
                  <span>Ingredients</span>
                </button>
              </Link>
            )}

            <button
              onClick={() => setShowInventory(!showInventory)}
              className="px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm min-h-[44px]"
            >
              <span className="text-lg">🏺</span>
              <span>Inventory</span>
              {pantryInventory.totalItems > 0 && (
                <span className="bg-pantry-500 text-white text-xs rounded-full px-2 py-0.5 min-w-5 text-center">
                  {pantryInventory.totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 min-h-[44px] ${
                appState.user.subscription === 'free'
                  ? 'bg-gradient-to-r from-pantry-500 to-pantry-600 text-white hover:from-pantry-600 hover:to-pantry-700'
                  : 'bg-gradient-to-r from-pantry-400 to-pantry-500 text-white'
              }`}
            >
              <span className="text-lg">{appState.user.subscription === 'free' ? '⭐' : '👑'}</span>
              <span>{appState.user.subscription === 'free' ? 'Upgrade' : 'Premium'}</span>
            </button>

            {authEnabled && user ? (
              <UserMenu />
            ) : authEnabled && !user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onShowAuth}
                  className="px-4 py-2 text-pantry-600 hover:text-pantry-700 font-medium transition-colors min-h-[44px] flex items-center"
                >
                  Sign In
                </button>
                <button
                  onClick={onShowAuth}
                  className="px-4 py-2 bg-pantry-600 text-white rounded-xl hover:bg-pantry-700 transition-colors font-medium min-h-[44px] flex items-center"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center min-h-[44px]">
                <span className="text-lg">👤</span>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open mobile menu"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
            {/* Stats Section */}
            <div className="flex items-center justify-between text-sm text-gray-600 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{appState.ingredients.length} ingredients</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-pantry-500 rounded-full"></span>
                <span>{appState.generatedRecipes.length} recipes</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiStatus === 'enabled'
                      ? 'bg-green-500'
                      : aiStatus === 'disabled'
                        ? 'bg-yellow-500'
                        : aiStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-400 animate-pulse'
                  }`}
                ></span>
                <span>AI {aiStatus === 'loading' ? 'initializing' : aiStatus}</span>
              </div>
            </div>

            {/* Navigation Buttons */}
            {authEnabled && user ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full px-4 py-3 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-3 shadow-sm text-left">
                  <span className="text-lg">🏠</span>
                  <span className="font-medium">Dashboard</span>
                </button>
              </Link>
            ) : (
              <Link href="/ingredients" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full px-4 py-3 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-3 shadow-sm text-left">
                  <span className="text-lg">🥗</span>
                  <span className="font-medium">Ingredients</span>
                </button>
              </Link>
            )}

            <button
              onClick={() => {
                setShowInventory(!showInventory);
                setMobileMenuOpen(false);
              }}
              className="w-full px-4 py-3 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-3 shadow-sm text-left"
            >
              <span className="text-lg">🏺</span>
              <span className="font-medium">Inventory</span>
              {pantryInventory.totalItems > 0 && (
                <span className="bg-pantry-500 text-white text-xs rounded-full px-2 py-0.5 min-w-5 text-center ml-auto">
                  {pantryInventory.totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowDashboard(!showDashboard);
                setMobileMenuOpen(false);
              }}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 text-left ${
                appState.user.subscription === 'free'
                  ? 'bg-gradient-to-r from-pantry-500 to-pantry-600 text-white hover:from-pantry-600 hover:to-pantry-700'
                  : 'bg-gradient-to-r from-pantry-400 to-pantry-500 text-white'
              }`}
            >
              <span className="text-lg">{appState.user.subscription === 'free' ? '⭐' : '👑'}</span>
              <span className="font-medium">
                {appState.user.subscription === 'free' ? 'Upgrade to Premium' : 'Premium Account'}
              </span>
            </button>

            {/* Auth Buttons */}
            {authEnabled && !user && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    onShowAuth?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-pantry-600 border border-pantry-200 rounded-xl hover:bg-pantry-50 transition-colors font-medium text-left"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onShowAuth?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-pantry-600 text-white rounded-xl hover:bg-pantry-700 transition-colors font-medium text-left"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
