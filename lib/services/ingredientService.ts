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
  price?: number;
  priceSource?: 'receipt' | 'estimated';
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
  price?: number;
  priceSource?: 'receipt' | 'estimated';
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
  private mockIngredients: Ingredient[] = []; // In-memory storage for mock mode

  async getAllIngredients(): Promise<Ingredient[]> {
    try {
      // Check cache first
      const cached = this.cache.get('all');
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      // For mock service, return ingredients from in-memory storage
      const ingredients: Ingredient[] = [...this.mockIngredients];

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
      // Find ingredient in mock storage
      const ingredient = this.mockIngredients.find(item => item.id === id);

      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      return ingredient;
    } catch (error) {
      console.error('Error fetching ingredient:', error);
      throw error;
    }
  }

  async createIngredient(ingredientData: CreateIngredientRequest): Promise<Ingredient> {
    try {
      // Estimate price if not provided
      const price =
        ingredientData.price ?? this.estimatePrice(ingredientData.name, ingredientData.category);
      const priceSource =
        ingredientData.priceSource ?? (ingredientData.price ? 'receipt' : 'estimated');

      // Create ingredient with mock ID for demo mode
      const ingredient: Ingredient = {
        id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: ingredientData.name,
        category: ingredientData.category,
        quantity: ingredientData.quantity,
        unit: ingredientData.unit,
        expiryDate: ingredientData.expiryDate ? new Date(ingredientData.expiryDate) : undefined,
        nutritionalValue: ingredientData.nutritionalValue,
        isProtein: ingredientData.isProtein ?? false,
        isVegetarian: ingredientData.isVegetarian ?? true,
        isVegan: ingredientData.isVegan ?? true,
        price,
        priceSource,
      };

      // Add to in-memory storage
      this.mockIngredients.push(ingredient);

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
      // Find ingredient in mock storage
      const ingredientIndex = this.mockIngredients.findIndex(item => item.id === id);

      if (ingredientIndex === -1) {
        throw new Error('Ingredient not found');
      }

      // Update ingredient with new values
      const existingIngredient = this.mockIngredients[ingredientIndex];
      const updatedIngredient: Ingredient = {
        ...existingIngredient,
        ...updates,
        expiryDate: updates.expiryDate
          ? new Date(updates.expiryDate)
          : existingIngredient.expiryDate,
      };

      // Replace in mock storage
      this.mockIngredients[ingredientIndex] = updatedIngredient;

      // Invalidate cache
      this.cache.delete('all');

      return updatedIngredient;
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    try {
      // Find and remove ingredient from mock storage
      const ingredientIndex = this.mockIngredients.findIndex(item => item.id === id);

      if (ingredientIndex === -1) {
        throw new Error('Ingredient not found');
      }

      // Remove from mock storage
      this.mockIngredients.splice(ingredientIndex, 1);

      // Invalidate cache
      this.cache.delete('all');
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }

  async clearAllIngredients(): Promise<void> {
    try {
      // Clear all ingredients from mock storage
      this.mockIngredients = [];

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
      const successful: Ingredient[] = [];
      const failed: string[] = [];

      // Create ingredients one by one using the mock createIngredient method
      for (const data of ingredientsData) {
        try {
          const ingredient = await this.createIngredient(data);
          successful.push(ingredient);
        } catch (error) {
          failed.push(`${data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (failed.length > 0) {
        console.warn('Some ingredients failed to create:', failed);
      }

      return successful;
    } catch (error) {
      console.error('Error creating multiple ingredients:', error);
      throw error;
    }
  }

  async deductIngredientsForRecipe(
    recipeIngredients: any[],
    servingsCooked: number = 1
  ): Promise<{ success: boolean; deductions: any[]; insufficientItems: any[] }> {
    try {
      console.log(`Deducting ingredients for recipe (${servingsCooked} servings)`);

      const currentIngredients = await this.getAllIngredients();
      const deductions: any[] = [];
      const insufficientItems: any[] = [];

      for (const recipeIngredient of recipeIngredients) {
        const requiredAmount = recipeIngredient.amount * servingsCooked;
        console.log(
          `Looking for ${requiredAmount} ${recipeIngredient.unit} of ${recipeIngredient.name}`
        );

        // Find matching ingredient in pantry (case-insensitive)
        const pantryIngredient = currentIngredients.find(
          ing =>
            ing.name.toLowerCase().includes(recipeIngredient.name.toLowerCase()) ||
            recipeIngredient.name.toLowerCase().includes(ing.name.toLowerCase())
        );

        if (pantryIngredient) {
          const currentQuantity = parseFloat(pantryIngredient.quantity || '0');
          console.log(
            `Found ${pantryIngredient.name} with quantity ${currentQuantity} ${pantryIngredient.unit}`
          );

          if (currentQuantity >= requiredAmount) {
            // Sufficient quantity - deduct the amount
            const newQuantity = currentQuantity - requiredAmount;

            await this.updateIngredient(pantryIngredient.id, {
              quantity: newQuantity.toString(),
              name: pantryIngredient.name,
              category: pantryIngredient.category,
              unit: pantryIngredient.unit,
              expiryDate: pantryIngredient.expiryDate?.toString(),
              isProtein: pantryIngredient.isProtein || false,
              isVegetarian: pantryIngredient.isVegetarian || false,
              isVegan: pantryIngredient.isVegan || false,
            });

            deductions.push({
              ingredient: pantryIngredient.name,
              deducted: requiredAmount,
              unit: recipeIngredient.unit,
              remaining: newQuantity,
            });

            console.log(
              `✅ Deducted ${requiredAmount} ${recipeIngredient.unit} of ${pantryIngredient.name}, ${newQuantity} remaining`
            );
          } else {
            // Insufficient quantity
            insufficientItems.push({
              ingredient: recipeIngredient.name,
              required: requiredAmount,
              available: currentQuantity,
              unit: recipeIngredient.unit,
            });

            console.log(
              `❌ Insufficient ${pantryIngredient.name}: need ${requiredAmount}, have ${currentQuantity}`
            );
          }
        } else {
          // Ingredient not found in pantry
          insufficientItems.push({
            ingredient: recipeIngredient.name,
            required: requiredAmount,
            available: 0,
            unit: recipeIngredient.unit,
          });

          console.log(`❌ Ingredient not found in pantry: ${recipeIngredient.name}`);
        }
      }

      // Clear cache to ensure fresh data on next load
      this.clearCache();

      return {
        success: true,
        deductions,
        insufficientItems,
      };
    } catch (error) {
      console.error('Error deducting ingredients:', error);
      return {
        success: false,
        deductions: [],
        insufficientItems: [],
      };
    }
  }

  // Price estimation based on item name and category
  estimatePrice(itemName: string, category: IngredientCategory): number {
    const name = itemName.toLowerCase();

    // Category-based base pricing
    const categoryValues: Record<IngredientCategory, number> = {
      protein: 8.0,
      vegetables: 3.0,
      fruits: 4.0,
      dairy: 5.0,
      grains: 6.0,
      oils: 7.0,
      spices: 2.0,
      herbs: 3.0,
      pantry: 4.0,
      other: 3.0,
    };

    let basePrice = categoryValues[category] || 3.0;

    // Adjust for premium/organic keywords
    if (name.includes('organic') || name.includes('premium')) {
      basePrice *= 1.5;
    }

    // Specific item adjustments
    if (name.includes('bread') || name.includes('milk')) return Math.max(basePrice, 3.49);
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) {
      return Math.max(basePrice, 12.99);
    }
    if (name.includes('fish') || name.includes('salmon')) return Math.max(basePrice, 15.99);
    if (name.includes('cheese')) return Math.max(basePrice, 6.99);
    if (name.includes('olive oil')) return Math.max(basePrice, 9.99);
    if (name.includes('cereal') || name.includes('pasta') || name.includes('rice')) {
      return Math.max(basePrice, 5.49);
    }

    return basePrice;
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
