import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

interface InviteRequest {
  familyId?: string;
  email: string;
  role: 'admin' | 'member' | 'child';
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { familyId, email, role = 'member' } = req.body as InviteRequest;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const supabase = createSupabaseServiceClient();
    let targetFamilyId = familyId;

    // If no familyId provided, create a new family group
    if (!targetFamilyId) {
      const { data: newFamily, error: createError } = await supabase
        .from('family_groups')
        .insert({
          name: 'My Family',
          owner_id: userId,
        })
        .select('id')
        .single();

      if (createError || !newFamily) {
        return res.status(500).json({ error: 'Failed to create family group' });
      }

      targetFamilyId = newFamily.id;

      // Add creator as owner
      await supabase.from('family_memberships').insert({
        family_id: targetFamilyId,
        user_id: userId,
        role: 'owner',
      });
    }

    // Verify user has permission to invite (owner or admin)
    const { data: membership } = await supabase
      .from('family_memberships')
      .select('role')
      .eq('family_id', targetFamilyId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'No permission to invite members' });
    }

    // Check family member limit
    const { data: familyInfo } = await supabase
      .from('family_groups')
      .select('max_members')
      .eq('id', targetFamilyId)
      .single();

    const { count: currentMembers } = await supabase
      .from('family_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', targetFamilyId);

    if (currentMembers && familyInfo && currentMembers >= familyInfo.max_members) {
      return res.status(400).json({ error: 'Family has reached maximum member limit' });
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('family_memberships')
      .select('id')
      .eq('family_id', targetFamilyId)
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a family member' });
    }

    // Generate invitation token
    const { data: tokenData } = await supabase.rpc('create_family_invitation_token');
    const token = tokenData;

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .insert({
        family_id: targetFamilyId,
        invited_by: userId,
        email: email.toLowerCase(),
        token,
        role,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select('id, token')
      .single();

    if (inviteError || !invitation) {
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // TODO: Send email invitation
    // For now, return the invitation link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/family/join/${invitation.token}`;

    return res.status(200).json({
      success: true,
      familyId: targetFamilyId,
      invitationId: invitation.id,
      inviteLink,
      message: 'Invitation created successfully',
    });
  } catch (error) {
    console.error('Family invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
