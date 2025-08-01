import { NextApiRequest, NextApiResponse } from 'next';
import { redisRateLimit } from '../cache/redis';

interface SecurityOptions {
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  allowedMethods?: string[];
  maxBodySize?: number;
  enableCORS?: boolean;
  corsOrigins?: string[];
}

/**
 * Enhanced security middleware with Redis support
 * Falls back to in-memory if Redis is not available
 */
export function withEnhancedSecurity(options: SecurityOptions = {}) {
  const {
    rateLimit: rateLimitConfig = { windowMs: 15 * 60 * 1000, max: 100 },
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxBodySize = 1024 * 1024, // 1MB default
    enableCORS = true,
    corsOrigins = [],
  } = options;

  return function securityMiddleware(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Add security headers
        addSecurityHeaders(res);

        // Handle CORS if enabled
        if (enableCORS) {
          handleCORS(req, res, corsOrigins);
          if (req.method === 'OPTIONS') {
            return res.status(200).end();
          }
        }

        // Method validation
        if (!allowedMethods.includes(req.method || '')) {
          res.setHeader('Allow', allowedMethods.join(', '));
          return res.status(405).json({
            error: 'Method not allowed',
            code: 'METHOD_NOT_ALLOWED',
          });
        }

        // Body size validation
        if (req.method === 'POST' || req.method === 'PUT') {
          const contentLength = parseInt(req.headers['content-length'] || '0');
          if (contentLength > maxBodySize) {
            return res.status(413).json({
              error: 'Request body too large',
              code: 'BODY_TOO_LARGE',
              maxSize: maxBodySize,
            });
          }
        }

        // Redis-based rate limiting
        const clientIP = getClientIP(req);
        const rateLimitKey = `${req.url || 'unknown'}:${clientIP}`;

        const rateLimitResult = await redisRateLimit.checkRateLimit(
          rateLimitKey,
          rateLimitConfig.max,
          rateLimitConfig.windowMs
        );

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', rateLimitConfig.max);
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitResult.resetTime,
          });
        }

        // Request validation passed, call the handler
        return await handler(req, res);
      } catch (error: unknown) {
        console.error('Security middleware error:', error);
        return res.status(500).json({
          error: 'Internal security error',
          code: 'SECURITY_ERROR',
        });
      }
    };
  };
}

function addSecurityHeaders(res: NextApiResponse) {
  // Basic security headers (already set in next.config.js, but adding as fallback)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Additional API-specific headers
  res.setHeader('X-Powered-By', 'Pantry Buddy Pro');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function handleCORS(req: NextApiRequest, res: NextApiResponse, allowedOrigins: string[]) {
  const origin = req.headers.origin;

  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (allowedOrigins.length > 0 && origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length === 0) {
    // No specific origins configured, use app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && origin === appUrl) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

function getClientIP(req: NextApiRequest): string {
  // Check for various headers that might contain the real IP
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  if (clientIP) {
    return Array.isArray(clientIP) ? clientIP[0] : clientIP;
  }

  // Fallback to connection remote address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Error sanitization utility
 */
export function sanitizeError(error: unknown, isDevelopment: boolean = false) {
  if (error instanceof Error) {
    return {
      error: isDevelopment ? error.message : 'An error occurred',
      code: 'INTERNAL_ERROR',
      ...(isDevelopment && { stack: error.stack }),
    };
  }

  return {
    error: isDevelopment ? String(error) : 'An error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

// Export for backward compatibility
export { withEnhancedSecurity as withSecurity };
