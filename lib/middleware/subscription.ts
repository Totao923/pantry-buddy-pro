import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedRequest } from './auth';
import { UsageTrackingService } from '../services/usageTrackingService';

export interface SubscriptionRequest extends AuthenticatedRequest {
  subscription: {
    tier: 'free' | 'premium' | 'family' | 'chef';
    hasFeature: (feature: string) => boolean;
    canGenerateRecipe: () => Promise<{ allowed: boolean; remaining: number }>;
    canAddPantryItem: (currentCount: number) => Promise<{ allowed: boolean; remaining: number }>;
  };
}

export type SubscriptionHandler = (
  req: SubscriptionRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Subscription middleware that adds subscription info and limit checking to requests
 */
export function withSubscription(handler: SubscriptionHandler) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const userId = req.user.id;

      // Get user's subscription limits
      const limits = await UsageTrackingService.getUserLimits(userId);

      // Determine tier based on limits
      let tier: 'free' | 'premium' | 'family' | 'chef' = 'free';
      if (limits.max_pantry_items === -1) {
        tier = 'chef';
      } else if (limits.max_pantry_items === 1000) {
        tier = 'family';
      } else if (limits.max_pantry_items === 500) {
        tier = 'premium';
      }

      // Helper function to check feature access
      const hasFeature = (feature: string): boolean => {
        switch (feature) {
          case 'advanced_ai':
            return limits.has_advanced_ai || tier === 'family' || tier === 'chef';
          case 'nutrition_tracking':
            return limits.has_nutrition_tracking || tier === 'family' || tier === 'chef';
          case 'meal_planning':
            return limits.has_meal_planning || tier === 'family' || tier === 'chef';
          case 'photo_uploads':
            return limits.has_photo_uploads || tier === 'family' || tier === 'chef';
          case 'ad_free':
            return (
              limits.has_ad_free_experience ||
              tier === 'premium' ||
              tier === 'family' ||
              tier === 'chef'
            );
          case 'family_management':
          case 'family_collections':
          case 'bulk_shopping':
          case 'family_nutrition':
            return tier === 'family' || tier === 'chef';
          default:
            return false;
        }
      };

      // Helper function to check recipe generation limit
      const canGenerateRecipe = () => UsageTrackingService.canGenerateRecipe(userId);

      // Helper function to check pantry item limit
      const canAddPantryItem = (currentCount: number) =>
        UsageTrackingService.canAddPantryItem(userId, currentCount);

      // Attach subscription info to request
      (req as SubscriptionRequest).subscription = {
        tier,
        hasFeature,
        canGenerateRecipe,
        canAddPantryItem,
      };

      // Call the original handler
      return handler(req as SubscriptionRequest, res);
    } catch (error) {
      console.error('Subscription middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Subscription service unavailable',
        code: 'SUBSCRIPTION_SERVICE_ERROR',
      });
    }
  };
}

/**
 * Middleware to require premium subscription for an endpoint
 */
export function requirePremium(handler: SubscriptionHandler) {
  return withSubscription(async (req: SubscriptionRequest, res: NextApiResponse) => {
    if (req.subscription.tier === 'free') {
      // Track premium feature attempt
      await UsageTrackingService.trackPremiumFeatureAttempt(req.user.id);

      return res.status(402).json({
        success: false,
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        upgradeUrl: '/dashboard/subscription',
      });
    }

    return handler(req, res);
  });
}

/**
 * Middleware to check recipe generation limits
 */
export function checkRecipeLimit(handler: SubscriptionHandler) {
  return withSubscription(async (req: SubscriptionRequest, res: NextApiResponse) => {
    const { allowed, remaining } = await req.subscription.canGenerateRecipe();

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Daily recipe generation limit reached',
        code: 'RECIPE_LIMIT_EXCEEDED',
        remaining: 0,
        upgradeUrl: '/dashboard/subscription',
      });
    }

    // Add remaining count to response headers
    res.setHeader('X-Recipes-Remaining', remaining.toString());

    return handler(req, res);
  });
}

/**
 * Middleware to check feature access
 */
export function requireFeature(feature: string) {
  return (handler: SubscriptionHandler) => {
    return withSubscription(async (req: SubscriptionRequest, res: NextApiResponse) => {
      if (!req.subscription.hasFeature(feature)) {
        // Track premium feature attempt
        await UsageTrackingService.trackPremiumFeatureAttempt(req.user.id);

        return res.status(402).json({
          success: false,
          error: `Feature '${feature}' requires premium subscription`,
          code: 'FEATURE_PREMIUM_REQUIRED',
          feature,
          upgradeUrl: '/dashboard/subscription',
        });
      }

      return handler(req, res);
    });
  };
}
