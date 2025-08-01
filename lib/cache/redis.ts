/**
 * Redis Cache Implementation for Production Performance
 *
 * This module provides Redis-based caching and rate limiting
 * for improved performance in production environments.
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

// Initialize Redis connection (lazy initialization)
function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn('Redis URL not configured - falling back to in-memory caching');
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Connection timeout
        connectTimeout: 10000,
        // Command timeout
        commandTimeout: 5000,
      });

      redis.on('error', error => {
        console.error('Redis connection error:', error);
        // Don't throw - fallback to in-memory
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      return null;
    }
  }

  return redis;
}

/**
 * Redis-based rate limiting
 */
export class RedisRateLimit {
  private redis: Redis | null;
  private fallbackMemoryStore: Map<string, { count: number; resetTime: number }>;

  constructor() {
    this.redis = getRedisClient();
    this.fallbackMemoryStore = new Map();
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (this.redis) {
      return this.redisRateLimit(key, limit, windowMs, now, resetTime);
    } else {
      return this.memoryRateLimit(key, limit, windowMs, now, resetTime);
    }
  }

  private async redisRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
    resetTime: number
  ) {
    try {
      const pipeline = this.redis!.pipeline();
      const redisKey = `rate_limit:${key}`;

      // Use sliding window approach
      pipeline.zremrangebyscore(redisKey, '-inf', now - windowMs);
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      pipeline.zcard(redisKey);
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const count = (results?.[2]?.[1] as number) || 0;

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetTime,
      };
    } catch (error) {
      console.error('Redis rate limit error, falling back to memory:', error);
      return this.memoryRateLimit(key, limit, windowMs, now, resetTime);
    }
  }

  private memoryRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
    resetTime: number
  ) {
    // Clean up expired entries
    this.fallbackMemoryStore.forEach((v, k) => {
      if (v.resetTime < now) {
        this.fallbackMemoryStore.delete(k);
      }
    });

    const current = this.fallbackMemoryStore.get(key);

    if (!current || current.resetTime < now) {
      this.fallbackMemoryStore.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }

    current.count++;

    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetTime: current.resetTime,
    };
  }
}

/**
 * Generic Redis caching with fallback
 */
export class RedisCache {
  private redis: Redis | null;
  private memoryCache: Map<string, { value: any; expires: number }>;

  constructor() {
    this.redis = getRedisClient();
    this.memoryCache = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('Redis get error:', error);
        // Fall through to memory cache
      }
    }

    // Memory cache fallback
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    if (cached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.error('Redis set error:', error);
        // Fall through to memory cache
      }
    }

    // Memory cache fallback
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis del error:', error);
      }
    }

    this.memoryCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.redis) {
      try {
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (error) {
        console.error('Redis exists error:', error);
      }
    }

    const cached = this.memoryCache.get(key);
    return cached ? cached.expires > Date.now() : false;
  }

  // Clean up memory cache periodically
  cleanupMemoryCache(): void {
    const now = Date.now();
    this.memoryCache.forEach((value, key) => {
      if (value.expires < now) {
        this.memoryCache.delete(key);
      }
    });
  }
}

// Singleton instances
export const redisRateLimit = new RedisRateLimit();
export const redisCache = new RedisCache();

// Clean up memory cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      redisCache.cleanupMemoryCache();
    },
    5 * 60 * 1000
  );
}

// Graceful shutdown
process.on('SIGTERM', () => {
  if (redis) {
    redis.disconnect();
  }
});

process.on('SIGINT', () => {
  if (redis) {
    redis.disconnect();
  }
});
