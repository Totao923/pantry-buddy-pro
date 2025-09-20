import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { Ingredient } from '../types';
import {
  getIngredientService,
  ingredientServiceFactory,
} from '../lib/services/ingredientServiceFactory';
import { useAuth } from '../lib/auth/AuthProvider';

interface IngredientsContextType {
  ingredients: Ingredient[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const IngredientsContext = createContext<IngredientsContextType | undefined>(undefined);

interface IngredientsProviderProps {
  children: ReactNode;
}

export const IngredientsProvider: React.FC<IngredientsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 IngredientsProvider: Loading ingredients...');
      console.log('🔄 IngredientsProvider: User state:', { hasUser: !!user, userId: user?.id });

      // Force factory re-initialization when user state changes
      if (user) {
        console.log('🔄 IngredientsProvider: User authenticated, forcing factory re-init...');
        await ingredientServiceFactory.reinitialize();
      }

      const ingredientService = await getIngredientService();
      let userIngredients = await ingredientService.getAllIngredients();

      // TEMPORARY FIX: If no ingredients from service, try direct API call
      if (userIngredients.length === 0) {
        console.log('🔄 IngredientsProvider: No ingredients from service, trying direct API...');
        try {
          const response = await fetch('/api/get-user-ingredients');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.ingredients) {
              userIngredients = data.ingredients;
              console.log(
                '✅ IngredientsProvider: Loaded from direct API:',
                userIngredients.length
              );
            }
          }
        } catch (error) {
          console.warn('⚠️ Direct API call failed:', error);
        }
      }

      console.log('✅ IngredientsProvider: Loaded ingredients:', {
        count: userIngredients.length,
        service: 'Service Factory',
        serviceType: ingredientServiceFactory.getCurrentServiceType(),
      });

      setIngredients(userIngredients);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ingredients';
      console.error('❌ IngredientsProvider: Error loading ingredients:', err);
      setError(errorMessage);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const refetch = useCallback(async () => {
    await loadIngredients();
  }, [loadIngredients]);

  const value: IngredientsContextType = useMemo(
    () => ({
      ingredients,
      loading,
      error,
      refetch,
    }),
    [ingredients, loading, error, refetch]
  );

  return <IngredientsContext.Provider value={value}>{children}</IngredientsContext.Provider>;
};

export const useIngredients = (): IngredientsContextType => {
  const context = useContext(IngredientsContext);
  if (context === undefined) {
    throw new Error('useIngredients must be used within an IngredientsProvider');
  }
  return context;
};
