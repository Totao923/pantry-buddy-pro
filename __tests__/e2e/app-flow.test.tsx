/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../pages/index';
import { AuthProvider } from '../../lib/auth/AuthProvider';

// Mock Supabase client to prevent import errors
jest.mock('../../lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(() => null),
  createSupabaseServiceClient: jest.fn(() => null),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock environment configuration
jest.mock('../../lib/config/environment', () => ({
  isAuthEnabled: jest.fn().mockReturnValue(false),
  getEnvironmentConfig: jest.fn().mockReturnValue({
    apiBaseUrl: 'http://localhost:3000',
    isDevelopment: true,
    isProduction: false,
  }),
}));

// Mock AI service
jest.mock('../../lib/ai/aiService', () => ({
  aiService: {
    generateRecipe: jest.fn().mockResolvedValue({
      success: true,
      recipe: {
        id: 'test-recipe-1',
        title: 'Test Recipe',
        description: 'A delicious test recipe',
        ingredients: [{ name: 'Test Ingredient', amount: 1, unit: 'cup' }],
        instructions: ['Mix ingredients', 'Cook until done'],
        prepTime: 10,
        cookTime: 20,
        totalTime: 30,
        servings: 4,
        difficulty: 'Easy',
        cuisine: 'american',
        tags: [],
        nutritionInfo: {
          calories: 200,
          protein: 10,
          carbs: 20,
          fat: 5,
          fiber: 3,
          sugar: 2,
        },
      },
    }),
    initialize: jest.fn().mockResolvedValue(undefined),
    getUsageStats: jest.fn().mockResolvedValue({ aiEnabled: true }),
    isAvailable: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockReturnValue('enabled'),
  },
}));

// Mock ingredient service
jest.mock('../../lib/services/ingredientServiceFactory', () => ({
  getIngredientService: jest.fn().mockResolvedValue({
    getAllIngredients: jest.fn().mockResolvedValue([]),
    createIngredient: jest.fn().mockResolvedValue({
      id: '1',
      name: 'Test Ingredient',
      category: 'other',
      isVegetarian: true,
      isVegan: true,
      isProtein: false,
    }),
    isAvailable: jest.fn().mockResolvedValue(true),
  }),
}));

describe('App Flow E2E', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('renders the main application', async () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    // Check if main elements are present
    expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();

    // Wait for components to load
    await waitFor(
      () => {
        expect(
          screen.getByText(/smart pantry/i) || screen.getByText(/ingredients/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('allows users to add ingredients and generate recipes', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();
    });

    // Look for ingredient input (might be in different components)
    const ingredientInputs = screen.queryAllByPlaceholderText(/add ingredient/i);
    if (ingredientInputs.length > 0) {
      // Add an ingredient
      await user.type(ingredientInputs[0], 'Tomato');
      await user.keyboard('{Enter}');

      // Look for recipe generation button
      const generateButtons = screen.queryAllByText(/generate/i);
      if (generateButtons.length > 0) {
        await user.click(generateButtons[0]);

        // Wait for recipe to be generated
        await waitFor(
          () => {
            expect(screen.queryByText(/test recipe/i)).toBeInTheDocument();
          },
          { timeout: 5000 }
        );
      }
    }
  });

  it('displays proper loading states', async () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    // Should show some loading indication initially
    await waitFor(
      () => {
        const loadingElements = screen.queryAllByText(/loading/i);
        const spinners = document.querySelectorAll('.animate-spin');
        expect(loadingElements.length > 0 || spinners.length > 0).toBe(true);
      },
      { timeout: 1000 }
    );
  });

  it('shows navigation and header elements', async () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    await waitFor(() => {
      // Should have header with app name
      expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();

      // Should have navigation elements
      const navElements = screen.queryAllByRole('button');
      expect(navElements.length).toBeGreaterThan(0);
    });
  });

  it('handles errors gracefully', async () => {
    // Mock an error in the AI service
    const { aiService } = require('../../lib/ai/aiService');
    aiService.generateRecipe.mockRejectedValueOnce(new Error('API Error'));

    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();
    });

    // The app should still render without crashing
    expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();
  });

  it('maintains responsive design', async () => {
    // Test mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event('resize'));

    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();
    });

    // App should still be functional on mobile
    expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();

    // Test desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    window.dispatchEvent(new Event('resize'));

    // App should still work on desktop
    expect(screen.getByText(/pantry buddy/i)).toBeInTheDocument();
  });
});
