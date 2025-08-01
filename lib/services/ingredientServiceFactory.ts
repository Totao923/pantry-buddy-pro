import { ingredientService as mockIngredientService } from './ingredientService';
import { databaseIngredientService } from './databaseIngredientService';
import { isAuthEnabled } from '../config/environment';

export type IngredientServiceInterface = typeof mockIngredientService;

class IngredientServiceFactory {
  private _currentService: IngredientServiceInterface | null = null;
  private _initialized = false;

  async getService(): Promise<IngredientServiceInterface> {
    if (!this._initialized) {
      await this.initialize();
    }

    return this._currentService!;
  }

  private async initialize(): Promise<void> {
    try {
      // For now, always use mock service until user is authenticated
      // This allows the app to work in demo mode and during initial load
      console.log('Using mock ingredient service (demo mode)');
      this._currentService = mockIngredientService;
      this._initialized = true;

      // TODO: Switch to database service after user authentication
      // We can add a method to switch services when auth state changes
    } catch (error) {
      console.warn('Error initializing ingredient service, falling back to mock:', error);
      this._currentService = mockIngredientService;
      this._initialized = true;
    }
  }

  // Force re-initialization (useful for auth state changes)
  async reinitialize(): Promise<void> {
    this._initialized = false;
    this._currentService = null;
    await this.initialize();
  }

  // Get current service type for debugging
  getCurrentServiceType(): 'database' | 'mock' | 'unknown' {
    if (!this._currentService) return 'unknown';

    if (this._currentService === mockIngredientService) {
      return 'mock';
    } else {
      return 'database';
    }
  }

  // Check if database service is available
  async isDatabaseAvailable(): Promise<boolean> {
    try {
      return await databaseIngredientService.isAvailable();
    } catch {
      return false;
    }
  }

  // Switch to database service when user authenticates
  async switchToDatabaseService(): Promise<boolean> {
    try {
      const isDbAvailable = await databaseIngredientService.isAvailable();
      if (isDbAvailable) {
        console.log('Switching to database ingredient service');
        this._currentService = databaseIngredientService as any;
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to switch to database service:', error);
      return false;
    }
  }

  // Switch back to mock service (for demo mode or auth failure)
  switchToMockService(): void {
    console.log('Switching to mock ingredient service');
    this._currentService = mockIngredientService;
  }
}

export const ingredientServiceFactory = new IngredientServiceFactory();

// Export a convenience function to get the current service
export const getIngredientService = () => ingredientServiceFactory.getService();
