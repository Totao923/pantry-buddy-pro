import {
  AIProvider,
  RecipeGenerationParams,
  AIRecipeResponse,
  RecipeCache,
  RateLimiter,
  RecipeQuality,
} from './types';
import { AnthropicProvider } from './providers/anthropic';
import { PromptEngine } from './promptEngineering';
import { AdvancedRecipeEngine } from '../advancedRecipeEngine';
import {
  getAIConfig,
  isAIEnabled,
  shouldFallbackToMock,
  isCacheEnabled,
} from '../config/environment';
import { Recipe } from '../../types';

// Simple in-memory cache implementation
class MemoryRecipeCache implements RecipeCache {
  private cache = new Map<string, { recipe: Recipe; expires: number }>();
  private defaultTTL = 60 * 60 * 1000; // 1 hour

  async get(key: string): Promise<Recipe | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.recipe;
  }

  async set(key: string, recipe: Recipe, ttl = this.defaultTTL): Promise<void> {
    this.cache.set(key, {
      recipe,
      expires: Date.now() + ttl,
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  generateKey(params: RecipeGenerationParams): string {
    const keyData = {
      ingredients: params.ingredients.map(i => i.name).sort(),
      cuisine: params.cuisine,
      servings: params.servings,
      preferences: params.preferences || {},
    };
    return btoa(JSON.stringify(keyData))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substr(0, 32);
  }
}

// Simple rate limiter implementation
class MemoryRateLimiter implements RateLimiter {
  private limits = new Map<string, { count: number; resetTime: number }>();
  private maxRequestsPerHour = 100;
  private maxRequestsPerMinute = 10;

  async checkLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const hourKey = `${userId}_hour`;
    const minuteKey = `${userId}_minute`;

    // Check hourly limit
    const hourData = this.limits.get(hourKey);
    if (hourData && now < hourData.resetTime && hourData.count >= this.maxRequestsPerHour) {
      return false;
    }

    // Check minute limit
    const minuteData = this.limits.get(minuteKey);
    if (minuteData && now < minuteData.resetTime && minuteData.count >= this.maxRequestsPerMinute) {
      return false;
    }

    return true;
  }

  async incrementUsage(userId: string): Promise<void> {
    const now = Date.now();
    const hourKey = `${userId}_hour`;
    const minuteKey = `${userId}_minute`;

    // Increment hourly counter
    const hourData = this.limits.get(hourKey);
    if (!hourData || now >= hourData.resetTime) {
      this.limits.set(hourKey, { count: 1, resetTime: now + 60 * 60 * 1000 });
    } else {
      hourData.count++;
    }

    // Increment minute counter
    const minuteData = this.limits.get(minuteKey);
    if (!minuteData || now >= minuteData.resetTime) {
      this.limits.set(minuteKey, { count: 1, resetTime: now + 60 * 1000 });
    } else {
      minuteData.count++;
    }
  }

  async getRemainingRequests(userId: string): Promise<number> {
    const now = Date.now();
    const hourData = this.limits.get(`${userId}_hour`);
    const minuteData = this.limits.get(`${userId}_minute`);

    const hourRemaining =
      !hourData || now >= hourData.resetTime
        ? this.maxRequestsPerHour
        : Math.max(0, this.maxRequestsPerHour - hourData.count);

    const minuteRemaining =
      !minuteData || now >= minuteData.resetTime
        ? this.maxRequestsPerMinute
        : Math.max(0, this.maxRequestsPerMinute - minuteData.count);

    return Math.min(hourRemaining, minuteRemaining);
  }

  async resetLimits(): Promise<void> {
    this.limits.clear();
  }
}

export class AIService {
  private provider: AIProvider | null = null;
  private cache: RecipeCache;
  private rateLimiter: RateLimiter;
  private isInitialized = false;

  constructor() {
    this.cache = new MemoryRecipeCache();
    this.rateLimiter = new MemoryRateLimiter();
  }

  /**
   * Initialize the AI service with the configured provider
   */
  async initialize(): Promise<void> {
    const config = getAIConfig();
    console.log('🔍 AI Service Initialization:', {
      aiEnabled: isAIEnabled(),
      provider: config.provider,
      hasApiKey: !!config.apiKey,
      keyLength: config.apiKey?.length || 0,
      environment: process.env.NODE_ENV,
    });

    if (!isAIEnabled()) {
      console.log('❌ AI features disabled - using mock recipe engine only');
      this.isInitialized = true;
      return;
    }

    try {
      if (config.provider === 'anthropic') {
        this.provider = new AnthropicProvider(config.apiKey);
      } else {
        throw new Error(`Unsupported AI provider: ${config.provider}`);
      }

      // Test provider health
      const isHealthy = await this.provider.isHealthy();
      if (!isHealthy) {
        console.warn('⚠️ AI provider health check failed - may fallback to mock engine');
      } else {
        console.log('✅ AI provider health check passed');
      }

      this.isInitialized = true;
      console.log(`✅ AI service initialized with provider: ${config.provider}`);
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      if (!shouldFallbackToMock()) {
        throw error;
      }
      this.isInitialized = true;
    }
  }

  /**
   * Generate a recipe using AI or fallback to mock engine
   */
  async generateRecipe(
    params: RecipeGenerationParams,
    userId = 'anonymous'
  ): Promise<AIRecipeResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check rate limits
      const canProceed = await this.rateLimiter.checkLimit(userId);
      if (!canProceed) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Check cache first
      let cacheKey = '';
      if (isCacheEnabled()) {
        cacheKey = this.cache.generateKey(params);
        const cachedRecipe = await this.cache.get(cacheKey);
        if (cachedRecipe) {
          return {
            success: true,
            recipe: cachedRecipe,
            metadata: {
              model: 'cached',
              provider: 'cache',
              responseTime: 0,
              cacheHit: true,
            },
          };
        }
      }

      // Try AI generation first
      if (this.provider) {
        try {
          const prompt = PromptEngine.generateRecipePrompt(params);
          const response = await this.provider.generateRecipe(prompt, {
            temperature: 0.7,
            maxTokens: 2000,
            timeout: 30000,
          });

          if (response.success && response.recipe) {
            // Validate recipe quality
            const quality = this.assessRecipeQuality(response.recipe, params);

            if (quality.score >= 0.6) {
              // Minimum quality threshold
              // Increment usage and cache result
              await this.rateLimiter.incrementUsage(userId);

              if (isCacheEnabled() && cacheKey) {
                await this.cache.set(cacheKey, response.recipe);
              }

              return response;
            } else {
              console.warn('AI recipe quality below threshold, falling back to mock engine');
              console.warn('Quality issues:', quality.issues);
            }
          }
        } catch (error) {
          console.error('AI generation failed:', error);
        }
      }

      // Fallback to mock engine
      if (shouldFallbackToMock()) {
        console.log('Falling back to mock recipe engine');
        const mockRecipe = await AdvancedRecipeEngine.generateAdvancedRecipe(
          params.ingredients,
          params.cuisine,
          params.servings,
          params.preferences
        );

        return {
          success: true,
          recipe: mockRecipe,
          metadata: {
            model: 'mock-engine',
            provider: 'fallback',
            responseTime: 100,
            cacheHit: false,
          },
        };
      }

      return {
        success: false,
        error: 'Recipe generation failed and fallback is disabled',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Enhance an existing recipe
   */
  async enhanceRecipe(
    originalRecipe: Recipe,
    enhancement: 'add-tips' | 'create-variations' | 'improve-instructions' | 'optimize-nutrition',
    userFeedback?: any
  ): Promise<AIRecipeResponse> {
    if (!this.provider) {
      return {
        success: false,
        error: 'AI enhancement requires an active AI provider',
      };
    }

    try {
      const prompt = PromptEngine.generateEnhancementPrompt({
        originalRecipe,
        enhancement,
        userFeedback,
      });

      return await this.provider.generateRecipe(prompt, {
        temperature: 0.5, // Lower temperature for enhancements
        maxTokens: 1500,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enhancement failed',
      };
    }
  }

  /**
   * Get recipe suggestions
   */
  async getRecipeSuggestions(cuisinePreference?: string, mood?: string): Promise<string[]> {
    if (!this.provider) {
      return [
        'Creamy Garlic Parmesan Pasta',
        'Asian-Style Stir-Fry Bowl',
        'Mediterranean Herb-Crusted Salmon',
      ];
    }

    try {
      const prompt = PromptEngine.generateSuggestionPrompt(cuisinePreference as any, mood);
      const response = await this.provider.generateRecipe(prompt, { maxTokens: 500 });

      if (response.success) {
        // Parse suggestions from response
        // This would need proper JSON parsing
        return ['AI-Generated Suggestion 1', 'AI-Generated Suggestion 2'];
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }

    return ['Creative Fusion Bowl', 'Seasonal Comfort Food', 'Quick & Healthy Option'];
  }

  /**
   * Assess the quality of a generated recipe
   */
  private assessRecipeQuality(recipe: Recipe, params: RecipeGenerationParams): RecipeQuality {
    let score = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check ingredient utilization
    const availableIngredients = params.ingredients.map(i => i.name.toLowerCase());
    const usedIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
    const utilizationRate =
      usedIngredients.filter(used =>
        availableIngredients.some(available => used.includes(available) || available.includes(used))
      ).length / Math.max(availableIngredients.length, 1);

    const ingredientUtilization = Math.min(utilizationRate * 1.2, 1); // Boost score slightly
    score += ingredientUtilization * 0.3;

    if (utilizationRate < 0.3) {
      issues.push('Low ingredient utilization from available ingredients');
      suggestions.push('Try to use more of the available ingredients');
    }

    // Check instruction clarity
    const avgInstructionLength =
      recipe.instructions.reduce((sum, inst) => sum + inst.instruction.length, 0) /
      recipe.instructions.length;

    const instructionClarity = avgInstructionLength > 30 && avgInstructionLength < 200 ? 1 : 0.7;
    score += instructionClarity * 0.25;

    if (avgInstructionLength < 30) {
      issues.push('Instructions too brief');
    } else if (avgInstructionLength > 200) {
      issues.push('Instructions too verbose');
    }

    // Check nutritional balance
    const nutrition = recipe.nutritionInfo;
    let nutritionalBalance = 0.8; // Default good score

    if (nutrition) {
      const proteinRatio = (nutrition.protein * 4) / Math.max(nutrition.calories, 1);
      const carbRatio = (nutrition.carbs * 4) / Math.max(nutrition.calories, 1);
      const fatRatio = (nutrition.fat * 9) / Math.max(nutrition.calories, 1);

      const totalRatio = proteinRatio + carbRatio + fatRatio;
      if (Math.abs(totalRatio - 1) < 0.2) {
        // Close to 100% of calories accounted for
        nutritionalBalance = 1;
      }
    }

    score += nutritionalBalance * 0.2;

    // Creativity and feasibility scores (simplified)
    const creativityScore =
      recipe.tags?.includes('creative') || recipe.title.includes('fusion') ? 0.9 : 0.8;
    const feasibilityScore = recipe.totalTime <= (params.preferences?.maxTime || 120) ? 1 : 0.6;

    score += creativityScore * 0.15;
    score += feasibilityScore * 0.1;

    return {
      score: Math.min(score, 1),
      factors: {
        ingredientUtilization,
        instructionClarity,
        nutritionalBalance,
        creativityScore,
        feasibilityScore,
      },
      issues,
      suggestions,
    };
  }

  /**
   * Get service statistics
   */
  async getUsageStats(userId: string) {
    return {
      remainingRequests: await this.rateLimiter.getRemainingRequests(userId),
      providerStatus: this.provider ? 'active' : 'fallback',
      cacheEnabled: isCacheEnabled(),
      aiEnabled: isAIEnabled(),
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}

// Export singleton instance
export const aiService = new AIService();
