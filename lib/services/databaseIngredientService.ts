import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';
import { Ingredient, IngredientCategory } from '../../types';
import type { Database } from '../supabase/types';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;
type PantryItem = Database['public']['Tables']['pantry_items']['Row'];
type PantryItemInsert = Database['public']['Tables']['pantry_items']['Insert'];
type PantryItemUpdate = Database['public']['Tables']['pantry_items']['Update'];

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

export interface IngredientSuggestion {
  name: string;
  category: IngredientCategory;
  nutritionalValue?: number;
  isProtein: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  commonUnits: string[];
  storageTips?: string;
}

class DatabaseIngredientService {
  private supabase: SupabaseClient | null = null;
  private cache = new Map<string, { data: Ingredient[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  private convertPantryItemToIngredient(item: PantryItem): Ingredient {
    return {
      id: item.id,
      name: item.name,
      category: item.category as IngredientCategory,
      quantity: item.quantity?.toString(),
      unit: item.unit || undefined,
      expiryDate: item.expiry_date ? new Date(item.expiry_date) : undefined,
      nutritionalValue: item.nutritional_value || undefined,
      isProtein: item.category === 'protein', // Derive from category since DB column doesn't exist
      isVegetarian: item.category !== 'protein', // Derive from category
      isVegan: !['dairy', 'protein'].includes(item.category), // Derive from category
      price: (item as any).price || undefined,
    };
  }

  private convertIngredientToPantryItem(
    ingredient: CreateIngredientRequest | UpdateIngredientRequest,
    userId: string
  ): PantryItemInsert | PantryItemUpdate {
    return {
      user_id: userId,
      name: ingredient.name,
      category: ingredient.category,
      quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null,
      unit: ingredient.unit || null,
      expiry_date: ingredient.expiryDate || null,
      nutritional_value: ingredient.nutritionalValue || null,
      price: ingredient.price || null,
    } as any;
  }

  async getAllIngredients(): Promise<Ingredient[]> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      // Check cache first
      const cached = this.cache.get(`user_${userId}`);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items')
          .select('*')
          .eq('user_id', userId)
          .order('name');
      });

      if (error) {
        const handled = handleSupabaseError(error, 'fetching ingredients');
        throw new Error(handled.message);
      }

      const ingredients = (data || []).map((item: PantryItem) =>
        this.convertPantryItemToIngredient(item)
      );

      // Update cache
      this.cache.set(`user_${userId}`, { data: ingredients, timestamp: Date.now() });

      return ingredients;
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  }

  async getIngredient(id: string): Promise<Ingredient> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'fetching ingredient');
        throw new Error(handled.message);
      }

      if (!data) {
        throw new Error('Ingredient not found');
      }

      return this.convertPantryItemToIngredient(data);
    } catch (error) {
      console.error('Error fetching ingredient:', error);
      throw error;
    }
  }

  async createIngredient(ingredientData: CreateIngredientRequest): Promise<Ingredient> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();
      const pantryItem = this.convertIngredientToPantryItem(
        ingredientData,
        userId
      ) as PantryItemInsert;

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items').insert([pantryItem]).select().single();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'creating ingredient');
        throw new Error(handled.message);
      }

      if (!data) {
        throw new Error('Failed to create ingredient');
      }

      // Invalidate cache
      this.cache.delete(`user_${userId}`);

      return this.convertPantryItemToIngredient(data);
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw error;
    }
  }

  async updateIngredient(id: string, updates: UpdateIngredientRequest): Promise<Ingredient> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();
      const updateData = this.convertIngredientToPantryItem(updates, userId) as PantryItemUpdate;

      // Remove user_id from update data since it shouldn't change
      delete updateData.user_id;

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'updating ingredient');
        throw new Error(handled.message);
      }

      if (!data) {
        throw new Error('Ingredient not found or not updated');
      }

      // Invalidate cache
      this.cache.delete(`user_${userId}`);

      return this.convertPantryItemToIngredient(data);
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'deleting ingredient');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`user_${userId}`);
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }

  async clearAllIngredients(): Promise<void> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items').delete().eq('user_id', userId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'clearing ingredients');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`user_${userId}`);
    } catch (error) {
      console.error('Error clearing ingredients:', error);
      throw error;
    }
  }

  async getIngredientSuggestions(
    searchTerm = '',
    categoryFilter: IngredientCategory | 'all' = 'all',
    dietaryFilter: 'all' | 'vegan' | 'vegetarian' | 'protein' = 'all',
    limit = 10
  ): Promise<IngredientSuggestion[]> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const { data, error } = await withRetry(async () => {
        return await this.supabase!.rpc('get_ingredient_suggestions', {
          search_term: searchTerm,
          category_filter: categoryFilter,
          dietary_filter: dietaryFilter,
          limit_count: limit,
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'fetching ingredient suggestions');
        throw new Error(handled.message);
      }

      return (data || []).map((item: any) => ({
        name: item.name,
        category: item.category as IngredientCategory,
        nutritionalValue: item.nutritional_value,
        isProtein: item.is_protein,
        isVegetarian: item.is_vegetarian,
        isVegan: item.is_vegan,
        commonUnits: item.common_units || [],
        storageTips: item.storage_tips,
      }));
    } catch (error) {
      console.error('Error fetching ingredient suggestions:', error);
      // Return empty array on error rather than throwing
      return [];
    }
  }

  // Utility methods (same as before but using database data)
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
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();
      const pantryItems = ingredientsData.map(data =>
        this.convertIngredientToPantryItem(data, userId)
      ) as PantryItemInsert[];

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('pantry_items').insert(pantryItems).select();
      });

      if (error) {
        const handled = handleSupabaseError(error, 'creating multiple ingredients');
        throw new Error(handled.message);
      }

      // Invalidate cache
      this.cache.delete(`user_${userId}`);

      return (data || []).map((item: PantryItem) => this.convertPantryItemToIngredient(item));
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

  // Health check
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.supabase) return false;

      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      // Test basic query
      const { error } = await this.supabase.from('pantry_items').select('id').limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

export const databaseIngredientService = new DatabaseIngredientService();
