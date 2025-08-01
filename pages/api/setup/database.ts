import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createSupabaseServiceClient();

    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'lib/supabase/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];

    // Execute each statement
    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';',
        });

        if (error) {
          console.warn('Statement warning:', error.message);
          results.push({
            statement: statement.substring(0, 50) + '...',
            status: 'warning',
            error: error.message,
          });
        } else {
          results.push({ statement: statement.substring(0, 50) + '...', status: 'success' });
        }
      } catch (err: any) {
        console.warn('Statement error:', err.message);
        results.push({
          statement: statement.substring(0, 50) + '...',
          status: 'error',
          error: err.message,
        });
      }
    }

    // Test connection by checking if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      throw new Error(`Failed to verify tables: ${tablesError.message}`);
    }

    const expectedTables = [
      'user_profiles',
      'user_preferences',
      'pantry_items',
      'recipes',
      'subscriptions',
      'usage_tracking',
      'ai_cache',
    ];

    const existingTables = tables?.map(t => t.table_name) || [];
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    res.status(200).json({
      success: true,
      message: 'Database setup completed',
      results,
      tables: {
        existing: existingTables,
        missing: missingTables,
        total: existingTables.length,
      },
    });
  } catch (error: any) {
    console.error('Database setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set up database',
      details: error,
    });
  }
}
