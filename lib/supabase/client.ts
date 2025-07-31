import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

// Client-side Supabase client
export const createSupabaseClient = () => {
  return createClientComponentClient<Database>();
};

// Server-side Supabase client for API routes
export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
};

// Service role client for admin operations (server-side only)
export const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Utility function to handle Supabase errors
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  
  // Common error mappings
  const errorMappings: Record<string, string> = {
    'auth/user-not-found': 'User account not found',
    'auth/wrong-password': 'Invalid password',
    'auth/email-already-in-use': 'Email address is already registered',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-email': 'Invalid email address',
    'PGRST301': 'Duplicate entry - this item already exists',
    'PGRST116': 'Row level security violation - access denied',
    '23505': 'This item already exists in your account'
  };

  const errorCode = error?.code || error?.error_description || error?.message;
  const userFriendlyMessage = errorMappings[errorCode] || 
    `An error occurred during ${operation}. Please try again.`;

  return {
    error: true,
    message: userFriendlyMessage,
    originalError: error
  };
};

// Connection health check
export const checkSupabaseConnection = async () => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.warn('Supabase connection check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Supabase connection check failed:', error);
    return false;
  }
};

// Retry mechanism for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      console.warn(`Operation failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw new Error('Max retries exceeded');
};