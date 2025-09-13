import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name];
          },
          set(name: string, value: string, options: any) {
            res.setHeader(
              'Set-Cookie',
              `${name}=${value}; ${Object.entries(options)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ')}`
            );
          },
          remove(name: string, options: any) {
            res.setHeader(
              'Set-Cookie',
              `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${Object.entries(options)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ')}`
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`📁 Exporting data for user: ${user.id} (${user.email})`);

    // Collect all user data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      },
      profile: null as any,
      preferences: null as any,
      subscription: null as any,
      ingredients: [] as any[],
      recipes: [] as any[],
      savedRecipes: [] as any[],
      mealPlans: [] as any[],
      shoppingLists: [] as any[],
      cookingSessions: [] as any[],
    };

    // Get profile
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      exportData.profile = profile;
    } catch (error) {
      console.log('No profile found');
    }

    // Get preferences
    try {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      exportData.preferences = preferences;
    } catch (error) {
      console.log('No preferences found');
    }

    // Get subscription
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, status, created_at, updated_at')
        .eq('user_id', user.id)
        .single();
      exportData.subscription = subscription;
    } catch (error) {
      console.log('No subscription found');
    }

    // Get ingredients
    try {
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id);
      exportData.ingredients = ingredients || [];
    } catch (error) {
      console.log('No ingredients found');
    }

    // Get recipes
    try {
      const { data: recipes } = await supabase.from('recipes').select('*').eq('user_id', user.id);
      exportData.recipes = recipes || [];
    } catch (error) {
      console.log('No recipes found');
    }

    // Get saved recipes
    try {
      const { data: savedRecipes } = await supabase
        .from('saved_recipes')
        .select('recipe_id, saved_at')
        .eq('user_id', user.id);
      exportData.savedRecipes = savedRecipes || [];
    } catch (error) {
      console.log('No saved recipes found');
    }

    // Get meal plans
    try {
      const { data: mealPlans } = await supabase
        .from('meal_plans')
        .select(
          `
          *,
          meal_plan_meals:meal_plan_meals(*)
        `
        )
        .eq('user_id', user.id);
      exportData.mealPlans = mealPlans || [];
    } catch (error) {
      console.log('No meal plans found');
    }

    // Get shopping lists
    try {
      const { data: shoppingLists } = await supabase
        .from('shopping_lists')
        .select(
          `
          *,
          items:shopping_list_items(*)
        `
        )
        .eq('user_id', user.id);
      exportData.shoppingLists = shoppingLists || [];
    } catch (error) {
      console.log('No shopping lists found');
    }

    // Get cooking sessions
    try {
      const { data: cookingSessions } = await supabase
        .from('cooking_sessions')
        .select('*')
        .eq('user_id', user.id);
      exportData.cookingSessions = cookingSessions || [];
    } catch (error) {
      console.log('No cooking sessions found');
    }

    console.log(`✅ Data export completed for user: ${user.email}`);

    // Set headers for file download
    const filename = `pantry-buddy-data-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).json(exportData);
  } catch (error) {
    console.error('❌ Data export error:', error);
    res.status(500).json({
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
