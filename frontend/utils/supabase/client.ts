import { createBrowserClient } from '@supabase/ssr';

// Define a function to create a Supabase client for client-side operations
export const createClient = () =>
  createBrowserClient(
    // Pass Supabase URL and anonymous key from the environment to the client
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example'
  );
