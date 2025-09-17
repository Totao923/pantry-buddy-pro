import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../supabase/client';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

type AuthenticatedHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>;

export const withApiAuth = (handler: AuthenticatedHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authentication token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      const supabase = createSupabaseServiceClient();

      // Verify the JWT token and get user information
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email || '',
      };

      // Call the protected handler
      return await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({ error: 'Internal authentication error' });
    }
  };
};
