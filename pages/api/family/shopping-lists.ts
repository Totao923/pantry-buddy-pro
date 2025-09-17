import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

interface CreateShoppingListRequest {
  name: string;
  mealPlanIds?: string[];
  items?: Array<{
    name: string;
    quantity: string;
    category?: string;
    isChecked?: boolean;
  }>;
}

interface UpdateShoppingListRequest {
  listId: string;
  name?: string;
  items?: Array<{
    name: string;
    quantity: string;
    category?: string;
    isChecked?: boolean;
  }>;
  isCompleted?: boolean;
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
        // Get family shopping lists
        const { data: userFamilies } = await supabase
          .from('family_memberships')
          .select('family_id')
          .eq('user_id', userId);

        if (!userFamilies || userFamilies.length === 0) {
          return res.status(200).json({ shoppingLists: [] });
        }

        const familyIds = userFamilies.map(f => f.family_id);

        const { data: shoppingLists, error: fetchError } = await supabase
          .from('family_shopping_lists')
          .select(
            `
            *,
            family_groups(name),
            user_profiles!created_by(email)
          `
          )
          .in('family_id', familyIds)
          .order('created_at', { ascending: false });

        if (fetchError) {
          return res.status(500).json({ error: 'Failed to fetch shopping lists' });
        }

        // Parse JSON items for each shopping list
        const parsedShoppingLists = (shoppingLists || []).map(list => ({
          ...list,
          items: typeof list.items === 'string' ? JSON.parse(list.items) : list.items || [],
        }));

        return res.status(200).json({ shoppingLists: parsedShoppingLists });

      case 'POST':
        if (req.body.listId) {
          // Update existing shopping list
          const { listId, name, items, isCompleted } = req.body as UpdateShoppingListRequest;

          // Verify user has access to this shopping list
          const { data: shoppingList } = await supabase
            .from('family_shopping_lists')
            .select('family_id')
            .eq('id', listId)
            .single();

          if (!shoppingList) {
            return res.status(404).json({ error: 'Shopping list not found' });
          }

          // Verify user is family member
          const { data: membership } = await supabase
            .from('family_memberships')
            .select('id')
            .eq('family_id', shoppingList.family_id)
            .eq('user_id', userId)
            .single();

          if (!membership) {
            return res.status(403).json({ error: 'No access to this shopping list' });
          }

          // Prepare update data
          const updateData: any = {};
          if (name !== undefined) updateData.name = name;
          if (items !== undefined) updateData.items = JSON.stringify(items);
          if (isCompleted !== undefined) updateData.is_completed = isCompleted;
          updateData.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('family_shopping_lists')
            .update(updateData)
            .eq('id', listId);

          if (updateError) {
            return res.status(500).json({ error: 'Failed to update shopping list' });
          }

          return res.status(200).json({ success: true, message: 'Shopping list updated' });
        } else {
          // Create new shopping list
          const { name, mealPlanIds = [], items = [] } = req.body as CreateShoppingListRequest;

          if (!name) {
            return res.status(400).json({ error: 'Shopping list name is required' });
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
              .json({ error: 'User must be part of a family to create shopping lists' });
          }

          // If meal plan IDs provided, aggregate their shopping lists
          let aggregatedItems = [...items];

          if (mealPlanIds.length > 0) {
            // Verify meal plans belong to the family
            const { data: mealPlans } = await supabase
              .from('meal_plans')
              .select('id, shopping_list')
              .in('id', mealPlanIds)
              .or(`user_id.eq.${userId},shared_with.cs.{${userId}}`);

            if (mealPlans) {
              mealPlans.forEach(plan => {
                if (plan.shopping_list && Array.isArray(plan.shopping_list)) {
                  aggregatedItems = [...aggregatedItems, ...plan.shopping_list];
                }
              });

              // Remove duplicates and combine quantities
              const itemMap = new Map();
              aggregatedItems.forEach(item => {
                const key = `${item.name.toLowerCase()}_${item.category || 'other'}`;
                if (itemMap.has(key)) {
                  const existing = itemMap.get(key);
                  // Simple quantity combination (this could be more sophisticated)
                  existing.quantity = `${existing.quantity} + ${item.quantity}`;
                } else {
                  itemMap.set(key, { ...item });
                }
              });

              aggregatedItems = Array.from(itemMap.values());
            }
          }

          const { data: newShoppingList, error: createError } = await supabase
            .from('family_shopping_lists')
            .insert({
              family_id: userFamily.family_id,
              name,
              created_by: userId,
              meal_plan_ids: mealPlanIds,
              items: JSON.stringify(aggregatedItems),
            })
            .select('*')
            .single();

          if (createError) {
            return res.status(500).json({ error: 'Failed to create shopping list' });
          }

          return res.status(201).json({ shoppingList: newShoppingList });
        }

      case 'DELETE':
        // Delete shopping list
        const { listId } = req.query;

        if (!listId) {
          return res.status(400).json({ error: 'Shopping list ID is required' });
        }

        // Verify user has access to delete this shopping list
        const { data: listToDelete } = await supabase
          .from('family_shopping_lists')
          .select('family_id, created_by')
          .eq('id', listId as string)
          .single();

        if (!listToDelete) {
          return res.status(404).json({ error: 'Shopping list not found' });
        }

        // Verify user is family member and has permission to delete
        const { data: userMembership } = await supabase
          .from('family_memberships')
          .select('role')
          .eq('family_id', listToDelete.family_id)
          .eq('user_id', userId)
          .single();

        if (!userMembership) {
          return res.status(403).json({ error: 'No access to this shopping list' });
        }

        // Only creator, owner, or admin can delete
        const canDelete =
          listToDelete.created_by === userId ||
          userMembership.role === 'owner' ||
          userMembership.role === 'admin';

        if (!canDelete) {
          return res.status(403).json({ error: 'No permission to delete this shopping list' });
        }

        const { error: deleteError } = await supabase
          .from('family_shopping_lists')
          .delete()
          .eq('id', listId as string);

        if (deleteError) {
          return res.status(500).json({ error: 'Failed to delete shopping list' });
        }

        return res.status(200).json({ success: true, message: 'Shopping list deleted' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Family shopping lists error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
