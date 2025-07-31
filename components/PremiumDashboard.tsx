import React, { useState } from 'react';
import { SubscriptionTier, MealPlan, Achievement, CookingSession } from '../types';
import MigrationStatus from './migration/MigrationStatus';
import { isAuthEnabled } from '../lib/config/environment';

interface PremiumDashboardProps {
  userSubscription: SubscriptionTier;
  onUpgrade?: (tier: SubscriptionTier) => void;
  mealPlans?: MealPlan[];
  achievements?: Achievement[];
  cookingHistory?: CookingSession[];
}

export default function PremiumDashboard({ 
  userSubscription, 
  onUpgrade,
  mealPlans = [],
  achievements = [],
  cookingHistory = []
}: PremiumDashboardProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'features' | 'analytics' | 'data'>('overview');

  const subscriptionTiers = {
    free: {
      name: 'Free',
      price: 0,
      period: 'forever',
      features: ['Basic recipe generation', '3 recipes per day', 'Basic cuisine options'],
      color: 'from-gray-400 to-gray-600',
      icon: '🆓'
    },
    premium: {
      name: 'Premium',
      price: 9.99,
      period: 'month',
      features: ['Unlimited recipes', 'Advanced AI suggestions', 'Nutrition tracking', 'Meal planning', '15+ cuisines'],
      color: 'from-blue-500 to-purple-600',
      icon: '⭐'
    },
    family: {
      name: 'Family',
      price: 19.99,
      period: 'month',
      features: ['All Premium features', 'Up to 6 family members', 'Shared meal plans', 'Bulk shopping lists', 'Kid-friendly recipes'],
      color: 'from-green-500 to-blue-500',
      icon: '👨‍👩‍👧‍👦'
    },
    chef: {
      name: 'Chef Pro',
      price: 39.99,
      period: 'month',
      features: ['All Family features', 'Video tutorials', 'Direct chef support', 'Professional techniques', 'Restaurant-quality recipes'],
      color: 'from-orange-500 to-red-500',
      icon: '👨‍🍳'
    }
  };

  const premiumFeatures = [
    {
      icon: '🤖',
      title: 'Advanced AI Recipe Engine',
      description: 'Get sophisticated, restaurant-quality recipes tailored to your exact ingredients and preferences',
      free: 'Basic recipe suggestions',
      premium: 'Advanced AI with 50+ factors considered',
      highlight: true
    },
    {
      icon: '📊',
      title: 'Complete Nutrition Analysis',
      description: 'Detailed macro and micronutrient breakdown with dietary goal tracking',
      free: 'Basic calorie info',
      premium: 'Complete nutritional analysis + tracking'
    },
    {
      icon: '📅',
      title: 'Smart Meal Planning',
      description: 'AI-powered weekly meal plans with automated shopping lists and prep schedules',
      free: 'Single recipe planning',
      premium: 'Weekly meal plans + shopping automation'
    },
    {
      icon: '🛒',
      title: 'Intelligent Shopping Lists',
      description: 'Auto-generated lists with price comparisons, store layouts, and ingredient substitutions',
      free: 'Manual shopping lists',
      premium: 'Smart lists with price optimization'
    },
    {
      icon: '🎥',
      title: 'Video Cooking Tutorials',
      description: 'Step-by-step video guides with professional chef techniques and tips',
      free: 'Text instructions only',
      premium: 'HD video tutorials + chef tips'
    },
    {
      icon: '🏆',
      title: 'Cooking Achievements',
      description: 'Gamified cooking experience with badges, challenges, and skill progression',
      free: 'Basic recipe history',
      premium: 'Achievement system + challenges'
    },
    {
      icon: '👥',
      title: 'Family Sharing',
      description: 'Share recipes, meal plans, and cooking progress with family members',
      free: 'Individual account only',
      premium: 'Multi-user family accounts'
    },
    {
      icon: '🎯',
      title: 'Dietary Goal Tracking',
      description: 'Track calories, macros, and dietary restrictions with personalized recommendations',
      free: 'Basic dietary filters',
      premium: 'Advanced goal tracking + insights'
    }
  ];

  const renderSubscriptionCard = (tier: SubscriptionTier, data: any) => (
    <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${data.color} text-white overflow-hidden ${
      userSubscription === tier ? 'ring-4 ring-yellow-400 scale-105' : ''
    }`}>
      {userSubscription === tier && (
        <div className="absolute top-4 right-4 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
          Current Plan
        </div>
      )}
      
      <div className="text-4xl mb-3">{data.icon}</div>
      <h3 className="text-2xl font-bold mb-2">{data.name}</h3>
      <div className="text-3xl font-bold mb-1">
        ${data.price}
        <span className="text-lg font-normal opacity-80">/{data.period}</span>
      </div>
      
      <ul className="space-y-2 mb-6 text-sm">
        {data.features.map((feature: string, index: number) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-yellow-300 mt-0.5">✓</span>
            <span className="opacity-90">{feature}</span>
          </li>
        ))}
      </ul>
      
      {userSubscription !== tier && (
        <button
          onClick={() => onUpgrade?.(tier)}
          className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-semibold transition-all"
        >
          {tier === 'free' ? 'Current Plan' : 'Upgrade Now'}
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl">
              {subscriptionTiers[userSubscription].icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Premium Dashboard</h1>
              <p className="text-gray-600">
                Current Plan: <span className="font-semibold text-blue-600">{subscriptionTiers[userSubscription].name}</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {['overview', 'features', 'analytics', ...(isAuthEnabled() ? ['data'] : [])].map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                  activeSection === section
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600">{cookingHistory.length}</div>
            <div className="text-sm text-gray-600">Recipes Cooked</div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{mealPlans.length}</div>
            <div className="text-sm text-gray-600">Meal Plans</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{achievements.length}</div>
            <div className="text-sm text-gray-600">Achievements</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">
              {cookingHistory.reduce((sum, session) => sum + (session.rating || 0), 0) / Math.max(cookingHistory.length, 1) || 0}★
            </div>
            <div className="text-sm text-gray-600">Avg Rating</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          {/* Subscription Tiers */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Choose Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(subscriptionTiers).map(([tier, data]) => (
                <div key={tier}>
                  {renderSubscriptionCard(tier as SubscriptionTier, data)}
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Partners */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Partner Benefits</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: '🛒', name: 'Grocery Partners', discount: '15% off' },
                { icon: '🍳', name: 'Kitchen Tools', discount: '20% off' },
                { icon: '📚', name: 'Cookbooks', discount: '25% off' },
                { icon: '🎓', name: 'Cooking Classes', discount: '30% off' }
              ].map((partner, index) => (
                <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-lg transition-all">
                  <div className="text-3xl mb-2">{partner.icon}</div>
                  <h3 className="font-semibold text-gray-800 mb-1">{partner.name}</h3>
                  <div className="text-sm text-green-600 font-bold">{partner.discount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'features' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Premium Features Comparison</h2>
          <div className="space-y-6">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className={`p-6 rounded-xl border-2 transition-all ${
                feature.highlight 
                  ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{feature.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {feature.title}
                      {feature.highlight && (
                        <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          MOST POPULAR
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-sm font-medium text-red-800 mb-1">Free Plan:</div>
                        <div className="text-sm text-red-700">{feature.free}</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-800 mb-1">Premium Plan:</div>
                        <div className="text-sm text-green-700">{feature.premium}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'analytics' && (
        <div className="space-y-8">
          {/* Cooking Analytics */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Cooking Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Achievements</h3>
                <div className="space-y-3">
                  {achievements.slice(0, 5).map((achievement, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <div className="font-medium text-gray-800">{achievement.name}</div>
                        <div className="text-sm text-gray-600">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Cooking Progress</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Recipes Mastered</span>
                      <span className="text-sm font-bold text-blue-600">
                        {cookingHistory.filter(session => session.rating >= 4).length}/{cookingHistory.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, (cookingHistory.filter(session => session.rating >= 4).length / Math.max(cookingHistory.length, 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">Favorite Cuisines</div>
                    <div className="flex flex-wrap gap-2">
                      {['Italian', 'Asian', 'Mexican'].map((cuisine, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Section */}
      {activeSection === 'data' && isAuthEnabled() && (
        <div className="space-y-6">
          <MigrationStatus />
        </div>
      )}
    </div>
  );
}