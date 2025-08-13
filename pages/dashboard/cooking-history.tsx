import React from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import CookingHistory from '../../components/cooking/CookingHistory';
import CookingStats from '../../components/cooking/CookingStats';

export default function CookingHistoryPage() {
  return (
    <AuthGuard>
      <Head>
        <title>Cooking History - Pantry Buddy Pro</title>
        <meta name="description" content="Your complete cooking history and statistics" />
      </Head>

      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cooking History</h1>
            <p className="text-gray-600 mt-1">
              Track your culinary journey and cooking achievements
            </p>
          </div>

          {/* Cooking Statistics */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Cooking Stats</h2>
            <CookingStats />
          </div>

          {/* Complete Cooking History */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <CookingHistory limit={50} />
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}