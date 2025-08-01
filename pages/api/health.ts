import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseSetup } from '../../lib/database/setup';
import { withSecurity } from '../../lib/middleware/enhanced-security';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'not_configured';
    ai: 'connected' | 'disconnected' | 'not_configured';
  };
  database?: {
    connected: boolean;
    tablesSetup: boolean;
    existingTables: number;
    totalTables: number;
  };
  uptime: number;
}

const startTime = Date.now();

async function healthHandler(req: NextApiRequest, res: NextApiResponse<HealthResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'not_configured',
        ai: 'not_configured',
      },
      uptime: Date.now() - startTime,
    });
  }

  try {
    // Check AI service
    const aiStatus = process.env.ANTHROPIC_API_KEY ? 'connected' : 'not_configured';

    // Check database with detailed status
    let supabaseStatus: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';
    let databaseDetails;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const setup = new DatabaseSetup();
        const dbStatus = await setup.getSetupStatus();

        supabaseStatus = dbStatus.connected ? 'connected' : 'disconnected';
        databaseDetails = {
          connected: dbStatus.connected,
          tablesSetup: dbStatus.allTablesExist,
          existingTables: dbStatus.existingTables,
          totalTables: dbStatus.totalTables,
        };
      } catch (error) {
        console.warn('Database status check failed:', error);
        supabaseStatus = 'disconnected';
        databaseDetails = {
          connected: false,
          tablesSetup: false,
          existingTables: 0,
          totalTables: 0,
        };
      }
    }

    const healthData: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: supabaseStatus,
        ai: aiStatus,
      },
      database: databaseDetails,
      uptime: Date.now() - startTime,
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'disconnected',
        ai: 'disconnected',
      },
      uptime: Date.now() - startTime,
    });
  }
}

// Apply security middleware without authentication (health checks should be public)
export default withSecurity({
  rateLimit: { windowMs: 1 * 60 * 1000, max: 30 }, // 30 requests per minute
  allowedMethods: ['GET'],
  maxBodySize: 1024, // Small body for GET requests
})(healthHandler);
