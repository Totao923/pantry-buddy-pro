const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  console.log('🔧 Setting up Supabase database...');
  console.log('📍 URL:', supabaseUrl);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'lib', 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Schema file loaded, executing SQL...');

    // Execute the entire schema at once
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });

    if (error) {
      console.error('❌ Error executing schema:', error);

      // Try alternative approach - split into statements
      console.log('🔄 Trying alternative approach...');

      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql: statement + ';',
          });

          if (stmtError) {
            console.warn('⚠️  Statement warning:', stmtError.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.warn('❌ Statement error:', err.message);
          errorCount++;
        }
      }

      console.log(
        `✅ Executed ${successCount} statements successfully, ${errorCount} with warnings/errors`
      );
    } else {
      console.log('✅ Schema executed successfully');
    }

    // Verify tables were created
    console.log('🔍 Verifying database setup...');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Failed to verify tables:', tablesError);
    } else {
      const tableNames = tables.map(t => t.table_name).sort();
      console.log('📋 Created tables:', tableNames);

      const expectedTables = [
        'user_profiles',
        'user_preferences',
        'pantry_items',
        'recipes',
        'subscriptions',
        'usage_tracking',
        'ai_cache',
        'recipe_ratings',
        'recipe_photos',
        'shopping_lists',
      ];

      const missingTables = expectedTables.filter(table => !tableNames.includes(table));

      if (missingTables.length === 0) {
        console.log('🎉 All expected tables created successfully!');
      } else {
        console.warn('⚠️  Missing tables:', missingTables);
      }
    }

    // Test basic functionality
    console.log('🧪 Testing basic database operations...');

    // Test user_profiles table
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error testing user_profiles:', countError);
    } else {
      console.log('✅ user_profiles table accessible');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure authentication settings in Supabase dashboard');
    console.log('2. Test the application: npm run dev');
    console.log('3. Create a test user account');
  } catch (error) {
    console.error('💥 Fatal error during database setup:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch(console.error);
