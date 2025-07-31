import { Recipe, Ingredient, CuisineType, DifficultyLevel } from '../../types';

// AI Provider Interface
export interface AIProvider {
  name: string;
  generateRecipe(prompt: string, options?: AIGenerationOptions): Promise<AIRecipeResponse>;
  isHealthy(): Promise<boolean>;
  getCostEstimate(prompt: string): number; // Estimated cost in cents
}

// AI Generation Options
export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
  timeout?: number; // milliseconds
}

// Recipe Generation Parameters
export interface RecipeGenerationParams {
  ingredients: Ingredient[];
  cuisine: CuisineType;
  servings: number;
  preferences?: {
    maxTime?: number;
    difficulty?: DifficultyLevel;
    dietary?: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    allergens?: string[];
    nutritionGoals?: 'high-protein' | 'low-carb' | 'balanced' | 'low-calorie';
  };
  userHistory?: {
    favoriteRecipes?: string[];
    dislikedIngredients?: string[];
    cookingFrequency?: 'daily' | 'weekly' | 'occasional';
    skillLevel?: number; // 1-10
  };
}

// AI Response Types
export interface AIRecipeResponse {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number; // in cents
  };
  metadata?: {
    model: string;
    provider: string;
    responseTime: number; // milliseconds
    cacheHit: boolean;
  };
}

// Recipe Enhancement Parameters
export interface RecipeEnhancementParams {
  originalRecipe: Recipe;
  enhancement: 'add-tips' | 'create-variations' | 'improve-instructions' | 'optimize-nutrition';
  userFeedback?: {
    rating: number;
    comments: string[];
    modifications: string[];
  };
}

// Caching Interface
export interface RecipeCache {
  get(key: string): Promise<Recipe | null>;
  set(key: string, recipe: Recipe, ttl?: number): Promise<void>;
  clear(): Promise<void>;
  generateKey(params: RecipeGenerationParams): string;
}

// Rate Limiting Interface  
export interface RateLimiter {
  checkLimit(userId: string): Promise<boolean>;
  incrementUsage(userId: string): Promise<void>;
  getRemainingRequests(userId: string): Promise<number>;
  resetLimits(): Promise<void>;
}

// AI Service Events
export type AIServiceEvent = 
  | { type: 'generation_started'; params: RecipeGenerationParams }
  | { type: 'generation_completed'; response: AIRecipeResponse }
  | { type: 'generation_failed'; error: string; fallback: boolean }
  | { type: 'cache_hit'; key: string }
  | { type: 'rate_limit_exceeded'; userId: string }
  | { type: 'provider_switched'; from: string; to: string };

// AI Service Configuration
export interface AIServiceConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  enableCaching: boolean;
  enableRateLimiting: boolean;
  retryAttempts: number;
  timeoutMs: number;
  qualityThreshold: number; // 0-1, minimum quality score to accept
}

// Recipe Quality Metrics
export interface RecipeQuality {
  score: number; // 0-1
  factors: {
    ingredientUtilization: number;
    instructionClarity: number;
    nutritionalBalance: number;
    creativityScore: number;
    feasibilityScore: number;
  };
  issues: string[];
  suggestions: string[];
}

// Provider Health Status
export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  uptime: number; // percentage
}

// Usage Analytics
export interface UsageAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  costTotal: number;
  cacheHitRate: number;
  providerUsage: Record<string, number>;
  topErrorTypes: Record<string, number>;
}