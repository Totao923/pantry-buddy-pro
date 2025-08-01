import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../supabase/server';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Authentication middleware for API routes
 * Validates JWT token and attaches user info to request
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'MISSING_AUTH_TOKEN',
        });
      }

      const token = authHeader.replace('Bearer ', '');

      // Create server-side Supabase client
      const supabase = createServerSupabaseClient();

      // Verify the JWT token
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          error: 'Invalid authentication token',
          code: 'INVALID_AUTH_TOKEN',
        });
      }

      // Check if user is active (optional additional check)
      if (user.email_confirmed_at === null) {
        return res.status(401).json({
          error: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }

      // Attach user info to request
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role,
      };

      // Call the original handler with authenticated request
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR',
      });
    }
  };
}

/**
 * Optional auth middleware - allows both authenticated and anonymous requests
 * Attaches user info if token is valid, otherwise continues without user
 */
export function withOptionalAuth(handler: AuthenticatedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const supabase = createServerSupabaseClient();

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (!error && user && user.email_confirmed_at) {
          (req as AuthenticatedRequest).user = {
            id: user.id,
            email: user.email!,
            role: user.user_metadata?.role,
          };
        }
      }

      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      // Continue without authentication on error
      return handler(req as AuthenticatedRequest, res);
    }
  };
}

/**
 * Role-based authorization middleware
 */
export function withRole(roles: string[], handler: AuthenticatedHandler) {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const userRole = req.user.role || 'user';

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    return handler(req, res);
  });
}
