import { useState, useEffect, useCallback } from 'react';
import { Ingredient, IngredientCategory } from '../../types';
import { getIngredientService } from '../services/ingredientServiceFactory';

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

export interface UseIngredientsResult {
  ingredients: Ingredient[];
  loading: boolean;
  error: string | null;
  refreshIngredients: () => Promise<void>;
  addIngredient: (ingredientData: CreateIngredientRequest) => Promise<Ingredient>;
  updateIngredient: (id: string, updates: UpdateIngredientRequest) => Promise<Ingredient>;
  deleteIngredient: (id: string) => Promise<void>;
  clearAllIngredients: () => Promise<void>;
  searchIngredients: (query: string) => Ingredient[];
  filterByCategory: (category: IngredientCategory | 'all') => Ingredient[];
  getExpiringSoon: (daysThreshold?: number) => Ingredient[];
  getExpiredIngredients: () => Ingredient[];
  getIngredientsByCategory: () => Record<IngredientCategory, Ingredient[]>;
}

export function useIngredients(): UseIngredientsResult {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshIngredients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const service = await getIngredientService();
      const fetchedIngredients = await service.getAllIngredients();
      setIngredients(fetchedIngredients);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ingredients';
      setError(errorMessage);
      console.error('Error fetching ingredients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addIngredient = useCallback(
    async (ingredientData: CreateIngredientRequest): Promise<Ingredient> => {
      try {
        setError(null);
        const service = await getIngredientService();
        const newIngredient = await service.createIngredient(ingredientData);
        setIngredients(prev => [...prev, newIngredient]);
        return newIngredient;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add ingredient';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const updateIngredient = useCallback(
    async (id: string, updates: UpdateIngredientRequest): Promise<Ingredient> => {
      try {
        setError(null);
        const service = await getIngredientService();
        const updatedIngredient = await service.updateIngredient(id, updates);
        setIngredients(prev =>
          prev.map(ingredient => (ingredient.id === id ? updatedIngredient : ingredient))
        );
        return updatedIngredient;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update ingredient';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const deleteIngredient = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      const service = await getIngredientService();
      await service.deleteIngredient(id);
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete ingredient';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearAllIngredients = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const service = await getIngredientService();
      await service.clearAllIngredients();
      setIngredients([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear ingredients';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Search and filter functions (these work on local data and are synchronous)
  const searchIngredients = useCallback(
    (query: string): Ingredient[] => {
      const lowerQuery = query.toLowerCase().trim();
      if (!lowerQuery) return ingredients;

      return ingredients.filter(
        ingredient =>
          ingredient.name.toLowerCase().includes(lowerQuery) ||
          ingredient.category.toLowerCase().includes(lowerQuery)
      );
    },
    [ingredients]
  );

  const filterByCategory = useCallback(
    (category: IngredientCategory | 'all'): Ingredient[] => {
      if (category === 'all') return ingredients;
      return ingredients.filter(ingredient => ingredient.category === category);
    },
    [ingredients]
  );

  const getExpiringSoon = useCallback(
    (daysThreshold = 7): Ingredient[] => {
      const now = Date.now();
      const threshold = daysThreshold * 24 * 60 * 60 * 1000;

      return ingredients.filter(ingredient => {
        if (!ingredient.expiryDate) return false;
        const expiryTime = new Date(ingredient.expiryDate).getTime();
        return expiryTime - now <= threshold && expiryTime > now;
      });
    },
    [ingredients]
  );

  const getExpiredIngredients = useCallback((): Ingredient[] => {
    const now = Date.now();

    return ingredients.filter(ingredient => {
      if (!ingredient.expiryDate) return false;
      return new Date(ingredient.expiryDate).getTime() <= now;
    });
  }, [ingredients]);

  const getIngredientsByCategory = useCallback((): Record<IngredientCategory, Ingredient[]> => {
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
  }, [ingredients]);

  // Load ingredients on mount
  useEffect(() => {
    refreshIngredients();
  }, [refreshIngredients]);

  return {
    ingredients,
    loading,
    error,
    refreshIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    clearAllIngredients,
    searchIngredients,
    filterByCategory,
    getExpiringSoon,
    getExpiredIngredients,
    getIngredientsByCategory,
  };
}
