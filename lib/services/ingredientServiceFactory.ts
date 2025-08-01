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
      // Check if authentication is enabled and database is available
      if (isAuthEnabled()) {
        const isDbAvailable = await databaseIngredientService.isAvailable();

        if (isDbAvailable) {
          console.log('Using database ingredient service');
          this._currentService = databaseIngredientService as any;
          this._initialized = true;
          return;
        } else {
          console.warn('Database ingredient service not available, falling back to mock service');
        }
      }

      // Fallback to mock service
      console.log('Using mock ingredient service');
      this._currentService = mockIngredientService;
      this._initialized = true;
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
}

export const ingredientServiceFactory = new IngredientServiceFactory();

// Export a convenience function to get the current service
export const getIngredientService = () => ingredientServiceFactory.getService();
