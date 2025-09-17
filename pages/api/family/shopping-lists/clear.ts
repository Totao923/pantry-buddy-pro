import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../../lib/supabase/client';
import { withApiAuth } from '../../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createSupabaseServiceClient();

    // Get user's family memberships
    const { data: userFamilies } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('user_id', userId);

    if (!userFamilies || userFamilies.length === 0) {
      return res.status(200).json({ success: true, message: 'No family shopping lists to clear' });
    }

    const familyIds = userFamilies.map(f => f.family_id);

    // Get all shopping lists for user's families where user has delete permission
    const { data: shoppingLists } = await supabase
      .from('family_shopping_lists')
      .select('id, family_id, created_by')
      .in('family_id', familyIds);

    if (!shoppingLists || shoppingLists.length === 0) {
      return res.status(200).json({ success: true, message: 'No shopping lists to clear' });
    }

    // Filter shopping lists user can delete (owner, admin, or creator)
    const deletableShoppingLists = shoppingLists.filter(list => {
      const userFamily = userFamilies.find(f => f.family_id === list.family_id);
      return (
        userFamily &&
        (userFamily.role === 'owner' || userFamily.role === 'admin' || list.created_by === userId)
      );
    });

    if (deletableShoppingLists.length === 0) {
      return res.status(403).json({ error: 'No permission to delete any shopping lists' });
    }

    const shoppingListIds = deletableShoppingLists.map(l => l.id);

    // Delete all shopping lists
    const { error: deleteError } = await supabase
      .from('family_shopping_lists')
      .delete()
      .in('id', shoppingListIds);

    if (deleteError) {
      console.error('Error deleting shopping lists:', deleteError);
      return res.status(500).json({ error: 'Failed to clear shopping lists' });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${deletableShoppingLists.length} shopping lists`,
    });
  } catch (error) {
    console.error('Clear shopping lists error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
