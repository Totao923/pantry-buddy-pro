import React, { useState, useEffect, useRef, useCallback } from 'react';

// Global flag to prevent multiple simultaneous analysis requests
let globalAnalysisInProgress = false;
let globalAnalysisCount = 0;
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { Ingredient, NutritionInfo, Recipe } from '../types';
import { useAuth } from '../lib/auth/AuthProvider';

interface NutritionAnalysis {
  overallScore: number;
  macronutrientBalance: {
    protein: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
    carbs: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
    fats: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  };
  micronutrientGaps: string[];
  recommendations: NutritionRecommendation[];
}

interface NutritionRecommendation {
  type: 'ingredient' | 'recipe' | 'substitution' | 'supplement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface HealthGoal {
  id: string;
  name: string;
  description: string;
  targetCalories?: number;
  proteinMultiplier?: number;
  restrictions?: string[];
}

const HEALTH_GOALS: HealthGoal[] = [
  {
    id: 'weight-loss',
    name: 'Weight Loss',
    description: 'Reduce calories while maintaining nutrition',
    targetCalories: 1800,
    proteinMultiplier: 1.2,
  },
  {
    id: 'muscle-gain',
    name: 'Muscle Gain',
    description: 'Increase protein and calories for muscle building',
    targetCalories: 2400,
    proteinMultiplier: 1.8,
  },
  {
    id: 'maintenance',
    name: 'Health Maintenance',
    description: 'Balanced nutrition for overall wellness',
    targetCalories: 2000,
    proteinMultiplier: 1.0,
  },
  {
    id: 'heart-health',
    name: 'Heart Health',
    description: 'Low sodium, healthy fats focus',
    restrictions: ['low-sodium', 'omega-3-rich'],
  },
];

interface AInutritionistProps {
  ingredients: Ingredient[];
  recentRecipes?: Recipe[];
  className?: string;
}

