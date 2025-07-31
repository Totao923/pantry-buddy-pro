import React from 'react';
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
}

export default function AppHeader({
  appState,
  pantryInventory,
  showDashboard,
  showInventory,
  setShowDashboard,
  setShowInventory,
  aiStatus,
}: AppHeaderProps) {
  const authEnabled = isAuthEnabled();

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🧑‍🍳</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pantry Buddy Pro
              </h1>
              <p className="text-sm text-gray-600">AI-Powered Culinary Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{appState.ingredients.length} ingredients</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
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

            <button
              onClick={() => setShowInventory(!showInventory)}
              className="px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="text-lg">🏺</span>
              <span className="hidden md:inline">Inventory</span>
              {pantryInventory.totalItems > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-5 text-center">
                  {pantryInventory.totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                appState.user.subscription === 'free'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
              }`}
            >
              <span className="text-lg">{appState.user.subscription === 'free' ? '⭐' : '👑'}</span>
              {appState.user.subscription === 'free' ? 'Upgrade' : 'Premium'}
            </button>

            {authEnabled ? (
              <UserMenu />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
