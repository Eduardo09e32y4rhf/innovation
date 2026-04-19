import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side Supabase client (for Client Components)
 * This file is safe to import in client-side code because it doesn't use next/headers.
 */
export const createClientComponentClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
