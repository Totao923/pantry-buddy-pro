import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import PremiumFeatures from '../../components/PremiumFeatures';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  yearly?: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: string;
}

export default function Subscription() {
  const { user, subscription } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Check if user came here for a specific feature
  const featureParam = router.query.feature as string;
  const successParam = router.query.success as string;
  const canceledParam = router.query.canceled as string;

  // Handle successful subscription
  useEffect(() => {
    if (successParam === 'true') {
      // Show success message
      const timer = setTimeout(() => {
        router.replace('/dashboard/subscription', undefined, { shallow: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successParam, router]);

  const subscriptionTiers: SubscriptionTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for getting started with basic recipe generation',
      icon: '🆓',
      features: [
        '5 AI recipes per day',
        'Basic pantry management',
        'Simple recipe suggestions',
        'Community recipes access',
        'Basic meal planning',
      ],
      yearly: 0,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 9.99,
      period: 'month',
      description: 'Unlock advanced AI features and nutrition insights',
      icon: '⭐',
      popular: true,
      features: [
        'Unlimited AI recipes',
        '"What Should I Cook?" suggestions',
        'AI Nutritionist with health goals',
        'Advanced meal planning',
        'Recipe books with PDF export',
        'Nutrition analysis & reports',
        'Priority AI processing',
        'Advanced pantry analytics',
      ],
      yearly: 95.88,
    },
    {
      id: 'family',
      name: 'Family',
      price: 19.99,
      period: 'month',
      description: 'Perfect for families with shared meal planning',
      icon: '👨‍👩‍👧‍👦',
      features: [
        'Everything in Premium',
        'Up to 6 family members',
        'Shared meal planning',
        'Family recipe collections',
        'Bulk shopping lists',
        'Child-friendly recipe filters',
        'Family nutrition tracking',
      ],
      yearly: 191.76,
    },
    {
      id: 'chef',
      name: 'Chef',
      price: 39.99,
      period: 'month',
      description: 'Professional features for serious home chefs',
      icon: '👨‍🍳',
      features: [
        'Everything in Family',
        'Advanced recipe customization',
        'Professional cooking techniques',
        'Inventory cost tracking',
        'Recipe scaling for events',
        'Cooking video tutorials',
        'Priority customer support',
      ],
      yearly: 383.52,
    },
  ];

  const currentTier = subscriptionTiers.find(tier => tier.id === (subscription?.tier || 'free'));

  const handleUpgrade = async (tierId: string) => {
    if (!user) {
      alert('Please sign in to upgrade your subscription.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: tierId,
          period: selectedPeriod,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Upgrade error:', error);
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      alert('Please sign in to manage your subscription.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <Head>
        <title>Subscription - Pantry Buddy Pro</title>
        <meta name="description" content="Choose your Pantry Buddy Pro subscription plan" />
      </Head>

      <DashboardLayout>
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Unlock the full potential of AI-powered cooking with features designed for every level
              of home chef.
            </p>
          </div>

          {/* Success Message */}
          {successParam === 'true' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-semibold text-green-900 mb-2">Welcome to Premium!</h3>
              <p className="text-green-700">
                Your subscription has been activated successfully. Enjoy all the premium features!
              </p>
            </div>
          )}

          {/* Cancellation Message */}
          {canceledParam === 'true' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">💭</div>
              <h3 className="text-xl font-semibold text-yellow-900 mb-2">No Problem!</h3>
              <p className="text-yellow-700">
                You can upgrade anytime. We're here when you're ready for premium features.
              </p>
            </div>
          )}

          {/* Billing Period Toggle */}
          <div className="flex justify-center">
            <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedPeriod('monthly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === 'monthly'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedPeriod('yearly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors relative ${
                    selectedPeriod === 'yearly'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Yearly
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    20% off
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature-specific callout */}
          {featureParam === 'quick-suggestions' && (
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🤔</div>
                <div>
                  <h3 className="text-xl font-semibold text-purple-900 mb-2">
                    "What Should I Cook?" Feature
                  </h3>
                  <p className="text-purple-700 mb-3">
                    Get AI-powered recipe suggestions based on your pantry inventory! This premium
                    feature analyzes your ingredients and suggests personalized recipes you can make
                    right now.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <span>✨</span>
                    <span>Upgrade to Premium to unlock intelligent recipe suggestions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Subscription Status */}
          {currentTier && (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{currentTier.icon}</div>
                  <div>
                    <h3 className="text-xl font-semibold">Current Plan: {currentTier.name}</h3>
                    <p className="text-gray-600">{currentTier.description}</p>
                  </div>
                </div>
                {currentTier.id !== 'free' && (
                  <Button onClick={handleManageSubscription} variant="secondary">
                    Manage Subscription
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Subscription Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptionTiers.map(tier => (
              <Card
                key={tier.id}
                className={`p-6 relative ${
                  tier.popular ? 'border-2 border-purple-500 shadow-lg' : 'border border-gray-200'
                } ${currentTier?.id === tier.id ? 'bg-green-50 border-green-500' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {currentTier?.id === tier.id && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">{tier.icon}</div>
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      ${selectedPeriod === 'yearly' && tier.yearly ? tier.yearly : tier.price}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-gray-600">
                        /{selectedPeriod === 'yearly' ? 'year' : tier.period}
                      </span>
                    )}
                    {selectedPeriod === 'yearly' && tier.yearly && tier.price > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${(tier.price * 12 - tier.yearly).toFixed(2)} per year
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{tier.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {currentTier?.id === tier.id ? (
                    <Button fullWidth variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant={tier.popular ? 'primary' : 'secondary'}
                      onClick={() => handleUpgrade(tier.id)}
                      loading={loading}
                    >
                      {tier.price === 0 ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Premium Features Detail */}
          <div className="mt-12">
            <PremiumFeatures
              userSubscription={subscription?.tier === 'free' ? 'free' : 'premium'}
              onUpgrade={() => handleUpgrade('premium')}
            />
          </div>

          {/* FAQ Section */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Can I cancel anytime?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Yes, you can cancel your subscription at any time. You'll continue to have access
                  to premium features until the end of your current billing period.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">What payment methods do you accept?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  We accept all major credit cards through our secure Stripe integration. Your
                  payment information is never stored on our servers.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Is there a free trial?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Yes! Premium plans come with a 7-day free trial. You won't be charged until the
                  trial period ends.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Can I change plans later?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Absolutely! You can upgrade or downgrade your plan at any time from this page.
                  Changes take effect immediately.
                </p>
              </div>
            </div>
          </Card>

          {/* Contact Support */}
          <div className="text-center">
            <p className="text-gray-600">
              Need help choosing a plan?{' '}
              <button
                onClick={() => router.push('/contact')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Contact our support team
              </button>
            </p>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
