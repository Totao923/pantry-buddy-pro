import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user's family information using the database function
    const supabase = createSupabaseServiceClient();
    const { data: familyInfo, error } = await supabase.rpc('get_user_family_info', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Get family info error:', error);
      return res.status(500).json({ error: 'Failed to get family information' });
    }

    const info = familyInfo as {
      has_family: boolean;
      families: Array<{
        id: string;
        name: string;
        is_owner: boolean;
        role: string;
        is_child: boolean;
        member_count: number;
        member_emails: string[];
      }>;
    };

    // Get pending invitations for families where user is owner/admin
    let pendingInvitations: Array<{
      id: string;
      email: string;
      role: string;
      created_at: string;
      expires_at: string;
    }> = [];
    if (info.has_family) {
      const familyIds = info.families
        .filter(f => f.role === 'owner' || f.role === 'admin')
        .map(f => f.id);

      if (familyIds.length > 0) {
        const { data: invites } = await supabase
          .from('family_invitations')
          .select('id, email, role, created_at, expires_at')
          .in('family_id', familyIds)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString());

        pendingInvitations = invites || [];
      }
    }

    return res.status(200).json({
      ...info,
      pending_invitations: pendingInvitations,
    });
  } catch (error) {
    console.error('Family info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
