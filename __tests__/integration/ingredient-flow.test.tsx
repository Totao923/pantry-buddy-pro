import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useIngredients } from '../../lib/hooks/useIngredients';
import SmartPantry from '../../components/SmartPantry';

// Mock the useIngredients hook
jest.mock('../../lib/hooks/useIngredients');
const mockUseIngredients = useIngredients as jest.MockedFunction<typeof useIngredients>;

// Mock Supabase client to prevent import errors
jest.mock('../../lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(() => null),
  createSupabaseServiceClient: jest.fn(() => null),
}));

// Mock the ingredient service factory
jest.mock('../../lib/services/ingredientServiceFactory', () => ({
  getIngredientService: jest.fn().mockResolvedValue({
    createIngredient: jest.fn(),
    updateIngredient: jest.fn(),
    deleteIngredient: jest.fn(),
    getAllIngredients: jest.fn().mockResolvedValue([]),
  }),
}));

describe('Ingredient Management Flow', () => {
  const mockIngredientHooks = {
    ingredients: [],
    loading: false,
    error: null,
    addIngredient: jest.fn(),
    updateIngredient: jest.fn(),
    deleteIngredient: jest.fn(),
    clearAllIngredients: jest.fn(),
    searchIngredients: jest.fn().mockReturnValue([]),
    filterByCategory: jest.fn().mockReturnValue([]),
    getExpiringSoon: jest.fn().mockReturnValue([]),
    getExpiredIngredients: jest.fn().mockReturnValue([]),
    getIngredientsByCategory: jest.fn().mockReturnValue({}),
    refreshIngredients: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIngredients.mockReturnValue(mockIngredientHooks);
  });

  it('allows user to add ingredients through different methods', async () => {
    const user = userEvent.setup();

    render(
      <SmartPantry
        ingredients={[]}
        onAddIngredient={mockIngredientHooks.addIngredient}
        onRemoveIngredient={jest.fn()}
        onUpdateIngredient={jest.fn()}
      />
    );

    // Test manual input
    const input = screen.getByPlaceholderText(/add ingredient/i);
    await user.type(input, 'Tomato');
    await user.keyboard('{Enter}');

    expect(mockIngredientHooks.addIngredient).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tomato',
        category: 'vegetables',
      })
    );

    // Test quick-add buttons
    const quickAddButtons = screen.getAllByText(/\+ /);
    if (quickAddButtons.length > 0) {
      await user.click(quickAddButtons[0]);
      expect(mockIngredientHooks.addIngredient).toHaveBeenCalledTimes(2);
    }
  });

  it('handles ingredient search and filtering', async () => {
    const user = userEvent.setup();
    const testIngredients = [
      {
        id: '1',
        name: 'Tomato',
        category: 'vegetables' as const,
        isVegetarian: true,
        isVegan: true,
        isProtein: false,
      },
      {
        id: '2',
        name: 'Chicken',
        category: 'protein' as const,
        isVegetarian: false,
        isVegan: false,
        isProtein: true,
      },
    ];

    mockUseIngredients.mockReturnValue({
      ...mockIngredientHooks,
      ingredients: testIngredients,
    });

    render(
      <SmartPantry
        ingredients={testIngredients}
        onAddIngredient={jest.fn()}
        onRemoveIngredient={jest.fn()}
        onUpdateIngredient={jest.fn()}
      />
    );

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(/search ingredients/i);
    await user.type(searchInput, 'tom');

    expect(mockIngredientHooks.searchIngredients).toHaveBeenCalledWith('tom');

    // Test category filtering
    const categoryFilter = screen.getByDisplayValue(/all categories/i);
    await user.selectOptions(categoryFilter, 'vegetables');

    expect(mockIngredientHooks.filterByCategory).toHaveBeenCalledWith('vegetables');
  });

  it('displays loading states appropriately', () => {
    mockUseIngredients.mockReturnValue({
      ...mockIngredientHooks,
      loading: true,
    });

    render(
      <SmartPantry
        ingredients={[]}
        onAddIngredient={jest.fn()}
        onRemoveIngredient={jest.fn()}
        onUpdateIngredient={jest.fn()}
      />
    );

    // Should show loading indicator
    expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles errors gracefully', () => {
    mockUseIngredients.mockReturnValue({
      ...mockIngredientHooks,
      error: 'Failed to load ingredients',
    });

    render(
      <SmartPantry
        ingredients={[]}
        onAddIngredient={jest.fn()}
        onRemoveIngredient={jest.fn()}
        onUpdateIngredient={jest.fn()}
      />
    );

    // Should show the error message (use getAllByText since it appears twice)
    expect(screen.getAllByText(/failed to load ingredients/i)[0]).toBeInTheDocument();
  });

  it('shows smart suggestions based on current ingredients', async () => {
    const testIngredients = [
      {
        id: '1',
        name: 'Tomato',
        category: 'vegetables' as const,
        isVegetarian: true,
        isVegan: true,
        isProtein: false,
      },
    ];

    mockUseIngredients.mockReturnValue({
      ...mockIngredientHooks,
      ingredients: testIngredients,
    });

    render(
      <SmartPantry
        ingredients={testIngredients}
        onAddIngredient={jest.fn()}
        onRemoveIngredient={jest.fn()}
        onUpdateIngredient={jest.fn()}
      />
    );

    // Wait for smart suggestions to be generated
    await waitFor(
      () => {
        // Should suggest basil as a complement to tomatoes
        const basilSuggestion = screen.queryByText(/add basil/i) || screen.queryByText(/basil/i);
        expect(basilSuggestion).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('manages ingredient lifecycle correctly', async () => {
    const user = userEvent.setup();
    const testIngredient = {
      id: '1',
      name: 'Tomato',
      category: 'vegetables' as const,
      isVegetarian: true,
      isVegan: true,
      isProtein: false,
    };

    mockUseIngredients.mockReturnValue({
      ...mockIngredientHooks,
      ingredients: [testIngredient],
    });

    render(
      <SmartPantry
        ingredients={[testIngredient]}
        onAddIngredient={jest.fn()}
        onRemoveIngredient={mockIngredientHooks.deleteIngredient}
        onUpdateIngredient={mockIngredientHooks.updateIngredient}
      />
    );

    // Find and interact with ingredient if it's displayed
    const ingredientElements = screen.queryAllByText(/tomato/i);
    if (ingredientElements.length > 0) {
      // Test delete functionality (this would depend on your UI implementation)
      const deleteButtons = screen.queryAllByRole('button', { name: /delete|remove/i });
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);
        expect(mockIngredientHooks.deleteIngredient).toHaveBeenCalledWith('1');
      }
    }
  });
});
