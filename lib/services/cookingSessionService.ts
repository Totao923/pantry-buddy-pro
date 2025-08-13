import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';
import type { Database } from '../supabase/types';
import { Recipe } from '../../types';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export interface CookingSession {
  id: string;
  user_id: string;
  recipe_id: string;
  recipe_title: string;
  recipe_data?: Recipe;
  cooked_at: string;
  
  // Optional user feedback
  rating?: number;
  cooking_notes?: string;
  difficulty_rating?: number;
  cook_time_actual?: number;
  
  // Success indicators
  would_cook_again?: boolean;
  recipe_followed_exactly?: boolean;
  modifications_made?: string;
  
  // Additional metadata
  cooking_method?: string;
  servings_made?: number;
  photo_url?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CookingSessionInput {
  recipe_id: string;
  recipe_title: string;
  recipe_data?: Recipe;
  rating?: number;
  cooking_notes?: string;
  difficulty_rating?: number;
  cook_time_actual?: number;
  would_cook_again?: boolean;
  recipe_followed_exactly?: boolean;
  modifications_made?: string;
  cooking_method?: string;
  servings_made?: number;
  photo_url?: string;
}

export interface RecipeCookingStats {
  recipe_id: string;
  recipe_title: string;
  total_times_cooked: number;
  unique_users_cooked: number;
  last_cooked_at?: string;
  first_cooked_at?: string;
  average_rating?: number;
  total_ratings: number;
  average_difficulty?: number;
  success_rate?: number;
  exact_follow_rate?: number;
  average_cook_time?: number;
  updated_at: string;
}

export interface UserCookingPreferences {
  user_id: string;
  total_recipes_cooked: number;
  cooking_streak_current: number;
  cooking_streak_longest: number;
  last_cooked_at?: string;
  first_cooked_at?: string;
  favorite_cuisines?: string[];
  preferred_cook_times?: number[];
  preferred_difficulty?: number;
  most_active_cooking_day?: string;
  most_active_cooking_hour?: number;
  average_rating_given?: number;
  recipe_completion_rate?: number;
  updated_at: string;
}

class CookingSessionService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  private async ensureAuthenticated(): Promise<string> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not authenticated');
    }

    return user.id;
  }

  // Create a new cooking session
  async createCookingSession(sessionData: CookingSessionInput): Promise<CookingSession> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('cooking_sessions')
          .insert({
            user_id: userId,
            recipe_id: sessionData.recipe_id,
            recipe_title: sessionData.recipe_title,
            recipe_data: sessionData.recipe_data || null,
            rating: sessionData.rating || null,
            cooking_notes: sessionData.cooking_notes || null,
            difficulty_rating: sessionData.difficulty_rating || null,
            cook_time_actual: sessionData.cook_time_actual || null,
            would_cook_again: sessionData.would_cook_again ?? null,
            recipe_followed_exactly: sessionData.recipe_followed_exactly ?? true,
            modifications_made: sessionData.modifications_made || null,
            cooking_method: sessionData.cooking_method || null,
            servings_made: sessionData.servings_made || null,
            photo_url: sessionData.photo_url || null,
          })
          .select()
          .single();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'creating cooking session');
        throw new Error(handled.message);
      }

      return data as CookingSession;
    } catch (error) {
      console.error('Error creating cooking session:', error);
      throw error;
    }
  }

  // Quick "Mark as Cooked" without detailed feedback
  async markRecipeAsCooked(recipeId: string, recipeTitle: string, recipeData?: Recipe): Promise<CookingSession> {
    return this.createCookingSession({
      recipe_id: recipeId,
      recipe_title: recipeTitle,
      recipe_data: recipeData,
      recipe_followed_exactly: true,
    });
  }

  // Update an existing cooking session (for adding feedback later)
  async updateCookingSession(sessionId: string, updates: Partial<CookingSessionInput>): Promise<CookingSession> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('cooking_sessions')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .eq('user_id', userId) // Ensure user can only update their own sessions
          .select()
          .single();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'updating cooking session');
        throw new Error(handled.message);
      }

      return data as CookingSession;
    } catch (error) {
      console.error('Error updating cooking session:', error);
      throw error;
    }
  }

  // Get user's cooking sessions
  async getUserCookingSessions(limit: number = 20, offset: number = 0): Promise<CookingSession[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('cooking_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('cooked_at', { ascending: false })
          .range(offset, offset + limit - 1);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting user cooking sessions');
        throw new Error(handled.message);
      }

      return (data || []) as CookingSession[];
    } catch (error) {
      console.error('Error getting user cooking sessions:', error);
      return [];
    }
  }

  // Get cooking sessions for a specific recipe by current user
  async getUserRecipeCookingSessions(recipeId: string): Promise<CookingSession[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('cooking_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('recipe_id', recipeId)
          .order('cooked_at', { ascending: false });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting user recipe cooking sessions');
        throw new Error(handled.message);
      }

      return (data || []) as CookingSession[];
    } catch (error) {
      console.error('Error getting user recipe cooking sessions:', error);
      return [];
    }
  }

  // Check if user has cooked a specific recipe
  async hasUserCookedRecipe(recipeId: string): Promise<boolean> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('cooking_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('recipe_id', recipeId)
          .limit(1);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'checking if user cooked recipe');
        console.error(handled.message);
        return false;
      }

      return (data || []).length > 0;
    } catch (error) {
      console.error('Error checking if user cooked recipe:', error);
      return false;
    }
  }

  // Get recipe cooking statistics
  async getRecipeCookingStats(recipeId: string): Promise<RecipeCookingStats | null> {
    try {
      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('recipe_cooking_stats')
          .select('*')
          .eq('recipe_id', recipeId)
          .single();
      });

      if (error) {
        // If no stats exist yet, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        const handled = handleSupabaseError(error, 'getting recipe cooking stats');
        throw new Error(handled.message);
      }

      return data as RecipeCookingStats;
    } catch (error) {
      console.error('Error getting recipe cooking stats:', error);
      return null;
    }
  }

  // Get popular recipes based on cooking frequency
  async getPopularRecipes(limit: number = 10): Promise<RecipeCookingStats[]> {
    try {
      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('recipe_cooking_stats')
          .select('*')
          .order('total_times_cooked', { ascending: false })
          .limit(limit);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting popular recipes');
        throw new Error(handled.message);
      }

      return (data || []) as RecipeCookingStats[];
    } catch (error) {
      console.error('Error getting popular recipes:', error);
      return [];
    }
  }

  // Get user's cooking preferences and statistics
  async getUserCookingPreferences(): Promise<UserCookingPreferences | null> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('user_cooking_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();
      });

      if (error) {
        // If no preferences exist yet, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        const handled = handleSupabaseError(error, 'getting user cooking preferences');
        throw new Error(handled.message);
      }

      return data as UserCookingPreferences;
    } catch (error) {
      console.error('Error getting user cooking preferences:', error);
      return null;
    }
  }

  // Get user's recent cooking activity
  async getUserRecentCookingActivity(days: number = 30): Promise<CookingSession[]> {
    try {
      const userId = await this.ensureAuthenticated();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('cooking_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('cooked_at', startDate.toISOString())
          .order('cooked_at', { ascending: false });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting user recent cooking activity');
        throw new Error(handled.message);
      }

      return (data || []) as CookingSession[];
    } catch (error) {
      console.error('Error getting user recent cooking activity:', error);
      return [];
    }
  }

  // Get cooking streak information
  async getCookingStreak(): Promise<{ current: number; longest: number }> {
    try {
      const userId = await this.ensureAuthenticated();
      const sessions = await this.getUserCookingSessions(365); // Get last year of sessions

      if (sessions.length === 0) {
        return { current: 0, longest: 0 };
      }

      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Group sessions by date
      const sessionsByDate = new Map<string, CookingSession[]>();
      sessions.forEach(session => {
        const date = new Date(session.cooked_at);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!sessionsByDate.has(dateKey)) {
          sessionsByDate.set(dateKey, []);
        }
        sessionsByDate.get(dateKey)!.push(session);
      });

      // Sort dates and calculate streaks
      const sortedDates = Array.from(sessionsByDate.keys()).sort().reverse();
      
      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i]);
        
        if (i === 0) {
          // Check if most recent cooking was today or yesterday
          const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) {
            currentStreak = 1;
            tempStreak = 1;
          }
        } else {
          const prevDate = new Date(sortedDates[i - 1]);
          const daysDiff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            tempStreak++;
            if (i < sortedDates.length - 1 || currentStreak > 0) {
              currentStreak = tempStreak;
            }
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
            if (currentStreak === 0) {
              break;
            }
          }
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      longestStreak = Math.max(longestStreak, currentStreak);

      return {
        current: currentStreak,
        longest: longestStreak,
      };
    } catch (error) {
      console.error('Error calculating cooking streak:', error);
      return { current: 0, longest: 0 };
    }
  }
}

export const cookingSessionService = new CookingSessionService();