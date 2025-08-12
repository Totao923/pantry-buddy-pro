import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';
import { Recipe, Ingredient, CuisineType } from '../../types';
import type { Database } from '../supabase/types';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;
type RecipeRow = Database['public']['Tables']['recipes']['Row'];
type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];

export interface RecipeServiceResponse<T = Recipe> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    model: string;
    provider: string;
    responseTime: number;
    cacheHit?: boolean;
  };
  usageStats?: {
    remainingRequests: number;
    providerStatus: string;
  };
}

export interface CreateRecipeRequest {
  title: string;
  description?: string;
  cuisine: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  ingredients: Recipe['ingredients'];
  instructions: Recipe['instructions'];
  tags?: string[];
  nutritionInfo?: Recipe['nutritionInfo'];
  dietaryInfo?: Recipe['dietaryInfo'];
  aiGenerated?: boolean;
  aiProvider?: string;
  aiModel?: string;
}

class DatabaseRecipeService {
  private supabase: SupabaseClient | null = null;
  private cache = new Map<string, { data: Recipe[]; timestamp: number }>();
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

  private convertRecipeRowToRecipe(row: RecipeRow): Recipe {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      cuisine: row.cuisine as CuisineType,
      servings: row.servings,
      prepTime: row.prep_time,
      cookTime: row.cook_time,
      totalTime: row.total_time,
      difficulty: row.difficulty as any,
      ingredients: Array.isArray(row.ingredients) ? row.ingredients as Recipe['ingredients'] : [],
      instructions: Array.isArray(row.instructions) ? row.instructions as Recipe['instructions'] : [],
      tags: row.tags || [],
      nutritionInfo: row.nutrition_info as Recipe['nutritionInfo'] || undefined,
      dietaryInfo: row.dietary_info as Recipe['dietaryInfo'] || {
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isKeto: false,
        isPaleo: false,
        allergens: [],
      },
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  private convertRecipeToInsert(recipe: CreateRecipeRequest, userId: string): RecipeInsert {
    return {
      user_id: userId,
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      servings: recipe.servings,
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients as any,
      instructions: recipe.instructions as any,
      tags: recipe.tags,
      nutrition_info: recipe.nutritionInfo as any,
      dietary_info: recipe.dietaryInfo as any,
      ai_generated: recipe.aiGenerated || false,
      ai_provider: recipe.aiProvider,
      ai_model: recipe.aiModel,
    };
  }

  async saveRecipe(recipe: Recipe, userId: string): Promise<RecipeServiceResponse<{ saved: boolean }>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const authenticatedUserId = await this.ensureAuthenticated();
      
      // Convert Recipe to CreateRecipeRequest format
      const recipeData: CreateRecipeRequest = {
        title: recipe.title,
        description: recipe.description,
        cuisine: recipe.cuisine,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: recipe.tags,
        nutritionInfo: recipe.nutritionInfo,
        dietaryInfo: recipe.dietaryInfo,
        aiGenerated: recipe.tags?.includes('ai-generated') || false,
      };

      const insertData = this.convertRecipeToInsert(recipeData, authenticatedUserId);
      
      // Check if recipe already exists (by ID if provided)
      if (recipe.id) {
        const { data: existing } = await this.supabase
          .from('recipes')
          .select('id')
          .eq('id', recipe.id)
          .eq('user_id', authenticatedUserId)
          .single();

        if (existing) {
          // Update existing recipe
          const { error } = await withRetry(async () => {
            return await this.supabase!
              .from('recipes')
              .update(insertData)
              .eq('id', recipe.id)
              .eq('user_id', authenticatedUserId);
          });

          if (error) {
            const handled = handleSupabaseError(error, 'updating recipe');
            throw new Error(handled.message);
          }
        } else {
          // Insert with specific ID
          const { error } = await withRetry(async () => {
            return await this.supabase!
              .from('recipes')
              .insert({ ...insertData, id: recipe.id });
          });

          if (error) {
            const handled = handleSupabaseError(error, 'saving recipe');
            throw new Error(handled.message);
          }
        }
      } else {
        // Insert new recipe
        const { error } = await withRetry(async () => {
          return await this.supabase!
            .from('recipes')
            .insert(insertData);
        });

        if (error) {
          const handled = handleSupabaseError(error, 'saving recipe');
          throw new Error(handled.message);
        }
      }

      // Invalidate cache
      this.cache.delete(`user_${authenticatedUserId}`);

      return {
        success: true,
        data: { saved: true },
      };
    } catch (error) {
      console.error('Error saving recipe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save recipe',
      };
    }
  }

  async getUserRecipes(userId?: string): Promise<RecipeServiceResponse<Recipe[]>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const authenticatedUserId = await this.ensureAuthenticated();

      // Check cache first
      const cached = this.cache.get(`user_${authenticatedUserId}`);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { success: true, data: cached.data };
      }

      const { data, error } = await withRetry(async () => {
        return await this.supabase!
          .from('recipes')
          .select('*')
          .eq('user_id', authenticatedUserId)
          .order('created_at', { ascending: false });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'fetching recipes');
        throw new Error(handled.message);
      }

      const recipes = (data || []).map(row => this.convertRecipeRowToRecipe(row));

      // Update cache
      this.cache.set(`user_${authenticatedUserId}`, { 
        data: recipes, 
        timestamp: Date.now() 
      });

      return {
        success: true,
        data: recipes,
      };
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipes',
      };
    }
  }

  async getRecipeById(recipeId: string): Promise<RecipeServiceResponse<Recipe>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!
          .from('recipes')
          .select('*')
          .eq('id', recipeId)
          .eq('user_id', userId)
          .single();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'fetching recipe');
        throw new Error(handled.message);
      }

      if (!data) {
        throw new Error('Recipe not found');
      }

      const recipe = this.convertRecipeRowToRecipe(data);

      return {
        success: true,
        data: recipe,
      };
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipe',
      };
    }
  }

  async deleteRecipe(recipeId: string): Promise<RecipeServiceResponse<{ deleted: boolean }>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase!
          .from('recipes')
          .delete()
          .eq('id', recipeId)
          .eq('user_id', userId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'deleting recipe');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`user_${userId}`);

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
      };
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

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      // Test basic query
      const { error } = await this.supabase
        .from('recipes')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

export const databaseRecipeService = new DatabaseRecipeService();