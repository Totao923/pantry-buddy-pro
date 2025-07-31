export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity?: string;
  unit?: string;
  expiryDate?: Date;
  nutritionalValue?: number;
  isProtein?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
}

export type IngredientCategory =
  | 'protein'
  | 'vegetables'
  | 'fruits'
  | 'grains'
  | 'dairy'
  | 'spices'
  | 'herbs'
  | 'oils'
  | 'pantry'
  | 'other';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: CuisineType;
  servings: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: DifficultyLevel;
  ingredients: RecipeIngredient[];
  instructions: InstructionStep[];
  nutritionInfo?: NutritionInfo;
  tags: string[];
  rating?: number;
  reviews?: number;
  image?: string;
  videoUrl?: string;
  tips?: string[];
  variations?: RecipeVariation[];
  dietaryInfo: DietaryInfo;
}

export interface InstructionStep {
  step: number;
  instruction: string;
  duration?: number;
  temperature?: number;
  image?: string;
}

export interface RecipeVariation {
  name: string;
  description: string;
  modifications: string[];
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  optional?: boolean;
  substitutes?: string[];
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface DietaryInfo {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isKeto: boolean;
  isPaleo: boolean;
  allergens: string[];
}

export type CuisineType =
  | 'any'
  | 'italian'
  | 'asian'
  | 'mexican'
  | 'indian'
  | 'american'
  | 'mediterranean'
  | 'chinese'
  | 'french'
  | 'thai'
  | 'japanese'
  | 'middle-eastern'
  | 'korean'
  | 'greek'
  | 'spanish'
  | 'fusion';

export type DifficultyLevel = 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Expert';

export interface Cuisine {
  id: CuisineType;
  name: string;
  description: string;
  icon: string;
  color: string;
  popularIngredients: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  subscription: SubscriptionTier;
  savedRecipes: string[];
  mealPlans: MealPlan[];
  pantry: Ingredient[];
  cookingHistory: CookingSession[];
  achievements: Achievement[];
}

export interface UserPreferences {
  dietaryRestrictions: string[];
  favoritesCuisines: CuisineType[];
  allergies: string[];
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra-hot';
  cookingTime: 'quick' | 'medium' | 'slow';
  servingSize: number;
  budgetRange: 'low' | 'medium' | 'high';
}

export type SubscriptionTier = 'free' | 'premium' | 'family' | 'chef';

export interface MealPlan {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  meals: PlannedMeal[];
  shoppingList: ShoppingItem[];
}

export interface PlannedMeal {
  id: string;
  recipeId: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  estimated_price?: number;
  purchased: boolean;
}

export interface CookingSession {
  id: string;
  recipeId: string;
  date: Date;
  rating: number;
  notes?: string;
  modifications?: string[];
  cookTime: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedDate: Date;
}

export interface SmartSuggestion {
  type: 'ingredient' | 'recipe' | 'technique';
  title: string;
  description: string;
  confidence: number;
  reason: string;
}

export interface AppState {
  ingredients: Ingredient[];
  selectedCuisine: CuisineType;
  generatedRecipes: Recipe[];
  currentRecipe?: Recipe;
  user: User;
  isLoading: boolean;
  error?: string;
}

export interface RecipeFilters {
  maxTime?: number;
  difficulty?: DifficultyLevel[];
  dietary?: string[];
  cuisine?: CuisineType[];
  rating?: number;
}

export interface SearchQuery {
  query: string;
  filters: RecipeFilters;
  sortBy: 'relevance' | 'time' | 'rating' | 'difficulty';
}

// ==================== MVP FEATURES ====================

// Ad System Types
export interface AdConfig {
  id: string;
  type: 'banner' | 'native' | 'rewarded-video' | 'interstitial';
  placement: 'header' | 'footer' | 'between-steps' | 'recipe-feed' | 'modal';
  isActive: boolean;
  frequency?: number; // Show every N interactions
}

export interface AdPreferences {
  showAds: boolean;
  adPersonalization: boolean;
  rewardedAdsEnabled: boolean;
}

// Social Sharing Types
export interface SocialShare {
  id: string;
  recipeId: string;
  platform: 'instagram' | 'facebook' | 'pinterest' | 'twitter' | 'whatsapp';
  shareUrl: string;
  imageUrl?: string;
  caption: string;
  createdAt: Date;
}

export interface SocialShareTemplate {
  platform: 'instagram' | 'facebook' | 'pinterest' | 'twitter' | 'whatsapp';
  template: string;
  dimensions: { width: number; height: number };
  hasWatermark: boolean; // Free users get watermark
}

// Recipe Rating & Review System
export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  overallRating: number; // 1-5 stars
  difficultyAccuracy: number; // 1-5 stars
  tasteRating: number; // 1-5 stars
  wouldCookAgain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeReview {
  id: string;
  recipeId: string;
  userId: string;
  rating: RecipeRating;
  reviewText?: string;
  photos?: RecipePhoto[];
  modifications?: string[];
  cookingTips?: string[];
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipePhoto {
  id: string;
  recipeId: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl: string;
  caption?: string;
  photoType: 'ingredient-prep' | 'cooking-process' | 'final-dish' | 'step-by-step';
  stepNumber?: number;
  uploadedAt: Date;
}

// Enhanced Pantry Inventory System
export interface PantryItem extends Ingredient {
  purchaseDate?: Date;
  expiryDate?: Date;
  currentQuantity: number;
  originalQuantity: number;
  unit: string;
  location?: string; // fridge, pantry, freezer
  barcode?: string;
  price?: number;
  brand?: string;
  isRunningLow: boolean;
  autoReorderLevel?: number;
  lastUsedDate?: Date;
  usageFrequency: number;
}

export interface PantryInventory {
  id: string;
  userId: string;
  items: PantryItem[];
  totalItems: number;
  categoryCounts: Record<IngredientCategory, number>;
  expiringItems: PantryItem[];
  lowStockItems: PantryItem[];
  lastUpdated: Date;
}

// Shopping List System
export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  priority: 'high' | 'medium' | 'low';
  estimatedPrice?: number;
  isPurchased: boolean;
  addedBy: 'user' | 'ai-suggestion' | 'recipe-requirement';
  relatedRecipeId?: string;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  userId: string;
  items: ShoppingListItem[];
  totalEstimatedCost: number;
  createdAt: Date;
  completedAt?: Date;
  isShared: boolean;
  sharedWith?: string[]; // Family member IDs
}

// Subscription and Premium Features
export interface SubscriptionFeatures {
  maxPantryItems: number;
  dailyRecipeGenerations: number;
  hasAdvancedAI: boolean;
  hasNutritionTracking: boolean;
  hasMealPlanning: boolean;
  hasPhotoUploads: boolean;
  hasVideoTutorials: boolean;
  hasAdFreeExperience: boolean;
  hasPrioritySupport: boolean;
  maxFamilyMembers: number;
  hasBarcodeScan: boolean;
  hasAdvancedInventory: boolean;
  hasShoppingIntegration: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  lastPayment?: Date;
  nextPayment?: Date;
  features: SubscriptionFeatures;
}

// Usage Tracking for Freemium Limits
export interface UsageTracking {
  userId: string;
  date: Date;
  recipeGenerations: number;
  pantryItemsUsed: number;
  adViews: number;
  rewardedAdWatches: number;
  socialShares: number;
  premiumFeatureAttempts: number;
}

// Enhanced User Interface
export interface EnhancedUser extends User {
  subscription: Subscription;
  adPreferences: AdPreferences;
  usageTracking: UsageTracking;
  socialProfiles?: Record<string, string>;
  recipeRatings: RecipeRating[];
  recipeReviews: RecipeReview[];
  pantryInventory: PantryInventory;
  shoppingLists: ShoppingList[];
  totalRecipesCooked: number;
  joinDate: Date;
  lastActiveDate: Date;
}

// Enhanced Recipe with Social Features
export interface EnhancedRecipe extends Recipe {
  photos: RecipePhoto[];
  reviews: RecipeReview[];
  averageRating: number;
  totalRatings: number;
  socialShares: SocialShare[];
  createdBy?: string; // User ID for community recipes
  isVerified: boolean; // AI vs human created
  popularityScore: number;
  lastCooked?: Date;
  cookCount: number;
  bookmarkCount: number;
}

// App State with Enhanced Features
export interface EnhancedAppState extends AppState {
  subscription: Subscription;
  pantryInventory: PantryInventory;
  currentShoppingList?: ShoppingList;
  adConfig: AdConfig[];
  usageTracking: UsageTracking;
  socialShareModal?: {
    isOpen: boolean;
    recipe?: EnhancedRecipe;
    platform?: string;
  };
  ratingModal?: {
    isOpen: boolean;
    recipe?: EnhancedRecipe;
  };
}
