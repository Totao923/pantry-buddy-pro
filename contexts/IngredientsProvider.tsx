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
import { getIngredientService } from '../lib/services/ingredientServiceFactory';

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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 IngredientsProvider: Loading ingredients...');

      const ingredientService = await getIngredientService();
      const userIngredients = await ingredientService.getAllIngredients();

      console.log('✅ IngredientsProvider: Loaded ingredients:', {
        count: userIngredients.length,
        service: ingredientService.constructor.name,
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
  }, []);

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
