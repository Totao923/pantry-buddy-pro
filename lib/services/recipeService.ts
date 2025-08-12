import { Recipe, Ingredient, CuisineType } from '../../types';

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
      const response = await fetch(`${this.BASE_URL}/generate`, {
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
   * Save recipe to user's collection (placeholder for future implementation)
   */
  static async saveRecipe(
    recipe: Recipe,
    userId: string
  ): Promise<RecipeServiceResponse<{ saved: boolean }>> {
    // TODO: Implement when user authentication and database are set up
    console.log('Saving recipe to local storage as placeholder');

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
   * Get saved recipes (placeholder for future implementation)
   */
  static async getSavedRecipes(userId: string): Promise<RecipeServiceResponse<Recipe[]>> {
    // TODO: Implement when user authentication and database are set up
    try {
      const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
      const userRecipes = savedRecipes.filter((r: any) => r.userId === userId);

      return {
        success: true,
        data: userRecipes,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to load saved recipes',
      };
    }
  }
}
