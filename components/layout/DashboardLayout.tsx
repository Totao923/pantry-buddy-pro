import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth/AuthProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

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
      name: 'Pantry',
      href: '/dashboard/pantry',
      icon: '🥗',
      description: 'Manage your pantry',
    },
    {
      name: 'Meal Plans',
      href: '/dashboard/meal-plans',
      icon: '📅',
      description: 'Plan your meals',
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
        className={`fixed inset-y-0 left-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🧑‍🍳</span>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Pantry Buddy
                </h1>
                <p className="text-xs text-gray-500">Dashboard</p>
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
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
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
                <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium text-sm flex items-center justify-center gap-2">
                  <span className="text-lg">✨</span>
                  Generate Recipe
                </button>
              </Link>
              <Link href="/dashboard/pantry">
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                  <span>🥗</span>
                  Add Ingredients
                </button>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            {navigationItems.map(item => (
              <div key={item.name}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                      isActiveRoute(item.href)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
                              ? 'bg-blue-100 text-blue-800'
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
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
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
        <main className="min-h-screen p-6">{children}</main>
      </div>
    </div>
  );
}
