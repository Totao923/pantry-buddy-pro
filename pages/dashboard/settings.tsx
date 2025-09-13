import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { CuisineType } from '../../types';

interface FormData {
  name: string;
  email: string;
  avatar?: string;
  dietaryRestrictions: string[];
  favoritesCuisines: CuisineType[];
  allergies: string[];
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra-hot';
  cookingTime: 'quick' | 'medium' | 'slow';
  servingSize: number;
  budgetRange: 'low' | 'medium' | 'high';
  showAds: boolean;
  adPersonalization: boolean;
  emailNotifications: boolean;
  measurementUnits: 'imperial' | 'metric';
}

export default function Settings() {
  const { user, profile, preferences, subscription, updateProfile, updatePreferences } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    avatar: '',
    dietaryRestrictions: [],
    favoritesCuisines: [],
    allergies: [],
    spiceLevel: 'medium',
    cookingTime: 'medium',
    servingSize: 4,
    budgetRange: 'medium',
    showAds: true,
    adPersonalization: false,
    emailNotifications: true,
    measurementUnits: 'imperial',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cuisines: { id: CuisineType; name: string; icon: string }[] = [
    { id: 'italian', name: 'Italian', icon: '🍝' },
    { id: 'asian', name: 'Asian', icon: '🥢' },
    { id: 'mexican', name: 'Mexican', icon: '🌮' },
    { id: 'indian', name: 'Indian', icon: '🍛' },
    { id: 'american', name: 'American', icon: '🍔' },
    { id: 'mediterranean', name: 'Mediterranean', icon: '🫒' },
    { id: 'french', name: 'French', icon: '🥐' },
    { id: 'thai', name: 'Thai', icon: '🍜' },
    { id: 'japanese', name: 'Japanese', icon: '🍣' },
    { id: 'chinese', name: 'Chinese', icon: '🥟' },
    { id: 'korean', name: 'Korean', icon: '🍲' },
    { id: 'greek', name: 'Greek', icon: '🥙' },
    { id: 'spanish', name: 'Spanish', icon: '🥘' },
    { id: 'middle-eastern', name: 'Middle Eastern', icon: '🧆' },
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Low-Carb',
    'Low-Fat',
    'Pescatarian',
    'Nut-Free',
  ];

  const commonAllergens = ['Nuts', 'Shellfish', 'Dairy', 'Eggs', 'Soy', 'Wheat', 'Fish', 'Sesame'];

  // Security: Input validation and sanitization
  const sanitizeInput = (input: string, maxLength: number = 100): string => {
    return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
  };

  const validateCuisineArray = (cuisines: any): CuisineType[] => {
    if (!Array.isArray(cuisines)) return [];
    const validCuisineIds = cuisines.map(c => c.id);
    return cuisines.filter(
      (cuisine): cuisine is CuisineType =>
        typeof cuisine === 'string' && validCuisineIds.includes(cuisine)
    );
  };

  const validateStringArray = (arr: any): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item): item is string => typeof item === 'string');
  };

  const validateSpiceLevel = (level: any): 'mild' | 'medium' | 'hot' | 'extra-hot' => {
    if (['mild', 'medium', 'hot', 'extra-hot'].includes(level)) {
      return level;
    }
    return 'medium';
  };

  const validateCookingTime = (time: any): 'quick' | 'medium' | 'slow' => {
    if (['quick', 'medium', 'slow'].includes(time)) {
      return time;
    }
    return 'medium';
  };

  const validateBudgetRange = (budget: any): 'low' | 'medium' | 'high' => {
    if (['low', 'medium', 'high'].includes(budget)) {
      return budget;
    }
    return 'medium';
  };

  const validateServingSize = (size: any): number => {
    const num = parseInt(size);
    return isNaN(num) ? 4 : Math.max(1, Math.min(12, num));
  };

  useEffect(() => {
    if (user && profile && preferences) {
      setFormData({
        name: sanitizeInput(profile.name || user.user_metadata?.name || '', 50),
        email: user.email || '',
        avatar: profile.avatar_url || '',
        dietaryRestrictions: validateStringArray(preferences.dietary_restrictions),
        favoritesCuisines: validateCuisineArray(preferences.favorite_cuisines),
        allergies: validateStringArray(preferences.allergies),
        spiceLevel: validateSpiceLevel(preferences.spice_level),
        cookingTime: validateCookingTime(preferences.cooking_time),
        servingSize: validateServingSize(preferences.serving_size),
        budgetRange: validateBudgetRange(preferences.budget_range),
        showAds: true,
        adPersonalization: false,
        emailNotifications: true,
        measurementUnits: 'imperial',
      });
    }
  }, [user, profile, preferences]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter(item => item !== value)
        : [...(prev[field] as string[]), value],
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Update profile - sanitize inputs
      const profileUpdates = {
        name: sanitizeInput(formData.name, 50),
        avatar_url: formData.avatar || null,
      };

      const profileResult = await updateProfile(profileUpdates);
      if (profileResult.error) {
        throw new Error(profileResult.error.message);
      }

      // Update preferences - validate all inputs
      const preferencesUpdates = {
        dietary_restrictions: validateStringArray(formData.dietaryRestrictions),
        favorite_cuisines: validateCuisineArray(formData.favoritesCuisines),
        allergies: validateStringArray(formData.allergies),
        spice_level: validateSpiceLevel(formData.spiceLevel),
        cooking_time: validateCookingTime(formData.cookingTime),
        serving_size: validateServingSize(formData.servingSize),
        budget_range: validateBudgetRange(formData.budgetRange),
      };

      const preferencesResult = await updatePreferences(preferencesUpdates);
      if (preferencesResult.error) {
        throw new Error(preferencesResult.error.message);
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: [],
      favoritesCuisines: [],
      allergies: [],
      spiceLevel: 'medium',
      cookingTime: 'medium',
      servingSize: 4,
      budgetRange: 'medium',
      showAds: true,
      adPersonalization: false,
      emailNotifications: true,
      measurementUnits: 'imperial',
    }));
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/account/export', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `pantry-buddy-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to export data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmationText = prompt(
      'This action cannot be undone! Type "DELETE MY ACCOUNT" to confirm:'
    );

    if (confirmationText !== 'DELETE MY ACCOUNT') {
      alert('Account deletion cancelled.');
      return;
    }

    const finalConfirm = confirm(
      'Are you absolutely sure? This will permanently delete all your data, recipes, meal plans, and cancel any active subscriptions.'
    );

    if (!finalConfirm) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          confirmationText: 'DELETE MY ACCOUNT',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      alert('Account deleted successfully. You will be redirected to the home page.');

      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Delete account error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-pantry-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head>
        <title>Settings - Pantry Buddy Pro</title>
        <meta name="description" content="Manage your account settings and preferences" />
      </Head>

      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account and cooking preferences</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-lg hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Account Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Cooking Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Cooking Preferences</h2>

            {/* Dietary Restrictions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dietary Restrictions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {dietaryOptions.map(option => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.dietaryRestrictions.includes(option)}
                      onChange={() => handleArrayToggle('dietaryRestrictions', option)}
                      className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Favorite Cuisines */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Favorite Cuisines
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cuisines.map(cuisine => (
                  <label
                    key={cuisine.id}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.favoritesCuisines.includes(cuisine.id)
                        ? 'border-pantry-500 bg-pantry-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.favoritesCuisines.includes(cuisine.id)}
                      onChange={() => handleArrayToggle('favoritesCuisines', cuisine.id)}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-2">{cuisine.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{cuisine.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Allergies</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {commonAllergens.map(allergen => (
                  <label key={allergen} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allergies.includes(allergen)}
                      onChange={() => handleArrayToggle('allergies', allergen)}
                      className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{allergen}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Other Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Spice Level</label>
                <div className="space-y-2">
                  {(['mild', 'medium', 'hot', 'extra-hot'] as const).map(level => (
                    <label key={level} className="flex items-center">
                      <input
                        type="radio"
                        name="spiceLevel"
                        value={level}
                        checked={formData.spiceLevel === level}
                        onChange={e => handleInputChange('spiceLevel', e.target.value)}
                        className="text-pantry-600 focus:ring-pantry-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cooking Time Preference
                </label>
                <div className="space-y-2">
                  {(['quick', 'medium', 'slow'] as const).map(time => (
                    <label key={time} className="flex items-center">
                      <input
                        type="radio"
                        name="cookingTime"
                        value={time}
                        checked={formData.cookingTime === time}
                        onChange={e => handleInputChange('cookingTime', e.target.value)}
                        className="text-pantry-600 focus:ring-pantry-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{time}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="servingSize"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Default Serving Size
                </label>
                <input
                  id="servingSize"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.servingSize}
                  onChange={e => handleInputChange('servingSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Budget Range</label>
                <div className="space-y-2">
                  {(['low', 'medium', 'high'] as const).map(budget => (
                    <label key={budget} className="flex items-center">
                      <input
                        type="radio"
                        name="budgetRange"
                        value={budget}
                        checked={formData.budgetRange === budget}
                        onChange={e => handleInputChange('budgetRange', e.target.value)}
                        className="text-pantry-600 focus:ring-pantry-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{budget}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Notifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Privacy & Notifications</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  <p className="text-xs text-gray-500">
                    Receive recipe suggestions and meal plan reminders
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.emailNotifications}
                  onChange={e => handleInputChange('emailNotifications', e.target.checked)}
                  className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Advertisements</span>
                  <p className="text-xs text-gray-500">
                    Display ads to support the app (free tier)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showAds}
                  onChange={e => handleInputChange('showAds', e.target.checked)}
                  className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Personalized Ads</span>
                  <p className="text-xs text-gray-500">
                    Show ads based on your cooking preferences
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.adPersonalization}
                  onChange={e => handleInputChange('adPersonalization', e.target.checked)}
                  disabled={!formData.showAds}
                  className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500 disabled:opacity-50"
                />
              </label>
            </div>
          </div>

          {/* App Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">App Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Measurement Units
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="measurementUnits"
                      value="imperial"
                      checked={formData.measurementUnits === 'imperial'}
                      onChange={e => handleInputChange('measurementUnits', e.target.value)}
                      className="text-pantry-600 focus:ring-pantry-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Imperial (cups, oz, °F)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="measurementUnits"
                      value="metric"
                      checked={formData.measurementUnits === 'metric'}
                      onChange={e => handleInputChange('measurementUnits', e.target.value)}
                      className="text-pantry-600 focus:ring-pantry-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Metric (ml, g, °C)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Subscription</h2>
            <div className="space-y-4">
              {subscription ? (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {subscription.tier === 'free'
                        ? '🆓'
                        : subscription.tier === 'premium'
                          ? '⭐'
                          : subscription.tier === 'family'
                            ? '👨‍👩‍👧‍👦'
                            : '👨‍🍳'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {subscription.tier} Plan
                      </h3>
                      <p className="text-sm text-gray-600">
                        {subscription.tier === 'free'
                          ? 'Basic features with limited AI recipes'
                          : subscription.tier === 'premium'
                            ? 'Unlimited AI recipes & advanced features'
                            : subscription.tier === 'family'
                              ? 'Family meal planning & shared features'
                              : 'Professional chef features & priority support'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard/subscription">
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
                        {subscription.tier === 'free' ? 'Upgrade' : 'Manage'}
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-600 mb-3">
                    No subscription information available. Please sign in to view your plan.
                  </p>
                  <Link href="/dashboard/subscription">
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
                      View Plans
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Data Export & Account Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Data & Privacy</h2>

            {/* Data Export */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Export Your Data</h3>
              <p className="text-gray-600 mb-4">
                Download a complete copy of your account data including recipes, meal plans,
                preferences, and more. This includes all the information associated with your
                account in JSON format.
              </p>
              <button
                onClick={handleExportData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Exporting...' : 'Export My Data'}
              </button>
            </div>

            {/* Account Deletion Warning Section */}
            <div className="border-t border-gray-200 pt-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 text-xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Account</h3>
                    <p className="text-red-700 mb-4">
                      Permanently delete your account and all associated data. This action{' '}
                      <strong>cannot be undone</strong>.
                    </p>

                    <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-red-900 mb-2">
                        This will permanently delete:
                      </h4>
                      <ul className="text-red-800 text-sm space-y-1">
                        <li>• Your account and profile information</li>
                        <li>• All your recipes and meal plans</li>
                        <li>• Your pantry items and shopping lists</li>
                        <li>• Your cooking history and preferences</li>
                        <li>• Your active subscription (if any)</li>
                        <li>• All data associated with your account</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Delete My Account
                      </button>
                      <span className="text-sm text-red-600">
                        We recommend exporting your data first
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
