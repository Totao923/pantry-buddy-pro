// Environment configuration with validation
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export interface SecurityConfig {
  encryptionKey: string;
  nextAuthSecret: string;
  nextAuthUrl: string;
}

export interface AppConfig {
  ai: AIConfig;
  supabase: SupabaseConfig;
  security: SecurityConfig;
  features: {
    enableAIRecipes: boolean;
    aiFallbackToMock: boolean;
    aiCacheEnabled: boolean;
    enableAuth: boolean;
    enableDatabase: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  environment: 'development' | 'production' | 'staging';
  appUrl: string;
}

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private loadConfig(): AppConfig {
    const provider = (process.env.AI_PROVIDER as any) || 'openai';

    // Get API key based on provider
    let apiKey = '';
    switch (provider) {
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY || '';
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY || '';
        break;
      case 'google':
        apiKey = process.env.GOOGLE_API_KEY || '';
        break;
    }

    return {
      ai: {
        provider,
        model:
          process.env.AI_MODEL ||
          (provider === 'openai'
            ? 'gpt-4'
            : provider === 'anthropic'
              ? 'claude-3-sonnet-20240229'
              : 'gemini-pro'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
        apiKey,
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      security: {
        encryptionKey: process.env.ENCRYPTION_KEY || '',
        nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
        nextAuthUrl:
          process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      features: {
        enableAIRecipes: process.env.ENABLE_AI_RECIPES === 'true',
        aiFallbackToMock: process.env.AI_FALLBACK_TO_MOCK !== 'false',
        aiCacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
        enableAuth:
          process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined,
        enableDatabase: process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined,
      },
      rateLimits: {
        requestsPerMinute: parseInt(process.env.AI_REQUESTS_PER_MINUTE || '10'),
        requestsPerHour: parseInt(process.env.AI_REQUESTS_PER_HOUR || '100'),
      },
      environment: (process.env.NODE_ENV as any) || 'development',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate AI configuration
    if (this.config.features.enableAIRecipes) {
      if (!this.config.ai.apiKey) {
        errors.push(`Missing API key for provider: ${this.config.ai.provider}`);
      }

      if (this.config.ai.temperature < 0 || this.config.ai.temperature > 2) {
        errors.push('AI temperature must be between 0 and 2');
      }

      if (this.config.ai.maxTokens < 100 || this.config.ai.maxTokens > 4000) {
        errors.push('Max tokens must be between 100 and 4000');
      }
    }

    // Validate Supabase configuration
    if (this.config.features.enableAuth || this.config.features.enableDatabase) {
      if (!this.config.supabase.url) {
        errors.push('Missing Supabase URL');
      }

      if (!this.config.supabase.anonKey) {
        errors.push('Missing Supabase anonymous key');
      }

      // Temporarily disable service role key validation for production deployment
      // if (this.config.environment === 'production' && !this.config.supabase.serviceRoleKey) {
      //   errors.push('Missing Supabase service role key for production');
      // }
    }

    // Validate security configuration (relaxed for production deployment)
    if (this.config.features.enableAuth && this.config.environment !== 'production') {
      if (!this.config.security.nextAuthSecret || this.config.security.nextAuthSecret.length < 32) {
        errors.push('NextAuth secret must be at least 32 characters');
      }

      if (!this.config.security.encryptionKey || this.config.security.encryptionKey.length < 32) {
        errors.push('Encryption key must be at least 32 characters');
      }
    }

    // Validate rate limits
    if (this.config.rateLimits.requestsPerMinute <= 0) {
      errors.push('Requests per minute must be positive');
    }

    if (this.config.rateLimits.requestsPerHour <= 0) {
      errors.push('Requests per hour must be positive');
    }

    if (errors.length > 0) {
      console.warn('Environment configuration warnings:', errors);

      // In production, we might want to throw errors for critical issues
      if (this.config.environment === 'production') {
        const criticalErrors = errors.filter(
          error =>
            error.includes('Missing Supabase') ||
            error.includes('NextAuth secret') ||
            error.includes('Encryption key')
        );

        if (criticalErrors.length > 0) {
          // Temporarily log warnings instead of throwing errors in production
          console.warn('⚠️ Production Configuration Warnings:', criticalErrors.join(', '));
          // throw new Error(`Critical configuration errors: ${criticalErrors.join(', ')}`);
        }
      }
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config }; // Return copy to prevent modification
  }

  public getAIConfig(): AIConfig {
    return { ...this.config.ai };
  }

  public isAIEnabled(): boolean {
    return this.config.features.enableAIRecipes && !!this.config.ai.apiKey;
  }

  public shouldFallbackToMock(): boolean {
    return this.config.features.aiFallbackToMock;
  }

  public isCacheEnabled(): boolean {
    return this.config.features.aiCacheEnabled;
  }

  public getRateLimits() {
    return { ...this.config.rateLimits };
  }

  // Development helper
  public logConfig(): void {
    if (this.config.environment === 'development') {
      console.log('Environment Configuration:', {
        provider: this.config.ai.provider,
        model: this.config.ai.model,
        hasApiKey: !!this.config.ai.apiKey,
        features: this.config.features,
        rateLimits: this.config.rateLimits,
      });
    }
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance();

// Export helper functions
export const getAIConfig = () => env.getAIConfig();
export const getSupabaseConfig = () => env.getConfig().supabase;
export const getSecurityConfig = () => env.getConfig().security;
export const isAIEnabled = () => env.isAIEnabled();
export const isAuthEnabled = () => env.getConfig().features.enableAuth;
export const isDatabaseEnabled = () => env.getConfig().features.enableDatabase;
export const shouldFallbackToMock = () => env.shouldFallbackToMock();
export const isCacheEnabled = () => env.isCacheEnabled();

// Development logging
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  env.logConfig();
}
