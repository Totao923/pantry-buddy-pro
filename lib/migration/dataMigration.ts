import { createSupabaseClient, handleSupabaseError } from '../supabase/client';
import { Database } from '../supabase/types';
import { isDatabaseEnabled } from '../config/environment';
import CryptoJS from 'crypto-js';

type Tables = Database['public']['Tables'];
type UserProfile = Tables['user_profiles']['Insert'];
type PantryItem = Tables['pantry_items']['Insert'];
type Recipe = Tables['recipes']['Insert'];
type RecipeRating = Tables['recipe_ratings']['Insert'];

interface LocalStorageData {
  appState?: any;
  pantryInventory?: any;
  recipeRatings?: any;
  recipeReviews?: any;
  userPreferences?: any;
  aiUsageStats?: any;
}

interface MigrationResult {
  success: boolean;
  migratedItems: {
    userProfile: boolean;
    pantryItems: number;
    recipes: number;
    ratings: number;
    preferences: boolean;
  };
  errors: string[];
}

export class DataMigrationService {
  private supabase = createSupabaseClient();
  private encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-for-development-only';

  // Check if migration is needed
  async needsMigration(userId: string): Promise<boolean> {
    if (!isDatabaseEnabled()) return false;
    
    try {
      // Check if user profile exists in Supabase
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      // If no profile exists, check if localStorage has data
      if (!profile) {
        const localData = this.getLocalStorageData();
        return Object.keys(localData).length > 0;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  // Get all localStorage data
  private getLocalStorageData(): LocalStorageData {
    const data: LocalStorageData = {};
    
    try {
      const appState = localStorage.getItem('pantryBuddyState');
      if (appState) data.appState = JSON.parse(appState);
      
      const pantryInventory = localStorage.getItem('pantryInventory');
      if (pantryInventory) data.pantryInventory = JSON.parse(pantryInventory);
      
      const recipeRatings = localStorage.getItem('recipeRatings');
      if (recipeRatings) data.recipeRatings = JSON.parse(recipeRatings);
      
      const recipeReviews = localStorage.getItem('recipeReviews');
      if (recipeReviews) data.recipeReviews = JSON.parse(recipeReviews);
      
      const userPreferences = localStorage.getItem('userPreferences');
      if (userPreferences) data.userPreferences = JSON.parse(userPreferences);
      
      const aiUsageStats = localStorage.getItem('aiUsageStats');
      if (aiUsageStats) data.aiUsageStats = JSON.parse(aiUsageStats);
    } catch (error) {
      console.error('Error reading localStorage data:', error);
    }
    
    return data;
  }

  // Encrypt sensitive data
  private encryptData(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
  }

  // Migrate user profile and preferences
  private async migrateUserProfile(userId: string, localData: LocalStorageData): Promise<boolean> {
    try {
      const appState = localData.appState;
      const userPreferences = localData.userPreferences;
      
      if (!appState?.user && !userPreferences) return false;
      
      const user = appState?.user || {};
      const preferences = userPreferences || user.preferences || {};
      
      const userProfile: UserProfile = {
        id: userId,
        email: user.email || '',
        name: user.name || 'User',
        subscription_tier: user.subscription || 'free',
        preferences: {
          dietary_restrictions: preferences.dietaryRestrictions || [],
          favorite_cuisines: preferences.favoritesCuisines || [],
          allergies: preferences.allergies || [],
          spice_level: preferences.spiceLevel || 'medium',
          cooking_time_preference: preferences.cookingTime || 'medium',
          default_serving_size: preferences.servingSize || 4,
          budget_range: preferences.budgetRange || 'medium',
          experience_level: 'intermediate'
        },
        settings: {
          notifications_enabled: true,
          email_reminders: true,
          theme: 'light',
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await this.supabase
        .from('user_profiles')
        .insert(userProfile);
      
      if (error) {
        console.error('Error migrating user profile:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in migrateUserProfile:', error);
      return false;
    }
  }

  // Migrate pantry items
  private async migratePantryItems(userId: string, localData: LocalStorageData): Promise<number> {
    try {
      const pantryInventory = localData.pantryInventory;
      if (!pantryInventory?.items?.length) return 0;
      
      const pantryItems: PantryItem[] = pantryInventory.items.map((item: any) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        category: item.category,
        quantity: item.quantity || 1,
        unit: item.unit || 'piece',
        purchase_date: item.purchaseDate ? new Date(item.purchaseDate).toISOString() : null,
        expiry_date: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
        location: item.location || 'pantry',
        notes: item.notes || '',
        is_running_low: item.isRunningLow || false,
        minimum_quantity: item.minimumQuantity || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await this.supabase
        .from('pantry_items')
        .insert(pantryItems);
      
      if (error) {
        console.error('Error migrating pantry items:', error);
        return 0;
      }
      
      return pantryItems.length;
    } catch (error) {
      console.error('Error in migratePantryItems:', error);
      return 0;
    }
  }

  // Migrate recipes and ratings
  private async migrateRecipesAndRatings(userId: string, localData: LocalStorageData): Promise<{ recipes: number; ratings: number }> {
    try {
      const appState = localData.appState;
      const recipeRatings = localData.recipeRatings || {};
      const recipeReviews = localData.recipeReviews || {};
      
      let recipesCount = 0;
      let ratingsCount = 0;
      
      // Migrate generated recipes
      if (appState?.generatedRecipes?.length) {
        const recipes: Recipe[] = appState.generatedRecipes.map((recipe: any) => ({
          id: recipe.id,
          user_id: userId,
          title: recipe.title,
          description: recipe.description || '',
          cuisine_type: recipe.cuisine || 'any',
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          prep_time: recipe.prepTime || 0,
          cook_time: recipe.cookTime || 0,
          total_time: recipe.totalTime || 0,
          servings: recipe.servings || 4,
          difficulty: recipe.difficulty || 'medium',
          nutrition_info: recipe.nutritionInfo || null,
          tags: recipe.tags || [],
          is_favorite: appState.user?.savedRecipes?.includes(recipe.id) || false,
          source: 'generated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: recipesError } = await this.supabase
          .from('recipes')
          .insert(recipes);
        
        if (!recipesError) {
          recipesCount = recipes.length;
        } else {
          console.error('Error migrating recipes:', recipesError);
        }
      }
      
      // Migrate ratings and reviews
      const ratings: RecipeRating[] = [];
      
      Object.entries(recipeRatings).forEach(([recipeId, rating]: [string, any]) => {
        const review = recipeReviews[recipeId];
        
        ratings.push({
          id: `${userId}-${recipeId}`,
          user_id: userId,
          recipe_id: recipeId,
          overall_rating: rating.overall || 5,
          taste_rating: rating.taste || 5,
          ease_rating: rating.ease || 5,
          time_rating: rating.time || 5,
          review_text: review?.text || null,
          would_make_again: rating.wouldMakeAgain ?? true,
          cooking_notes: review?.notes || null,
          created_at: rating.createdAt ? new Date(rating.createdAt).toISOString() : new Date().toISOString(),
          updated_at: rating.updatedAt ? new Date(rating.updatedAt).toISOString() : new Date().toISOString()
        });
      });
      
      if (ratings.length > 0) {
        const { error: ratingsError } = await this.supabase
          .from('recipe_ratings')
          .insert(ratings);
        
        if (!ratingsError) {
          ratingsCount = ratings.length;
        } else {
          console.error('Error migrating ratings:', ratingsError);
        }
      }
      
      return { recipes: recipesCount, ratings: ratingsCount };
    } catch (error) {
      console.error('Error in migrateRecipesAndRatings:', error);
      return { recipes: 0, ratings: 0 };
    }
  }

  // Main migration function
  async migrateData(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedItems: {
        userProfile: false,
        pantryItems: 0,
        recipes: 0,
        ratings: 0,
        preferences: false
      },
      errors: []
    };
    
    if (!isDatabaseEnabled()) {
      result.errors.push('Database is not enabled');
      return result;
    }
    
    try {
      const localData = this.getLocalStorageData();
      
      if (Object.keys(localData).length === 0) {
        result.errors.push('No local data found to migrate');
        return result;
      }
      
      // Migrate user profile
      const profileMigrated = await this.migrateUserProfile(userId, localData);
      result.migratedItems.userProfile = profileMigrated;
      result.migratedItems.preferences = profileMigrated;
      
      if (!profileMigrated) {
        result.errors.push('Failed to migrate user profile');
      }
      
      // Migrate pantry items
      const pantryItemsCount = await this.migratePantryItems(userId, localData);
      result.migratedItems.pantryItems = pantryItemsCount;
      
      // Migrate recipes and ratings
      const { recipes, ratings } = await this.migrateRecipesAndRatings(userId, localData);
      result.migratedItems.recipes = recipes;
      result.migratedItems.ratings = ratings;
      
      // Success if at least one item was migrated
      result.success = profileMigrated || pantryItemsCount > 0 || recipes > 0 || ratings > 0;
      
      if (result.success) {
        // Create backup of localStorage data
        await this.createBackup(userId, localData);
        
        // Optionally clear localStorage after successful migration
        // this.clearLocalStorageData();
      }
      
    } catch (error) {
      console.error('Migration error:', error);
      result.errors.push(`Migration failed: ${error}`);
    }
    
    return result;
  }

  // Create backup of localStorage data
  private async createBackup(userId: string, localData: LocalStorageData): Promise<void> {
    try {
      const backupData = {
        user_id: userId,
        backup_data: this.encryptData(localData),
        created_at: new Date().toISOString()
      };
      
      await this.supabase
        .from('data_backups')
        .insert(backupData);
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  // Clear localStorage data (use with caution)
  private clearLocalStorageData(): void {
    const keys = [
      'pantryBuddyState',
      'pantryInventory',
      'recipeRatings',
      'recipeReviews',
      'userPreferences',
      'aiUsageStats'
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Get migration status
  async getMigrationStatus(userId: string): Promise<{
    hasProfile: boolean;
    pantryItemsCount: number;
    recipesCount: number;
    ratingsCount: number;
  }> {
    try {
      const [profileResult, pantryResult, recipesResult, ratingsResult] = await Promise.all([
        this.supabase.from('user_profiles').select('id').eq('id', userId).single(),
        this.supabase.from('pantry_items').select('id', { count: 'exact' }).eq('user_id', userId),
        this.supabase.from('recipes').select('id', { count: 'exact' }).eq('user_id', userId),
        this.supabase.from('recipe_ratings').select('id', { count: 'exact' }).eq('user_id', userId)
      ]);
      
      return {
        hasProfile: !!profileResult.data,
        pantryItemsCount: pantryResult.count || 0,
        recipesCount: recipesResult.count || 0,
        ratingsCount: ratingsResult.count || 0
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        hasProfile: false,
        pantryItemsCount: 0,
        recipesCount: 0,
        ratingsCount: 0
      };
    }
  }

  // Sync data from Supabase to localStorage (reverse migration)
  async syncFromSupabase(userId: string): Promise<boolean> {
    try {
      if (!isDatabaseEnabled()) return false;
      
      // Get user profile and preferences
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        // Update localStorage with Supabase data
        const appState = {
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            subscription: profile.subscription_tier,
            preferences: {
              dietaryRestrictions: profile.preferences?.dietary_restrictions || [],
              favoritesCuisines: profile.preferences?.favorite_cuisines || [],
              allergies: profile.preferences?.allergies || [],
              spiceLevel: profile.preferences?.spice_level || 'medium',
              cookingTime: profile.preferences?.cooking_time_preference || 'medium',
              servingSize: profile.preferences?.default_serving_size || 4,
              budgetRange: profile.preferences?.budget_range || 'medium'
            }
          }
        };
        
        localStorage.setItem('pantryBuddyState', JSON.stringify(appState));
      }
      
      // Get pantry items
      const { data: pantryItems } = await this.supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId);
      
      if (pantryItems?.length) {
        const pantryInventory = {
          id: `user-pantry-${userId}`,
          userId: userId,
          items: pantryItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            purchaseDate: item.purchase_date ? new Date(item.purchase_date) : null,
            expiryDate: item.expiry_date ? new Date(item.expiry_date) : null,
            location: item.location,
            notes: item.notes,
            isRunningLow: item.is_running_low,
            minimumQuantity: item.minimum_quantity
          })),
          totalItems: pantryItems.length,
          lastUpdated: new Date()
        };
        
        localStorage.setItem('pantryInventory', JSON.stringify(pantryInventory));
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing from Supabase:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dataMigrationService = new DataMigrationService();