import { ingredientService } from '../../../lib/services/ingredientService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('IngredientService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Clear cache before each test
    ingredientService.clearCache();
  });

  describe('getAllIngredients', () => {
    it('fetches ingredients from API', async () => {
      const mockIngredients = [
        {
          id: '1',
          name: 'Tomato',
          category: 'vegetables',
          isVegetarian: true,
          isVegan: true,
          isProtein: false,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          ingredients: mockIngredients,
        }),
      });

      const ingredients = await ingredientService.getAllIngredients();

      expect(mockFetch).toHaveBeenCalledWith('/api/ingredients');
      expect(ingredients).toEqual(mockIngredients);
    });

    it('throws error when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      await expect(ingredientService.getAllIngredients()).rejects.toThrow('Server error');
    });

    it('uses cache when available', async () => {
      const mockIngredients = [
        {
          id: '1',
          name: 'Tomato',
          category: 'vegetables',
          isVegetarian: true,
          isVegan: true,
          isProtein: false,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          ingredients: mockIngredients,
        }),
      });

      // First call
      await ingredientService.getAllIngredients();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await ingredientService.getAllIngredients();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('createIngredient', () => {
    it('creates ingredient via API', async () => {
      const ingredientData = {
        name: 'Carrot',
        category: 'vegetables' as const,
        isVegetarian: true,
        isVegan: true,
        isProtein: false,
      };

      const createdIngredient = {
        id: '1',
        ...ingredientData,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          ingredient: createdIngredient,
        }),
      });

      const result = await ingredientService.createIngredient(ingredientData);

      expect(mockFetch).toHaveBeenCalledWith('/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ingredientData),
      });
      expect(result).toEqual(createdIngredient);
    });

    it('throws error when creation fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Creation failed'));

      await expect(
        ingredientService.createIngredient({
          name: 'Test',
          category: 'other',
        })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('updateIngredient', () => {
    it('updates ingredient via API', async () => {
      const updates = {
        name: 'Updated Tomato',
        quantity: '2 cups',
      };

      const updatedIngredient = {
        id: '1',
        name: 'Updated Tomato',
        category: 'vegetables' as const,
        quantity: '2 cups',
        isVegetarian: true,
        isVegan: true,
        isProtein: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          ingredient: updatedIngredient,
        }),
      });

      const result = await ingredientService.updateIngredient('1', updates);

      expect(mockFetch).toHaveBeenCalledWith('/api/ingredients/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updatedIngredient);
    });
  });

  describe('deleteIngredient', () => {
    it('deletes ingredient via API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      await ingredientService.deleteIngredient('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/ingredients/1', {
        method: 'DELETE',
      });
    });

    it('throws error when deletion fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Deletion failed'));

      await expect(ingredientService.deleteIngredient('1')).rejects.toThrow('Deletion failed');
    });
  });
});
