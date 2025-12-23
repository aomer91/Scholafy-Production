
import { createClient } from '@supabase/supabase-js';

/**
 * DATABASE CONNECTION
 * These keys are now configured. 
 * IMPORTANT: Ensure you have run the code in 'schema.sql' in your Supabase SQL Editor.
 */
const supabaseUrl: string = 'https://wfhcsscxodigflupaddq.supabase.co';
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaGNzc2N4b2RpZ2ZsdXBhZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDg0OTQsImV4cCI6MjA4MTYyNDQ5NH0.P_5Ci7axo68rEJ5DZL1luI_MLxe-Bh4kX-3jv86mp9c';

export const isSupabaseConfigured = () => {
  return (
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key' &&
    supabaseUrl.includes('supabase.co') &&
    supabaseAnonKey.length > 20
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});
