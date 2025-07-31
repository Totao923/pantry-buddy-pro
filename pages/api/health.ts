import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'not_configured';
    ai: 'connected' | 'disconnected' | 'not_configured';
  };
  uptime: number;
}

const startTime = Date.now();

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthResponse>) {
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
    // Check Supabase connection
    const supabaseStatus = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'not_configured';

    // Check AI service
    const aiStatus = process.env.ANTHROPIC_API_KEY ? 'connected' : 'not_configured';

    const healthData: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: supabaseStatus,
        ai: aiStatus,
      },
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