export const AInutritionist: React.FC<AInutritionistProps> = ({
  ingredients,
  recentRecipes = [],
  className = '',
}) => {
  const { user, profile, subscription, session } = useAuth();
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<HealthGoal>(HEALTH_GOALS[2]); // Default to maintenance
  const [loading, setLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnalysisParamsRef = useRef<string>('');
  const isAnalysisInProgressRef = useRef<boolean>(false);
  const componentMountedRef = useRef<boolean>(true);

  const analyzeNutrition = useCallback(async () => {
    if (!componentMountedRef.current) {
      console.log('🔒 AI Nutritionist: Component unmounted, skipping analysis');
      return;
    }

    if (!session?.access_token) {
      console.log('🔒 AI Nutritionist: No session token available, skipping analysis');
      return;
    }

    // Global check to prevent any analysis when one is running
    if (globalAnalysisInProgress) {
      console.log('🔒 AI Nutritionist: Global analysis in progress, skipping');
      return;
    }

    const analysisKey = `${ingredients.length}-${selectedGoal.id}-${session?.access_token ? 'auth' : 'no-auth'}`;
    const cacheKey = `nutrition-analysis-${analysisKey}`;

    // Check cache first
    const cachedAnalysis = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}-timestamp`);
    const now = Date.now();
    const cacheAge = cacheTimestamp ? now - parseInt(cacheTimestamp) : Infinity;

    // Use cache if less than 10 minutes old (increased from 5)
    if (cachedAnalysis && cacheAge < 10 * 60 * 1000) {
      console.log(
        '📦 AI Nutritionist: Using cached analysis, age:',
        Math.round(cacheAge / 1000),
        's'
      );
      try {
        setAnalysis(JSON.parse(cachedAnalysis));
        return;
      } catch (error) {
        console.log('❌ Failed to parse cached analysis, will fetch new');
      }
    }

    // Set global flag to prevent other instances
    globalAnalysisInProgress = true;
    globalAnalysisCount++;
    setLoading(true);

    console.log(
      '🚀 AI Nutritionist: Starting analysis',
      globalAnalysisCount,
      'for key:',
      analysisKey
    );

    try {
      const requestData = {
        ingredients,
        recentRecipes,
        healthGoal: selectedGoal,
        userProfile: { ...profile, subscription },
      };

      console.log('🤖 AI Nutritionist: Sending data to API:', {
        ingredientsCount: ingredients.length,
        recentRecipesCount: recentRecipes.length,
        healthGoal: selectedGoal.name,
        subscription: subscription?.tier,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        user: user ? { id: user.id, email: user.email } : null,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication header if session is available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Nutritionist: Received analysis result:', result);

        // Cache the result
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
          localStorage.setItem(`${cacheKey}-timestamp`, now.toString());
          console.log('📦 AI Nutritionist: Cached analysis result');
        } catch (error) {
          console.log('⚠️ Failed to cache analysis result:', error);
        }

        if (componentMountedRef.current) {
          setAnalysis(result);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ AI Nutritionist: API error:', errorData);
      }
    } catch (error) {
      console.error('❌ AI Nutritionist: Request error:', error);
    } finally {
      globalAnalysisInProgress = false;
      if (componentMountedRef.current) {
        setLoading(false);
      }
      console.log('✅ AI Nutritionist: Analysis completed, global flag cleared');
    }
  }, [ingredients.length, selectedGoal.id, session?.access_token]);

  // Single useEffect with much longer debounce and strict deduplication
  useEffect(() => {
    // Clear any existing timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Create a unique key for this analysis request
    const analysisKey = `${ingredients.length}-${selectedGoal.id}-${session?.access_token ? 'auth' : 'no-auth'}`;

    // Skip if same parameters as last analysis
    if (analysisKey === lastAnalysisParamsRef.current) {
      console.log(
        '🔄 AI Nutritionist: Skipping duplicate analysis with same parameters:',
        analysisKey
      );
      return;
    }

    // Check minimum requirements
    if (ingredients.length === 0 || !session?.access_token) {
      console.log(
        '🔄 AI Nutritionist: Missing requirements - ingredients:',
        ingredients.length,
        'auth:',
        !!session?.access_token
      );
      return;
    }

    // Much longer debounce to prevent rapid calls
    analysisTimeoutRef.current = setTimeout(() => {
      if (componentMountedRef.current && analysisKey !== lastAnalysisParamsRef.current) {
        console.log('🔄 AI Nutritionist: Triggering debounced analysis:', analysisKey);
        lastAnalysisParamsRef.current = analysisKey;
        analyzeNutrition();
      }
    }, 3000); // 3 second debounce

    // Cleanup timeout on dependency change or unmount
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [ingredients.length, selectedGoal.id, session?.access_token]);

  // Cleanup on unmount
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  const generateWeeklyReport = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication header if session is available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/nutrition/weekly-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user?.id,
          healthGoal: selectedGoal,
        }),
      });

      if (response.ok) {
        const report = await response.json();
        setWeeklyReport(report);
      }
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  };

  const getNutritionScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMacroStatusColor = (status: string) => {
    if (status === 'good') return 'text-green-600';
    if (status === 'low' || status === 'high') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'border-l-red-500';
    if (priority === 'medium') return 'border-l-yellow-500';
    return 'border-l-green-500';
  };

  console.log('🔍 AI Nutritionist: Auth status check:', {
    hasUser: !!user,
    hasSubscription: !!subscription,
    subscriptionTier: subscription?.tier,
    ingredientsCount: ingredients.length,
  });

  // Temporary: Allow testing of nutrition features in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasPremiumAccess = subscription?.tier === 'premium' || isDevelopment;

  if (!user || !subscription || (!hasPremiumAccess && subscription.tier === 'free')) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-4">🤖 AI Nutritionist</h3>
          <p className="text-gray-600 mb-4">
            Get personalized nutrition analysis and health recommendations
          </p>

          {/* Show basic pantry stats even for free users */}
          {ingredients.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Your Pantry Overview</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>📦 {ingredients.length} ingredients in your pantry</div>
                <div>🥩 {ingredients.filter(ing => ing.isProtein).length} protein sources</div>
                <div>🥬 {ingredients.filter(ing => ing.isVegetarian).length} vegetarian items</div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-700">
              Premium feature: Upgrade to access AI-powered nutrition insights, meal planning, and
              personalized recommendations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => (window.location.href = '/dashboard/subscription')}
          >
            Upgrade to Premium
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">🤖 AI Nutritionist</h2>
          <Button onClick={generateWeeklyReport} variant="secondary" className="text-sm">
            📊 Weekly Report
          </Button>
        </div>

        {/* Health Goal Selector */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Health Goal</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HEALTH_GOALS.map(goal => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedGoal.id === goal.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="font-medium text-sm">{goal.name}</div>
                <div className="text-xs text-gray-600 mt-1">{goal.description}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton height="h-24" />
          <LoadingSkeleton height="h-24" />
          <LoadingSkeleton height="h-24" />
        </div>
      ) : analysis ? (
        <>
          {/* Overall Nutrition Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overall Nutrition Score</h3>
                <p className="text-sm text-gray-600">Based on your pantry and recent meals</p>
              </div>
              <div
                className={`text-4xl font-bold ${getNutritionScoreColor(analysis.overallScore)}`}
              >
                {analysis.overallScore}/100
              </div>
            </div>
          </Card>

          {/* Macronutrient Balance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Macronutrient Balance</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(analysis.macronutrientBalance).map(([macro, data]) => (
                <div key={macro} className="text-center">
                  <div className={`text-2xl font-bold ${getMacroStatusColor(data.status)}`}>
                    {data.current}g
                  </div>
                  <div className="text-sm text-gray-600 capitalize">{macro}</div>
                  <div className="text-xs text-gray-500">Target: {data.recommended}g</div>
                  <div className={`text-xs font-medium ${getMacroStatusColor(data.status)}`}>
                    {data.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Micronutrient Gaps */}
          {analysis.micronutrientGaps.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Potential Nutrient Gaps</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.micronutrientGaps.map((nutrient, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                  >
                    {nutrient}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
            <div className="space-y-4">
              {analysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 border-l-4 bg-gray-50 rounded-r-lg ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      {rec.action && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            // Handle recommendation action
                            console.log('Executing recommendation action:', rec.action);
                          }}
                        >
                          {rec.action}
                        </Button>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        rec.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : rec.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6">
          <div className="text-center text-gray-500">
            <p>Add ingredients to your pantry to get personalized nutrition analysis</p>
            <Button onClick={analyzeNutrition} variant="primary" className="mt-4">
              Analyze Nutrition
            </Button>
          </div>
        </Card>
      )}

      {/* Weekly Report Modal/Section */}
      {weeklyReport && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Weekly Nutrition Report</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{weeklyReport.avgCalories}</div>
                <div className="text-sm text-gray-600">Avg Daily Calories</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{weeklyReport.mealsLogged}</div>
                <div className="text-sm text-gray-600">Meals Logged</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">{weeklyReport.insights}</div>
          </div>
        </Card>
      )}
    </div>
  );
};
