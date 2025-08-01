import type { NextApiRequest, NextApiResponse } from 'next';
import { setupDatabase, DatabaseSetupResult } from '../../../lib/database/setup';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';

async function databaseSetupHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse<DatabaseSetupResult>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
      error: 'Method not allowed',
    });
  }

  try {
    // TODO: Add admin role check here
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Access denied. Admin privileges required.',
    //     error: 'Insufficient permissions',
    //   });
    // }

    console.log('Starting database setup...');
    const result = await setupDatabase();

    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json(result);
  } catch (error) {
    console.error('Database setup error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');

    return res.status(500).json({
      success: false,
      message: 'Database setup failed',
      error: sanitizedError.error || 'Unknown error occurred',
    });
  }
}

// Apply security middleware with authentication requirement
// Note: This endpoint should be restricted to admin users only
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 5 }, // Very low limit for admin operations
  allowedMethods: ['POST'],
  maxBodySize: 1024, // Small body for setup requests
})(withAuth(databaseSetupHandler));
