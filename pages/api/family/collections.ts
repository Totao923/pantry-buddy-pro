import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

interface CreateCollectionRequest {
  name: string;
  description?: string;
  isCollaborative?: boolean;
}

interface AddRecipeRequest {
  collectionId: string;
  recipeId: string;
}

async function removeRecipeFromCollection(
  supabase: any,
  userId: string,
  collectionId: string,
  recipeId: string,
  res: NextApiResponse
) {
  // Verify user has access to remove from this collection
  const { data: collectionAccess } = await supabase
    .from('family_recipe_collections')
    .select('family_id, created_by, is_collaborative')
    .eq('id', collectionId)
    .single();

  if (!collectionAccess) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // Verify user is family member
  const { data: membershipCheck } = await supabase
    .from('family_memberships')
    .select('role')
    .eq('family_id', collectionAccess.family_id)
    .eq('user_id', userId)
    .single();

  if (!membershipCheck) {
    return res.status(403).json({ error: 'No access to this collection' });
  }

  // Check permissions: owner, admin, creator, or if collaborative
  const canRemove =
    membershipCheck.role === 'owner' ||
    membershipCheck.role === 'admin' ||
    collectionAccess.created_by === userId ||
    collectionAccess.is_collaborative;

  if (!canRemove) {
    return res.status(403).json({ error: 'No permission to remove from this collection' });
  }

  const { error: removeError } = await supabase
    .from('family_collection_recipes')
    .delete()
    .eq('collection_id', collectionId)
    .eq('recipe_id', recipeId);

  if (removeError) {
    return res.status(500).json({ error: 'Failed to remove recipe from collection' });
  }

  return res.status(200).json({ success: true, message: 'Recipe removed from collection' });
}

async function deleteEntireCollection(
  supabase: any,
  userId: string,
  collectionId: string,
  res: NextApiResponse
) {
  // Verify user has permission to delete this collection
  const { data: collection } = await supabase
    .from('family_recipe_collections')
    .select('family_id, created_by')
    .eq('id', collectionId)
    .single();

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // Verify user is family member
  const { data: membershipCheck } = await supabase
    .from('family_memberships')
    .select('role')
    .eq('family_id', collection.family_id)
    .eq('user_id', userId)
    .single();

  if (!membershipCheck) {
    return res.status(403).json({ error: 'No access to this collection' });
  }

  // Check permissions: owner, admin, or creator
  const canDelete =
    membershipCheck.role === 'owner' ||
    membershipCheck.role === 'admin' ||
    collection.created_by === userId;

  if (!canDelete) {
    return res.status(403).json({ error: 'No permission to delete this collection' });
  }

  // Delete all recipes from collection first
  const { error: recipesError } = await supabase
    .from('family_collection_recipes')
    .delete()
    .eq('collection_id', collectionId);

  if (recipesError) {
    return res.status(500).json({ error: 'Failed to remove recipes from collection' });
  }

  // Delete the collection
  const { error: deleteError } = await supabase
    .from('family_recipe_collections')
    .delete()
    .eq('id', collectionId);

  if (deleteError) {
    return res.status(500).json({ error: 'Failed to delete collection' });
  }

  return res.status(200).json({ success: true, message: 'Collection deleted successfully' });
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createSupabaseServiceClient();
    switch (req.method) {
      case 'GET':
        // Get family recipe collections for user
        const { data: userFamilies } = await supabase
          .from('family_memberships')
          .select('family_id')
          .eq('user_id', userId);

        if (!userFamilies || userFamilies.length === 0) {
          return res.status(200).json({ collections: [] });
        }

        const familyIds = userFamilies.map(f => f.family_id);

        const { data: collections, error: collectionsError } = await supabase
          .from('family_recipe_collections')
          .select(
            `
            *,
            family_groups(name),
            user_profiles!created_by(email),
            family_collection_recipes(
              recipe_id,
              added_at,
              recipes(id, name, description, image_url)
            )
          `
          )
          .in('family_id', familyIds)
          .order('created_at', { ascending: false });

        if (collectionsError) {
          return res.status(500).json({ error: 'Failed to fetch collections' });
        }

        return res.status(200).json({ collections: collections || [] });

      case 'POST':
        // Create new collection or add recipe to collection
        if (req.body.collectionId && req.body.recipeId) {
          // Add recipe to collection
          const { collectionId, recipeId } = req.body as AddRecipeRequest;

          // Verify user has access to this collection
          const { data: collection } = await supabase
            .from('family_recipe_collections')
            .select('family_id')
            .eq('id', collectionId)
            .single();

          if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
          }

          // Verify user is family member
          const { data: membership } = await supabase
            .from('family_memberships')
            .select('id')
            .eq('family_id', collection.family_id)
            .eq('user_id', userId)
            .single();

          if (!membership) {
            return res.status(403).json({ error: 'No access to this collection' });
          }

          // Add recipe to collection
          const { error: addError } = await supabase.from('family_collection_recipes').insert({
            collection_id: collectionId,
            recipe_id: recipeId,
            added_by: userId,
          });

          if (addError) {
            if (addError.code === '23505') {
              // unique constraint violation
              return res.status(400).json({ error: 'Recipe already in collection' });
            }
            return res.status(500).json({ error: 'Failed to add recipe to collection' });
          }

          return res.status(200).json({ success: true, message: 'Recipe added to collection' });
        } else {
          // Create new collection
          const { name, description, isCollaborative = true } = req.body as CreateCollectionRequest;

          if (!name) {
            return res.status(400).json({ error: 'Collection name is required' });
          }

          // Get user's family (use first family if multiple)
          const { data: userFamily } = await supabase
            .from('family_memberships')
            .select('family_id')
            .eq('user_id', userId)
            .limit(1)
            .single();

          if (!userFamily) {
            return res
              .status(400)
              .json({ error: 'User must be part of a family to create collections' });
          }

          const { data: newCollection, error: createError } = await supabase
            .from('family_recipe_collections')
            .insert({
              family_id: userFamily.family_id,
              name,
              description,
              created_by: userId,
              is_collaborative: isCollaborative,
            })
            .select('*')
            .single();

          if (createError) {
            return res.status(500).json({ error: 'Failed to create collection' });
          }

          return res.status(201).json({ collection: newCollection });
        }

      case 'DELETE':
        const { collectionId, recipeId } = req.query;

        if (!collectionId) {
          return res.status(400).json({ error: 'Collection ID is required' });
        }

        if (recipeId) {
          // Remove recipe from collection
          return await removeRecipeFromCollection(
            supabase,
            userId,
            collectionId as string,
            recipeId as string,
            res
          );
        } else {
          // Delete entire collection
          return await deleteEntireCollection(supabase, userId, collectionId as string, res);
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Family collections error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
