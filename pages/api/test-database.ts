import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createSupabaseServiceClient();
    
    // Test each table individually
    const tables = [
      'user_profiles',
      'user_preferences', 
      'pantry_items',
      'recipes',
      'subscriptions',
      'usage_tracking',
      'ai_cache',
      'recipe_ratings', 
      'recipe_photos',
      'shopping_lists'
    ];
    
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          tableStatus[table] = { exists: false, error: error.message };
        } else {
          tableStatus[table] = { exists: true, count: count || 0 };
        }
      } catch (err: any) {
        tableStatus[table] = { exists: false, error: err.message };
      }
    }
    
    const existingTables = Object.keys(tableStatus).filter(table => tableStatus[table].exists);
    const missingTables = Object.keys(tableStatus).filter(table => !tableStatus[table].exists);
    
    const isFullySetup = missingTables.length === 0;
    
    res.status(200).json({
      success: true,
      database: {
        fullySetup: isFullySetup,
        existingTables: existingTables.length,
        missingTables: missingTables.length,
        tables: tableStatus
      },
      message: isFullySetup 
        ? 'Database is fully set up!' 
        : `Database needs setup. Missing ${missingTables.length} tables.`
    });
    
  } catch (error: any) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to test database',
      details: error
    });
  }
}