
import { createClient } from '@supabase/supabase-js';

/**
 * DATABASE CONNECTION
 * Credentials are loaded from environment variables.
 * Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * See .env.example for the template.
 */
// Fallback to hardcoded values if env vars are missing or TRUNCATED (ensures deploy works)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://wfhcsscxodigflupaddq.supabase.co";

// Validate key length! Correct key is ~208 chars. If env var is truncated (e.g. 147 chars), ignore it.
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const validEnvKey = (envKey && envKey.length > 200) ? envKey : null;

const supabaseAnonKey = validEnvKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGNzc2N4b2RpZ2ZsdXBhZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDg0OTQsImV4cCI6MjA4MTYyNDQ5NH0.P_5Ci7axo68rEJ5DZL1luI_MLxe-Bh4kX-3jv86mp9c";






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
