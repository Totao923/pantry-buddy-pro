import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

class FavoritesService {
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
      throw new Error(`User not authenticated: ${error?.message || 'No user found'}`);
    }

    return user.id;
  }

  // Add recipe to favorites
  async addToFavorites(recipeId: string): Promise<boolean> {
    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase.from('saved_recipes').insert({
          user_id: userId,
          recipe_id: recipeId,
        });
      });

      if (error) {
        // Ignore duplicate key error (recipe already favorited)
        if (error.code === '23505') {
          return true;
        }
        const handled = handleSupabaseError(error, 'adding recipe to favorites');
        throw new Error(handled.message);
      }

      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
  }

  // Remove recipe from favorites
  async removeFromFavorites(recipeId: string): Promise<boolean> {
    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'removing recipe from favorites');
        throw new Error(handled.message);
      }

      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  }

  // Check if recipe is favorited
  async isFavorite(recipeId: string): Promise<boolean> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('saved_recipes')
          .select('id')
          .eq('user_id', userId)
          .eq('recipe_id', recipeId)
          .limit(1);
      });

      if (error) {
        console.error('Error checking if favorite:', error);
        return false;
      }

      return (data || []).length > 0;
    } catch (error) {
      console.error('Error checking if favorite:', error);
      return false;
    }
  }

  // Get all user's favorite recipe IDs
  async getFavoriteRecipeIds(): Promise<string[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('saved_recipes')
          .select('recipe_id')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting favorite recipes');
        throw new Error(handled.message);
      }

      return (data || []).map((item: any) => item.recipe_id);
    } catch (error) {
      console.error('Error getting favorite recipe IDs:', error);
      return [];
    }
  }

  // Toggle favorite status
  async toggleFavorite(recipeId: string): Promise<boolean> {
    try {
      const isFav = await this.isFavorite(recipeId);

      if (isFav) {
        return await this.removeFromFavorites(recipeId);
      } else {
        return await this.addToFavorites(recipeId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }

  // Check if user is authenticated (for graceful fallback)
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      return true;
    } catch {
      return false;
    }
  }
}

export const favoritesService = new FavoritesService();
