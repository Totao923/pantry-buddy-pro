import { Ingredient, IngredientCategory } from '../../types';

export interface CreateIngredientRequest {
  name: string;
  category: IngredientCategory;
  quantity?: string;
  unit?: string;
  expiryDate?: string;
  nutritionalValue?: number;
  isProtein?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
}

export interface UpdateIngredientRequest {
  name?: string;
  category?: IngredientCategory;
  quantity?: string;
  unit?: string;
  expiryDate?: string;
  nutritionalValue?: number;
  isProtein?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
}

export interface IngredientsResponse {
  success: boolean;
  ingredients?: Ingredient[];
  ingredient?: Ingredient;
  error?: string;
}

class IngredientService {
  private cache = new Map<string, { data: Ingredient[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getAllIngredients(): Promise<Ingredient[]> {
    try {
      // Check cache first
      const cached = this.cache.get('all');
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const response = await fetch('/api/ingredients');
      const data: IngredientsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ingredients');
      }

      const ingredients = data.ingredients || [];

      // Update cache
      this.cache.set('all', { data: ingredients, timestamp: Date.now() });

      return ingredients;
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  }

  async getIngredient(id: string): Promise<Ingredient> {
    try {
      const response = await fetch(`/api/ingredients/${id}`);
      const data: IngredientsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ingredient');
      }

      if (!data.ingredient) {
        throw new Error('Ingredient not found');
      }

      return data.ingredient;
    } catch (error) {
      console.error('Error fetching ingredient:', error);
      throw error;
    }
  }

  async createIngredient(ingredientData: CreateIngredientRequest): Promise<Ingredient> {
    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ingredientData),
      });

      if (!response.ok) {
        const errorData: IngredientsResponse = await response.json();
        throw new Error(errorData.error || 'Failed to create ingredient');
      }

      const data: IngredientsResponse = await response.json();

      if (!data.ingredient) {
        throw new Error('Created ingredient not returned');
      }

      const ingredient = data.ingredient;

      // Invalidate cache
      this.cache.delete('all');

      return ingredient;
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw error;
    }
  }

  async updateIngredient(id: string, updates: UpdateIngredientRequest): Promise<Ingredient> {
    try {
      const response = await fetch(`/api/ingredients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data: IngredientsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ingredient');
      }

      if (!data.ingredient) {
        throw new Error('Updated ingredient not returned');
      }

      // Invalidate cache
      this.cache.delete('all');

      return data.ingredient;
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/ingredients/${id}`, {
        method: 'DELETE',
      });

      const data: IngredientsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete ingredient');
      }

      // Invalidate cache
      this.cache.delete('all');
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }

  async clearAllIngredients(): Promise<void> {
    try {
      const response = await fetch('/api/ingredients', {
        method: 'DELETE',
      });

      const data: IngredientsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear ingredients');
      }

      // Invalidate cache
      this.cache.delete('all');
    } catch (error) {
      console.error('Error clearing ingredients:', error);
      throw error;
    }
  }

  // Utility methods
  getIngredientsByCategory(ingredients: Ingredient[]): Record<IngredientCategory, Ingredient[]> {
    const categories: Record<IngredientCategory, Ingredient[]> = {
      protein: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      spices: [],
      herbs: [],
      oils: [],
      pantry: [],
      other: [],
    };

    ingredients.forEach(ingredient => {
      categories[ingredient.category].push(ingredient);
    });

    return categories;
  }

  getExpiringSoon(ingredients: Ingredient[], daysThreshold = 7): Ingredient[] {
    const now = Date.now();
    const threshold = daysThreshold * 24 * 60 * 60 * 1000;

    return ingredients.filter(ingredient => {
      if (!ingredient.expiryDate) return false;
      const expiryTime = new Date(ingredient.expiryDate).getTime();
      return expiryTime - now <= threshold && expiryTime > now;
    });
  }

  getExpiredIngredients(ingredients: Ingredient[]): Ingredient[] {
    const now = Date.now();

    return ingredients.filter(ingredient => {
      if (!ingredient.expiryDate) return false;
      return new Date(ingredient.expiryDate).getTime() <= now;
    });
  }

  searchIngredients(ingredients: Ingredient[], query: string): Ingredient[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return ingredients;

    return ingredients.filter(
      ingredient =>
        ingredient.name.toLowerCase().includes(lowerQuery) ||
        ingredient.category.toLowerCase().includes(lowerQuery)
    );
  }

  filterByCategory(ingredients: Ingredient[], category: IngredientCategory | 'all'): Ingredient[] {
    if (category === 'all') return ingredients;
    return ingredients.filter(ingredient => ingredient.category === category);
  }

  filterByDietaryPreferences(
    ingredients: Ingredient[],
    preferences: { vegetarian?: boolean; vegan?: boolean; protein?: boolean }
  ): Ingredient[] {
    return ingredients.filter(ingredient => {
      if (preferences.vegetarian && !ingredient.isVegetarian) return false;
      if (preferences.vegan && !ingredient.isVegan) return false;
      if (preferences.protein && !ingredient.isProtein) return false;
      return true;
    });
  }

  // Batch operations
  async createMultipleIngredients(
    ingredientsData: CreateIngredientRequest[]
  ): Promise<Ingredient[]> {
    try {
      const results = await Promise.allSettled(
        ingredientsData.map(data => this.createIngredient(data))
      );

      const successful: Ingredient[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push(`${ingredientsData[index].name}: ${result.reason.message}`);
        }
      });

      if (failed.length > 0) {
        console.warn('Some ingredients failed to create:', failed);
      }

      return successful;
    } catch (error) {
      console.error('Error creating multiple ingredients:', error);
      throw error;
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const ingredientService = new IngredientService();
