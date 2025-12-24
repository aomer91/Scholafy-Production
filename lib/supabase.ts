
import { createClient } from '@supabase/supabase-js';

/**
 * DATABASE CONNECTION
 * Credentials are loaded from environment variables.
 * Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * See .env.example for the template.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here' &&
    supabaseUrl.includes('supabase.co') &&
    supabaseAnonKey.length > 20
  );
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please create a .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});
