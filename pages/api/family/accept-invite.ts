import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

interface AcceptInviteRequest {
  token: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body as AcceptInviteRequest;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Invitation token is required' });
  }

  try {
    // Use the database function to accept invitation
    const supabase = createSupabaseServiceClient();
    const { data: result, error } = await supabase.rpc('accept_family_invitation', {
      invitation_token: token,
    });

    if (error) {
      console.error('Accept invitation error:', error);
      return res.status(500).json({ error: 'Failed to accept invitation' });
    }

    // Parse the result
    const inviteResult = result as {
      success: boolean;
      error?: string;
      family_name?: string;
      role?: string;
    };

    if (!inviteResult.success) {
      return res.status(400).json({ error: inviteResult.error });
    }

    return res.status(200).json({
      success: true,
      familyName: inviteResult.family_name,
      role: inviteResult.role,
      message: 'Successfully joined family!',
    });
  } catch (error) {
    console.error('Accept family invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
