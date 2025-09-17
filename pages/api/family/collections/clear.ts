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
      return res.status(200).json({ success: true, message: 'No family collections to clear' });
    }

    const familyIds = userFamilies.map(f => f.family_id);

    // Get all collections for user's families where user has delete permission
    const { data: collections } = await supabase
      .from('family_recipe_collections')
      .select('id, family_id, created_by')
      .in('family_id', familyIds);

    if (!collections || collections.length === 0) {
      return res.status(200).json({ success: true, message: 'No collections to clear' });
    }

    // Filter collections user can delete (owner, admin, or creator)
    const deletableCollections = collections.filter(collection => {
      const userFamily = userFamilies.find(f => f.family_id === collection.family_id);
      return (
        userFamily &&
        (userFamily.role === 'owner' ||
          userFamily.role === 'admin' ||
          collection.created_by === userId)
      );
    });

    if (deletableCollections.length === 0) {
      return res.status(403).json({ error: 'No permission to delete any collections' });
    }

    const collectionIds = deletableCollections.map(c => c.id);

    // Delete all recipes from collections first
    const { error: recipesError } = await supabase
      .from('family_collection_recipes')
      .delete()
      .in('collection_id', collectionIds);

    if (recipesError) {
      console.error('Error deleting collection recipes:', recipesError);
      return res.status(500).json({ error: 'Failed to clear collection recipes' });
    }

    // Delete all collections
    const { error: collectionsError } = await supabase
      .from('family_recipe_collections')
      .delete()
      .in('id', collectionIds);

    if (collectionsError) {
      console.error('Error deleting collections:', collectionsError);
      return res.status(500).json({ error: 'Failed to clear collections' });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${deletableCollections.length} collections`,
    });
  } catch (error) {
    console.error('Clear collections error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
