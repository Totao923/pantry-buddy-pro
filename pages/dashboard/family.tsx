import React from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import FeatureGate from '../../components/FeatureGate';
import FamilyDashboard from '../../components/family/FamilyDashboard';

export default function FamilyPage() {
  return (
    <AuthGuard requireAuth>
      <Head>
        <title>Family - Pantry Buddy Pro</title>
        <meta name="description" content="Manage your family members and shared features" />
      </Head>

      <DashboardLayout>
        <FeatureGate feature="family_management">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Family Management</h1>
              <p className="text-gray-600">
                Manage your family members, share recipes, and track nutrition together.
              </p>
            </div>

            <FamilyDashboard />
          </div>
        </FeatureGate>
      </DashboardLayout>
    </AuthGuard>
  );
}
