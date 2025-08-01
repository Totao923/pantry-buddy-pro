import React, { ReactElement } from 'react';
import { render, RenderOptions, screen } from '@testing-library/react';
import { AuthProvider } from '../../lib/auth/AuthProvider';

// Mock AuthProvider for testing
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="mock-auth-provider">{children}</div>;
};

// Create a custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MockAuthProvider>
      {children}
    </MockAuthProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Test data factories
export const createMockIngredient = (overrides = {}) => ({
  id: '1',
  name: 'Test Ingredient',
  category: 'other' as const,
  isVegetarian: true,
  isVegan: true,
  isProtein: false,
  ...overrides,
});

export const createMockRecipe = (overrides = {}) => ({
  id: '1',
  title: 'Test Recipe',
  description: 'A test recipe',
  ingredients: [
    { name: 'Test Ingredient', amount: 1, unit: 'cup' }
  ],
  instructions: ['Step 1: Test'],
  prepTime: 10,
  cookTime: 20,
  totalTime: 30,
  servings: 4,
  difficulty: 'Easy' as const,
  cuisine: 'american' as const,
  tags: [],
  nutritionInfo: {
    calories: 200,
    protein: 10,
    carbs: 20,
    fat: 5,
    fiber: 3,
    sugar: 2,
  },
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  preferences: {
    dietaryRestrictions: [],
    favoritesCuisines: ['italian'],
    allergies: [],
    spiceLevel: 'medium' as const,
    cookingTime: 'medium' as const,
    servingSize: 4,
    budgetRange: 'medium' as const,
  },
  subscription: 'free' as const,
  savedRecipes: [],
  mealPlans: [],
  pantry: [],
  ...overrides,
});

// Helper functions for testing
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  
  return localStorageMock;
};

export const mockSessionStorage = () => {
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
  
  return sessionStorageMock;
};

// Mock environment setup
export const mockEnvironment = (env: 'development' | 'test' | 'production' = 'test') => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  
  return () => {
    process.env.NODE_ENV = originalEnv;
  };
};

// Async testing helpers
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Form testing helpers
export const fillForm = async (fields: Record<string, string>, user: any) => {
  for (const [label, value] of Object.entries(fields)) {
    const field = screen.getByLabelText(new RegExp(label, 'i')) || 
                  screen.getByPlaceholderText(new RegExp(label, 'i'));
    await user.clear(field);
    await user.type(field, value);
  }
};

// Error boundary for testing
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Test Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Something went wrong</div>;
    }

    return this.props.children;
  }
}

// Screen size testing helpers
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });
  window.dispatchEvent(new Event('resize'));
};

export const setDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });
  window.dispatchEvent(new Event('resize'));
};

// Dummy test to prevent "no tests" error
describe('test-utils', () => {
  it('exports helper functions', () => {
    expect(typeof customRender).toBe('function');
    expect(typeof createMockIngredient).toBe('function');
    expect(typeof createMockRecipe).toBe('function');
  });
});