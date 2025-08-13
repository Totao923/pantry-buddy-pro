import { createSupabaseClient } from '../supabase/client';
import { SubscriptionService } from './subscriptionService';

interface DailyUsage {
  user_id: string;
  date: string;
  recipe_generations: number;
  pantry_items_used: number;
  ai_requests: number;
  ai_tokens_used: number;
  ai_cost_cents: number;
  premium_feature_attempts: number;
}

interface UsageLimits {
  max_pantry_items: number;
  daily_recipe_generations: number;
  has_advanced_ai: boolean;
  has_nutrition_tracking: boolean;
  has_meal_planning: boolean;
  has_photo_uploads: boolean;
  has_ad_free_experience: boolean;
  max_family_members: number;
}

export class UsageTrackingService {
  private static supabase = createSupabaseClient();

  // Get today's date string in YYYY-MM-DD format
  private static getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get user's subscription limits
  static async getUserLimits(userId: string): Promise<UsageLimits> {
    try {
      const { data, error } = await this.supabase.rpc('get_subscription_features', {
        user_uuid: userId,
      });

      if (error) {
        console.error('Error getting subscription features:', error);
        // Default to free tier on error
        return {
          max_pantry_items: 50,
          daily_recipe_generations: 5,
          has_advanced_ai: false,
          has_nutrition_tracking: false,
          has_meal_planning: false,
          has_photo_uploads: false,
          has_ad_free_experience: false,
          max_family_members: 1,
        };
      }

      return data as UsageLimits;
    } catch (error) {
      console.error('Error in getUserLimits:', error);
      // Default to free tier on error
      return {
        max_pantry_items: 50,
        daily_recipe_generations: 5,
        has_advanced_ai: false,
        has_nutrition_tracking: false,
        has_meal_planning: false,
        has_photo_uploads: false,
        has_ad_free_experience: false,
        max_family_members: 1,
      };
    }
  }

