import React, { useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import FeatureGate from '../../components/FeatureGate';
import FamilyNutritionDashboard from '../../components/family/FamilyNutritionDashboard';
import FamilyMemberNutrition from '../../components/family/FamilyMemberNutrition';

interface FamilyMemberNutritionData {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isChild: boolean;
  mealPlans: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    calories: number;
    nutrition?: {
      totals?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
  }>;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export default function FamilyNutritionPage() {
  const [selectedMember, setSelectedMember] = useState<FamilyMemberNutritionData | null>(null);

  const handleViewMember = (member: FamilyMemberNutritionData) => {
    setSelectedMember(member);
  };

  const handleBackToDashboard = () => {
    setSelectedMember(null);
  };

  return (
    <AuthGuard requireAuth>
      <Head>
        <title>Family Nutrition - Pantry Buddy Pro</title>
        <meta name="description" content="Track nutrition and health metrics across your family" />
      </Head>

      <DashboardLayout>
        <FeatureGate feature="family_nutrition">
          <div className="space-y-6">
            {!selectedMember ? (
              <>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Family Nutrition Tracking
                  </h1>
                  <p className="text-gray-600">
                    Monitor nutrition and health metrics across all family members from meal plans
                    and recipes.
                  </p>
                </div>

                <FamilyNutritionDashboard onViewMember={handleViewMember} />
              </>
            ) : (
              <FamilyMemberNutrition member={selectedMember} onBack={handleBackToDashboard} />
            )}

            {/* Help Section */}
            {!selectedMember && (
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">
                  💡 How Family Nutrition Tracking Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <h4 className="font-medium mb-2">📊 Automatic Tracking</h4>
                    <p>
                      Nutrition data is automatically calculated from meal plans created by family
                      members. Each meal plan contributes to the family's overall nutrition picture.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">👶 Child-Specific Goals</h4>
                    <p>
                      The system automatically adjusts calorie targets and recommendations based on
                      whether a family member is marked as a child, providing age-appropriate
                      guidance.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">📅 Time-Based Analysis</h4>
                    <p>
                      View nutrition trends over different time periods. Use date filters to focus
                      on specific weeks, months, or analyze long-term patterns.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">⚖️ Macro Balance</h4>
                    <p>
                      Track protein, carbohydrates, and fat distribution to ensure balanced
                      nutrition across all family members and identify areas for improvement.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </FeatureGate>
      </DashboardLayout>
    </AuthGuard>
  );
}
