import React, { useState } from 'react';
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
        'AI Nutritionist with health goals',
        'Advanced meal planning',
        'Recipe books with PDF export',
        'Nutrition analysis & reports',
        'Priority AI processing',
        'Advanced pantry analytics',
      ],
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
    },
  ];

  const currentTier = subscriptionTiers.find(tier => tier.id === (subscription?.tier || 'free'));

  const handleUpgrade = async (tierId: string) => {
    setLoading(true);
    try {
      // TODO: Integrate with actual payment processor (Stripe, etc.)
      console.log('Upgrading to:', tierId);

      // For now, show a message that this is coming soon
      alert(
        'Subscription upgrade coming soon! This will integrate with Stripe for secure payments.'
      );

      // In production, you would:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe
      // 3. Handle webhook to update user subscription
      // 4. Redirect back with success/failure
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = () => {
    // TODO: Integrate with billing portal
    alert('Subscription management coming soon! This will open your billing portal.');
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
                    <span className="text-3xl font-bold">${tier.price}</span>
                    {tier.price > 0 && <span className="text-gray-600">/{tier.period}</span>}
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
