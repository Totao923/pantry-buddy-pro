const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('🔧 Testing Supabase connection...');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Anon key present:', !!supabaseAnonKey);
  console.log('🔑 Service key present:', !!serviceRoleKey);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  // Test with anon key (client-side)
  console.log('\n📱 Testing client connection (anon key)...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await anonClient.auth.getSession();
    if (error) {
      console.log('⚠️  Auth session error (expected):', error.message);
    } else {
      console.log('✅ Client connection successful');
    }
  } catch (err) {
    console.error('❌ Client connection failed:', err.message);
  }
  
  // Test with service role key (server-side)
  if (serviceRoleKey) {
    console.log('\n🔧 Testing service connection (service role key)...');
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    try {
      // Try to access auth.users (only available with service role)
      const { data, error } = await serviceClient.auth.admin.listUsers();
      
      if (error) {
        console.log('⚠️  Service connection error:', error.message);
      } else {
        console.log('✅ Service connection successful');
        console.log('👥 Total users:', data?.users?.length || 0);
      }
    } catch (err) {
      console.error('❌ Service connection failed:', err.message);
    }
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Create a new query');
  console.log('4. Copy and paste the contents of lib/supabase/schema.sql');
  console.log('5. Run the query to create all tables and policies');
  console.log('6. Go to Authentication > Settings to configure auth');
}

testConnection().catch(console.error);