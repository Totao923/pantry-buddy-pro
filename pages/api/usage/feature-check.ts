import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { withSubscription, type SubscriptionRequest } from '../../../lib/middleware/subscription';

interface FeatureCheckResponse {
  success: boolean;
  hasAccess?: boolean;
  feature?: string;
  tier?: string;
  error?: string;
}

async function featureCheckHandler(
  req: SubscriptionRequest,
  res: NextApiResponse<FeatureCheckResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { feature } = req.query;

    if (!feature || typeof feature !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Feature parameter is required',
      });
    }

    const hasAccess = req.subscription.hasFeature(feature);

    return res.status(200).json({
      success: true,
      hasAccess,
      feature,
      tier: req.subscription.tier,
    });
  } catch (error: unknown) {
    console.error('Feature check API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');

    return res.status(500).json({
      success: false,
      error: sanitizedError.error || 'Failed to check feature access',
    });
  }
}

// Apply security middleware with authentication requirement and subscription info
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  allowedMethods: ['GET'],
  maxBodySize: 1 * 1024,
})(withAuth(withSubscription(featureCheckHandler)));
