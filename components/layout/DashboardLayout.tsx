import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useIngredients } from '../../contexts/IngredientsProvider';
import QuickRecipeSuggestions from '../QuickRecipeSuggestions';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { user, signOut, subscription } = useAuth();
  const { ingredients } = useIngredients(); // Use shared ingredients context
  const router = useRouter();

  // Use ingredients from context instead of separate API call
  const pantryItemCount = ingredients.length;

  const navigationItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: '🏠',
      description: 'Dashboard overview',
    },
    {
      name: 'My Recipes',
      href: '/dashboard/recipes',
      icon: '📚',
      description: 'Browse and manage recipes',
      subItems: [
        { name: 'Browse All', href: '/dashboard/recipes' },
        { name: 'Create New', href: '/dashboard/create-recipe' },
        { name: 'Favorites', href: '/dashboard/recipes?filter=favorites' },
        { name: 'Recent', href: '/dashboard/recipes?filter=recent' },
      ],
    },
    {
      name: 'Recipe Books',
      href: '/dashboard/recipe-books',
      icon: '📖',
      description: 'Create & export recipe collections',
      isPremium: true,
    },
    {
      name: 'Pantry',
      href: '/dashboard/pantry',
      icon: '🥗',
      description: 'Manage your pantry',
    },
    {
      name: 'Nutrition',
      href: '/dashboard/nutrition',
      icon: '🤖',
      description: 'AI Nutrition Analysis',
      isPremium: true,
    },
    {
      name: 'Meal Plans',
      href: '/dashboard/meal-plans',
      icon: '📅',
      description: 'Plan your meals',
    },
    {
      name: 'Shopping Lists',
      href: '/dashboard/shopping-lists',
      icon: '🛒',
      description: 'Manage shopping lists',
    },
    {
      name: 'Receipt Scanner',
      href: '/dashboard/receipts',
      icon: '📄',
      description: 'Scan receipts & track spending',
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: '📊',
      description: 'Cooking insights',
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: '⚙️',
      description: 'Account settings',
    },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleWhatShouldICook = () => {
    // Check if user has premium subscription
    const isPremium =
      subscription?.tier === 'premium' ||
      subscription?.tier === 'family' ||
      subscription?.tier === 'chef';

    if (!isPremium) {
      // Redirect to subscription page with a message about this feature
      router.push('/dashboard/subscription?feature=quick-suggestions');
      return;
    }

    // Check pantry requirements
    if (pantryItemCount < 3) {
      alert(
        'You need at least 3 ingredients in your pantry to get recipe suggestions. Add more ingredients first!'
      );
      return;
    }

    // Show suggestions modal
    setShowSuggestions(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-gradient-to-br from-pantry-700 to-pantry-800 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Pantry Buddy Logo" className="w-16 h-16 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pantry-700 to-pantry-600 bg-clip-text text-transparent">
                  Pantry Buddy
                </h1>
                <p className="text-base text-gray-500">Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pantry-600 to-pantry-700 rounded-full flex items-center justify-center text-white font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.user_metadata?.name || 'Chef User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 border-b border-gray-200">
            <div className="space-y-3">
              <Link href="/dashboard/create-recipe">
                <button className="w-full px-4 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium text-sm flex items-center justify-center gap-2 min-h-[44px]">
                  <span className="text-lg">✨</span>
                  Generate Recipe
                </button>
              </Link>
              <Link href="/dashboard/pantry">
                <button className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 min-h-[44px]">
                  <span>🥗</span>
                  Add Ingredients
                </button>
              </Link>
              <button
                onClick={handleWhatShouldICook}
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 min-h-[44px] transition-colors ${
                  pantryItemCount < 3
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                <span>🤔</span>
                What Should I Cook?
                {(subscription?.tier === 'free' || !subscription) && (
                  <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full ml-1">
                    PRO
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            {navigationItems.map(item => (
              <div key={item.name}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      isActiveRoute(item.href)
                        ? 'bg-pantry-50 text-pantry-700 border border-pantry-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs opacity-75">{item.description}</p>
                    </div>
                  </div>
                </Link>

                {/* Sub-navigation for My Recipes */}
                {item.subItems && isActiveRoute(item.href) && (
                  <div className="ml-10 mt-2 space-y-1">
                    {item.subItems.map(subItem => (
                      <Link key={subItem.name} href={subItem.href}>
                        <div
                          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                            router.asPath === subItem.href
                              ? 'bg-pantry-100 text-pantry-800'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-3">
            {/* Upgrade Button for Free Users */}
            {(subscription?.tier === 'free' || !subscription) && (
              <Link href="/dashboard/subscription">
                <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium text-sm flex items-center justify-center gap-2 min-h-[44px] shadow-lg">
                  <span>⭐</span>
                  Upgrade to Premium
                </button>
              </Link>
            )}

            {/* Current Plan Display for Premium Users */}
            {subscription && subscription.tier !== 'free' && (
              <Link href="/dashboard/subscription">
                <div className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-800 rounded-lg transition-all font-medium text-sm flex items-center justify-center gap-2 min-h-[44px]">
                  <span>👑</span>
                  {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
                </div>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>🚪</span>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen p-6 bg-gray-50">{children}</main>
      </div>

      {/* Quick Suggestions Modal */}
      {showSuggestions && (
        <QuickRecipeSuggestions
          showAsModal={true}
          onClose={() => setShowSuggestions(false)}
          onRecipeSelected={() => {
            setShowSuggestions(false);
          }}
        />
      )}
    </div>
  );
}