  // Get today's usage for a user
  static async getTodayUsage(userId: string): Promise<DailyUsage> {
    try {
      const today = this.getTodayString();
      const { data, error } = await this.supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        console.error('Error getting usage:', error);
      }

      return (
        data || {
          user_id: userId,
          date: today,
          recipe_generations: 0,
          pantry_items_used: 0,
          ai_requests: 0,
          ai_tokens_used: 0,
          ai_cost_cents: 0,
          premium_feature_attempts: 0,
        }
      );
    } catch (error) {
      console.error('Error in getTodayUsage:', error);
      return {
        user_id: userId,
        date: this.getTodayString(),
        recipe_generations: 0,
        pantry_items_used: 0,
        ai_requests: 0,
        ai_tokens_used: 0,
        ai_cost_cents: 0,
        premium_feature_attempts: 0,
      };
    }
  }

  // Check if user can generate another recipe today
  static async canGenerateRecipe(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const [limits, usage] = await Promise.all([
        this.getUserLimits(userId),
        this.getTodayUsage(userId),
      ]);

      const remaining = Math.max(0, limits.daily_recipe_generations - usage.recipe_generations);
      const allowed = limits.daily_recipe_generations === -1 || remaining > 0;

      return { allowed, remaining };
    } catch (error) {
      console.error('Error checking recipe generation limit:', error);
      return { allowed: false, remaining: 0 };
    }
  }

  // Check if user can add more pantry items
  static async canAddPantryItem(
    userId: string,
    currentCount: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const limits = await this.getUserLimits(userId);

      if (limits.max_pantry_items === -1) {
        // Unlimited
        return { allowed: true, remaining: -1 };
      }

      const remaining = Math.max(0, limits.max_pantry_items - currentCount);
      const allowed = remaining > 0;

      return { allowed, remaining };
    } catch (error) {
      console.error('Error checking pantry limit:', error);
      return { allowed: false, remaining: 0 };
    }
  }

  // Check if user has access to a premium feature
  static async hasFeatureAccess(userId: string, feature: keyof UsageLimits): Promise<boolean> {
    try {
      const limits = await this.getUserLimits(userId);
      return !!limits[feature];
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  // Track recipe generation
  static async trackRecipeGeneration(
    userId: string,
    aiTokens: number = 0,
    costCents: number = 0
  ): Promise<void> {
    try {
      const today = this.getTodayString();

      // First try to get existing record
      const { data: existing } = await this.supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (existing) {
        // Update existing record by incrementing values
        const { error } = await this.supabase
          .from('usage_tracking')
          .update({
            recipe_generations: existing.recipe_generations + 1,
            ai_requests: existing.ai_requests + 1,
            ai_tokens_used: existing.ai_tokens_used + aiTokens,
            ai_cost_cents: existing.ai_cost_cents + costCents,
          })
          .eq('user_id', userId)
          .eq('date', today);

        if (error) {
          console.error('Error updating recipe generation tracking:', error);
        }
      } else {
        // Insert new record
        const { error } = await this.supabase.from('usage_tracking').insert({
          user_id: userId,
          date: today,
          recipe_generations: 1,
          ai_requests: 1,
          ai_tokens_used: aiTokens,
          ai_cost_cents: costCents,
        });

        if (error) {
          console.error('Error inserting recipe generation tracking:', error);
        }
      }
    } catch (error) {
      console.error('Error in trackRecipeGeneration:', error);
    }
  }

  // Track premium feature attempt
  static async trackPremiumFeatureAttempt(userId: string): Promise<void> {
    try {
      const today = this.getTodayString();

      // First try to get existing record
      const { data: existing } = await this.supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (existing) {
        // Update existing record by incrementing
        const { error } = await this.supabase
          .from('usage_tracking')
          .update({
            premium_feature_attempts: existing.premium_feature_attempts + 1,
          })
          .eq('user_id', userId)
          .eq('date', today);

        if (error) {
          console.error('Error updating premium feature attempt tracking:', error);
        }
      } else {
        // Insert new record
        const { error } = await this.supabase.from('usage_tracking').insert({
          user_id: userId,
          date: today,
          recipe_generations: 0,
          pantry_items_used: 0,
          ai_requests: 0,
          ai_tokens_used: 0,
          ai_cost_cents: 0,
          premium_feature_attempts: 1,
        });

        if (error) {
          console.error('Error inserting premium feature attempt tracking:', error);
        }
      }
    } catch (error) {
      console.error('Error in trackPremiumFeatureAttempt:', error);
    }
  }

  // Get usage summary for dashboard
  static async getUsageSummary(userId: string): Promise<{
    limits: UsageLimits;
    todayUsage: DailyUsage;
    remaining: {
      recipes: number;
      pantryItems: number;
    };
  }> {
    try {
      const [limits, todayUsage] = await Promise.all([
        this.getUserLimits(userId),
        this.getTodayUsage(userId),
      ]);

      const remaining = {
        recipes:
          limits.daily_recipe_generations === -1
            ? -1
            : Math.max(0, limits.daily_recipe_generations - todayUsage.recipe_generations),
        pantryItems: limits.max_pantry_items === -1 ? -1 : limits.max_pantry_items, // Will need current pantry count to calculate remaining
      };

      return { limits, todayUsage, remaining };
    } catch (error) {
      console.error('Error getting usage summary:', error);
      // Return default free tier
      return {
        limits: {
          max_pantry_items: 50,
          daily_recipe_generations: 5,
          has_advanced_ai: false,
          has_nutrition_tracking: false,
          has_meal_planning: false,
          has_photo_uploads: false,
          has_ad_free_experience: false,
          max_family_members: 1,
        },
        todayUsage: {
          user_id: userId,
          date: this.getTodayString(),
          recipe_generations: 0,
          pantry_items_used: 0,
          ai_requests: 0,
          ai_tokens_used: 0,
          ai_cost_cents: 0,
          premium_feature_attempts: 0,
        },
        remaining: { recipes: 5, pantryItems: 50 },
      };
    }
  }
}
