import { Recipe, Ingredient, CuisineType } from '../../types';
import { databaseRecipeService } from './databaseRecipeService';

interface RecipeGenerationOptions {
  ingredients: Ingredient[];
  cuisine: CuisineType;
  servings?: number;
  preferences?: {
    maxTime?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    dietary?: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
  userId?: string;
}

interface RecipeEnhancementOptions {
  originalRecipe: Recipe;
  enhancement: 'add-tips' | 'create-variations' | 'improve-instructions' | 'optimize-nutrition';
  userFeedback?: {
    rating?: number;
    comments?: string;
    issues?: string[];
  };
}

interface RecipeServiceResponse<T = Recipe> {
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

export class RecipeService {
  private static readonly BASE_URL = '/api/recipes';

  /**
   * Generate a new recipe based on ingredients and preferences
   */
  static async generateRecipe(options: RecipeGenerationOptions): Promise<RecipeServiceResponse> {
    try {
      // Get authentication token from Supabase
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Check if we're in browser environment and have access to Supabase
      if (typeof window !== 'undefined') {
        try {
          // Import supabase client dynamically to avoid SSR issues
          const { createSupabaseClient } = await import('../supabase/client');
          const supabase = createSupabaseClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        } catch (error) {
          console.warn('Could not get auth token for recipe generation:', error);
        }
      }

      const response = await fetch(`${this.BASE_URL}/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: result.success,
        data: result.recipe,
        error: result.error,
        metadata: result.metadata,
        usageStats: result.usageStats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Enhance an existing recipe
   */
  static async enhanceRecipe(options: RecipeEnhancementOptions): Promise<RecipeServiceResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: result.success,
        data: result.recipe,
        error: result.error,
        metadata: result.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Get recipe suggestions
   */
  static async getSuggestions(
    cuisinePreference?: string,
    mood?: string,
    count = 5
  ): Promise<RecipeServiceResponse<string[]>> {
    try {
      const params = new URLSearchParams();
      if (cuisinePreference) params.append('cuisinePreference', cuisinePreference);
      if (mood) params.append('mood', mood);
      params.append('count', count.toString());

      const response = await fetch(`${this.BASE_URL}/suggestions?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: result.success,
        data: result.suggestions,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Batch generate multiple recipe variations
   */
  static async generateVariations(
    baseOptions: RecipeGenerationOptions,
    variationCount = 3
  ): Promise<RecipeServiceResponse<Recipe[]>> {
    try {
      const variations: Recipe[] = [];
      const errors: string[] = [];

      // Generate multiple variations with slight preference changes
      const promises = Array.from({ length: variationCount }, async (_, index) => {
        const modifiedOptions = {
          ...baseOptions,
          preferences: {
            ...baseOptions.preferences,
            // Add some variation to preferences
            experienceLevel: ['beginner', 'intermediate', 'advanced'][index % 3] as any,
          },
        };

        const result = await this.generateRecipe(modifiedOptions);
        if (result.success && result.data) {
          variations.push(result.data);
        } else if (result.error) {
          errors.push(result.error);
        }
      });

      await Promise.all(promises);

      if (variations.length === 0) {
        return {
          success: false,
          error: `Failed to generate variations: ${errors.join(', ')}`,
        };
      }

      return {
        success: true,
        data: variations,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate variations',
      };
    }
  }

  /**
   * Save recipe to user's collection
   */
  static async saveRecipe(
    recipe: Recipe,
    userId: string
  ): Promise<RecipeServiceResponse<{ saved: boolean }>> {
    try {
      // For AI-generated recipes, try Supabase but fall back gracefully
      if (recipe.tags?.includes('quick-suggestion') || recipe.tags?.includes('ai-generated')) {
        console.log('AI-generated recipe detected, attempting database save with fallback');
        try {
          if (await databaseRecipeService.isAvailable()) {
            // For AI recipes, create a new recipe without the original ID to avoid conflicts
            const { id: _omittedId, ...recipeData } = recipe;
            // Create a new recipe object without ID so Supabase will generate one
            const newRecipe: Recipe = {
              ...recipeData,
              id: crypto.randomUUID(), // Generate a new UUID for the database
            };
            return await databaseRecipeService.saveRecipe(newRecipe, userId);
          }
        } catch (error) {
          console.warn('Database save failed for AI recipe, using localStorage:', error);
          return await this.saveRecipeToLocalStorage(recipe, userId);
        }
      }

      // Try to use database service first for regular recipes
      if (await databaseRecipeService.isAvailable()) {
        console.log('Saving recipe to Supabase database');
        return await databaseRecipeService.saveRecipe(recipe, userId);
      } else {
        console.log('Database not available, falling back to localStorage');
        return await this.saveRecipeToLocalStorage(recipe, userId);
      }
    } catch (error) {
      console.warn('Database save failed, falling back to localStorage:', error);
      return await this.saveRecipeToLocalStorage(recipe, userId);
    }
  }

  /**
   * Fallback method to save recipe to localStorage
   */
  private static async saveRecipeToLocalStorage(
    recipe: Recipe,
    userId: string
  ): Promise<RecipeServiceResponse<{ saved: boolean }>> {
    try {
      // Save to multiple storage locations to ensure the recipe can be found
      const recipeWithMetadata = { ...recipe, savedAt: new Date().toISOString(), userId };

      // Save to userRecipes (used by recipe detail page)
      const userRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
      const existingIndex = userRecipes.findIndex((r: Recipe) => r.id === recipe.id);
      if (existingIndex >= 0) {
        userRecipes[existingIndex] = recipeWithMetadata;
      } else {
        userRecipes.push(recipeWithMetadata);
      }
      localStorage.setItem('userRecipes', JSON.stringify(userRecipes));

      // Also save to savedRecipes for consistency
      const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
      const savedExistingIndex = savedRecipes.findIndex((r: Recipe) => r.id === recipe.id);
      if (savedExistingIndex >= 0) {
        savedRecipes[savedExistingIndex] = recipeWithMetadata;
      } else {
        savedRecipes.push(recipeWithMetadata);
      }
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));

      return {
        success: true,
        data: { saved: true },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save recipe locally',
      };
    }
  }

  /**
   * Get saved recipes
   */
  static async getSavedRecipes(userId: string): Promise<RecipeServiceResponse<Recipe[]>> {
    try {
      // Try to use database service first
      if (await databaseRecipeService.isAvailable()) {
        console.log('Loading recipes from Supabase database');
        return await databaseRecipeService.getUserRecipes(userId);
      } else {
        console.log('Database not available, falling back to localStorage');
        return await this.getSavedRecipesFromLocalStorage(userId);
      }
    } catch (error) {
      console.warn('Database load failed, falling back to localStorage:', error);
      return await this.getSavedRecipesFromLocalStorage(userId);
    }
  }

  /**
   * Fallback method to get recipes from localStorage
   */
  private static async getSavedRecipesFromLocalStorage(
    userId: string
  ): Promise<RecipeServiceResponse<Recipe[]>> {
    try {
      const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
      const userRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');

      // Combine both sources and deduplicate by ID
      const allRecipes = [...savedRecipes, ...userRecipes];
      const uniqueRecipes = allRecipes.reduce((acc: any[], recipe: any) => {
        if (!acc.find((r: any) => r.id === recipe.id)) {
          acc.push(recipe);
        }
        return acc;
      }, []);

      // Filter recipes by userId, but handle anonymous users
      let filteredRecipes;
      if (userId === 'anonymous') {
        // For anonymous users, return all recipes regardless of userId
        filteredRecipes = uniqueRecipes;
      } else {
        // For authenticated users, filter by exact userId match
        filteredRecipes = uniqueRecipes.filter((r: any) => r.userId === userId);
      }

      console.log(`Found ${filteredRecipes.length} recipes for userId: ${userId}`);

      return {
        success: true,
        data: filteredRecipes,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to load saved recipes from local storage',
      };
    }
  }
}
