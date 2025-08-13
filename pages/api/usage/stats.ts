import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { withSubscription, type SubscriptionRequest } from '../../../lib/middleware/subscription';
import { UsageTrackingService } from '../../../lib/services/usageTrackingService';

interface UsageStatsResponse {
  success: boolean;
  limits?: any;
  todayUsage?: any;
  remaining?: any;
  tier?: string;
  error?: string;
}

async function usageStatsHandler(
  req: SubscriptionRequest,
  res: NextApiResponse<UsageStatsResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const userId = req.user.id;
    const usageSummary = await UsageTrackingService.getUsageSummary(userId);

    return res.status(200).json({
      success: true,
      limits: usageSummary.limits,
      todayUsage: usageSummary.todayUsage,
      remaining: usageSummary.remaining,
      tier: req.subscription.tier,
    });
  } catch (error: unknown) {
    console.error('Usage stats API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');

    return res.status(500).json({
      success: false,
      error: sanitizedError.error || 'Failed to fetch usage statistics',
    });
  }
}

// Apply security middleware with authentication requirement and subscription info
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 60 },
  allowedMethods: ['GET'],
  maxBodySize: 1 * 1024,
})(withAuth(withSubscription(usageStatsHandler)));
