import React from 'react';

interface PremiumFeaturesProps {
  userSubscription: 'free' | 'premium';
  onUpgrade?: () => void;
}

export default function PremiumFeatures({ userSubscription, onUpgrade }: PremiumFeaturesProps) {
  const premiumFeatures = [
    {
      icon: '🤖',
      title: 'Advanced AI Recipes',
      description: 'Get more sophisticated and creative recipe suggestions',
      free: 'Basic recipes only',
      premium: 'Unlimited creative recipes',
    },
    {
      icon: '📊',
      title: 'Nutrition Analysis',
      description: 'Detailed nutritional information for every recipe',
      free: 'Not available',
      premium: 'Full nutrition tracking',
    },
    {
      icon: '📱',
      title: 'Meal Planning',
      description: 'Plan your weekly meals and generate shopping lists',
      free: 'Single recipe generation',
      premium: 'Weekly meal plans',
    },
    {
      icon: '🛒',
      title: 'Smart Shopping Lists',
      description: 'Automatically generated shopping lists with price comparison',
      free: 'Manual lists only',
      premium: 'Smart automated lists',
    },
    {
      icon: '👨‍🍳',
      title: 'Chef Techniques',
      description: 'Video tutorials and advanced cooking techniques',
      free: 'Basic instructions',
      premium: 'Video guides included',
    },
    {
      icon: '🏪',
      title: 'Partner Discounts',
      description: 'Exclusive discounts on ingredients and kitchen tools',
      free: 'No discounts',
      premium: 'Up to 20% off partners',
    },
  ];

  if (userSubscription === 'premium') {
    return (
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">👑</span>
          <h2 className="text-xl font-bold text-gray-800">Premium Member</h2>
        </div>
        <p className="text-gray-600 mb-4">
          You have access to all premium features! Enjoy unlimited creative recipes and advanced
          meal planning.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {premiumFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
              <span className="text-xl">{feature.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800">{feature.title}</h3>
                <p className="text-sm text-accent-600 font-medium">{feature.premium}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Unlock Premium Features</h2>
        <p className="text-gray-600">
          Get the most out of Pantry Buddy with our premium subscription
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {premiumFeatures.map((feature, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Free:</span>
                <span className="text-red-600">{feature.free}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Premium:</span>
                <span className="text-accent-600 font-medium">{feature.premium}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-2">Premium Subscription</h3>
        <div className="text-3xl font-bold mb-2">
          $9.99<span className="text-lg font-normal">/month</span>
        </div>
        <p className="mb-4 opacity-90">Cancel anytime • 7-day free trial</p>
        <button
          onClick={onUpgrade}
          className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Start Free Trial
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Revenue Partnerships</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">🛒</div>
            <div className="text-sm text-gray-600">Grocery Partners</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">🍳</div>
            <div className="text-sm text-gray-600">Kitchen Tools</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-sm text-gray-600">Cookbooks</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">🎓</div>
            <div className="text-sm text-gray-600">Cooking Classes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
