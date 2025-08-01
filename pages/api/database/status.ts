import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseSetup } from '../../../lib/database/setup';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';

interface DatabaseStatusResponse {
  success: boolean;
  status: {
    connected: boolean;
    tablesExist: { [tableName: string]: boolean };
    allTablesExist: boolean;
    totalTables: number;
    existingTables: number;
  };
  message?: string;
  error?: string;
}

async function databaseStatusHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse<DatabaseStatusResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      status: {
        connected: false,
        tablesExist: {},
        allTablesExist: false,
        totalTables: 0,
        existingTables: 0,
      },
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    const setup = new DatabaseSetup();
    const status = await setup.getSetupStatus();

    return res.status(200).json({
      success: true,
      status,
      message: status.connected
        ? `Database connected. ${status.existingTables}/${status.totalTables} tables exist.`
        : 'Database not connected',
    });
  } catch (error) {
    console.error('Database status check error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');

    return res.status(500).json({
      success: false,
      status: {
        connected: false,
        tablesExist: {},
        allTablesExist: false,
        totalTables: 0,
        existingTables: 0,
      },
      error: sanitizedError.error || 'Failed to check database status',
    });
  }
}

// Apply security middleware with authentication requirement
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 20 }, // Moderate limit for status checks
  allowedMethods: ['GET'],
  maxBodySize: 1024, // Small body for GET requests
})(withAuth(databaseStatusHandler));
