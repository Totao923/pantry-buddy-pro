import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';
import { RecipeRating, RecipeReview } from '../../types';
import type { Database } from '../supabase/types';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;
type RecipeRatingRow = Database['public']['Tables']['recipe_ratings']['Row'];
type RecipeRatingInsert = Database['public']['Tables']['recipe_ratings']['Insert'];
type RecipeRatingUpdate = Database['public']['Tables']['recipe_ratings']['Update'];

class DatabaseRatingsService {
  private supabase: SupabaseClient | null = null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.supabase = createSupabaseClient();
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase client not available');
    }

    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not authenticated');
    }

    return user.id;
  }

  private convertRowToRating(row: RecipeRatingRow): RecipeRating {
    return {
      id: row.id,
      recipeId: row.recipe_id,
      userId: row.user_id,
      overallRating: row.overall_rating,
      difficultyAccuracy: row.difficulty_accuracy,
      tasteRating: row.taste_rating,
      wouldCookAgain: row.would_cook_again,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private convertRowToReview(row: RecipeRatingRow): RecipeReview | null {
    if (!row.review_text) return null;

    return {
      id: row.id,
      recipeId: row.recipe_id,
      userId: row.user_id,
      rating: this.convertRowToRating(row),
      reviewText: row.review_text,
      modifications: row.modifications || [],
      cookingTips: row.cooking_tips || [],
      helpfulVotes: row.helpful_votes || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async saveRecipeRating(
    recipeId: string,
    rating: Omit<RecipeRating, 'recipeId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const ratingData: RecipeRatingInsert = {
        recipe_id: recipeId,
        user_id: userId,
        overall_rating: rating.overallRating,
        difficulty_accuracy: rating.difficultyAccuracy,
        taste_rating: rating.tasteRating,
        would_cook_again: rating.wouldCookAgain,
      };

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings').upsert(ratingData, {
          onConflict: 'recipe_id,user_id',
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'saving recipe rating');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`rating_${userId}_${recipeId}`);
      return true;
    } catch (error) {
      console.error('Error saving recipe rating:', error);
      return false;
    }
  }

  async saveRecipeReview(
    recipeId: string,
    review: Omit<RecipeReview, 'recipeId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const reviewData: RecipeRatingUpdate = {
        review_text: review.reviewText,
        modifications: review.modifications,
        cooking_tips: review.cookingTips,
      };

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings')
          .update(reviewData)
          .eq('recipe_id', recipeId)
          .eq('user_id', userId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'saving recipe review');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`rating_${userId}_${recipeId}`);
      return true;
    } catch (error) {
      console.error('Error saving recipe review:', error);
      return false;
    }
  }

  async saveRecipeRatingAndReview(
    recipeId: string,
    rating: Omit<RecipeRating, 'recipeId' | 'userId' | 'createdAt' | 'updatedAt'>,
    review?: Omit<RecipeReview, 'recipeId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const ratingData: RecipeRatingInsert = {
        recipe_id: recipeId,
        user_id: userId,
        overall_rating: rating.overallRating,
        difficulty_accuracy: rating.difficultyAccuracy,
        taste_rating: rating.tasteRating,
        would_cook_again: rating.wouldCookAgain,
        review_text: review?.reviewText || null,
        modifications: review?.modifications || null,
        cooking_tips: review?.cookingTips || null,
      };

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings').upsert(ratingData, {
          onConflict: 'recipe_id,user_id',
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'saving recipe rating and review');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`rating_${userId}_${recipeId}`);
      return true;
    } catch (error) {
      console.error('Error saving recipe rating and review:', error);
      return false;
    }
  }

  async getRecipeRating(recipeId: string): Promise<RecipeRating | null> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();
      const cacheKey = `rating_${userId}_${recipeId}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings')
          .select('*')
          .eq('recipe_id', recipeId)
          .eq('user_id', userId)
          .single();
      });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        const handled = handleSupabaseError(error, 'getting recipe rating');
        throw new Error(handled.message);
      }

      const rating = data ? this.convertRowToRating(data) : null;

      // Cache the result
      this.cache.set(cacheKey, { data: rating, timestamp: Date.now() });
      return rating;
    } catch (error) {
      console.error('Error getting recipe rating:', error);
      return null;
    }
  }

  async getRecipeReview(recipeId: string): Promise<RecipeReview | null> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();
      const cacheKey = `rating_${userId}_${recipeId}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        const rating = cached.data;
        return rating ? this.convertRowToReview(rating) : null;
      }

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings')
          .select('*')
          .eq('recipe_id', recipeId)
          .eq('user_id', userId)
          .single();
      });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        const handled = handleSupabaseError(error, 'getting recipe review');
        throw new Error(handled.message);
      }

      const review = data ? this.convertRowToReview(data) : null;
      return review;
    } catch (error) {
      console.error('Error getting recipe review:', error);
      return null;
    }
  }

  async getAllUserRatings(): Promise<Record<string, RecipeRating>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings').select('*').eq('user_id', userId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting all user ratings');
        throw new Error(handled.message);
      }

      const ratings: Record<string, RecipeRating> = {};
      (data || []).forEach((row: any) => {
        ratings[row.recipe_id] = this.convertRowToRating(row);
      });

      return ratings;
    } catch (error) {
      console.error('Error getting all user ratings:', error);
      return {};
    }
  }

  async getAllUserReviews(): Promise<Record<string, RecipeReview>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('recipe_ratings')
          .select('*')
          .eq('user_id', userId)
          .not('review_text', 'is', null);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting all user reviews');
        throw new Error(handled.message);
      }

      const reviews: Record<string, RecipeReview> = {};
      (data || []).forEach((row: any) => {
        const review = this.convertRowToReview(row);
        if (review) {
          reviews[row.recipe_id] = review;
        }
      });

      return reviews;
    } catch (error) {
      console.error('Error getting all user reviews:', error);
      return {};
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Health check
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.supabase) return false;

      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      // Test basic query
      const { error } = await this.supabase.from('recipe_ratings').select('id').limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

export const databaseRatingsService = new DatabaseRatingsService();
