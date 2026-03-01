import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define a function to create a Supabase client for server-side operations
// The function takes a cookie store created with next/headers cookies as an argument
export const createClient = () => {
  return createServerClient(
    // Pass Supabase URL and anonymous key from the environment to the client
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example',

    // Define a cookies object with methods for interacting with the cookie store and pass it to the client
    {
      cookies: {
        // The get method is used to retrieve a cookie by its name
        get(name: string) {
          // This is a known issue with Next.js 15+ where cookies() returns a Promise.
          // For @supabase/ssr, we bypass this for now by resolving cookies where needed
          // or treating this as synchronous (though this may cause warnings).
          // Proper fix requires migrating to latest supabase-js patterns.
          const cookieStore = cookies() as any;
          return cookieStore.get(name)?.value;
        },
        // The set method is used to set a cookie with a given name, value, and options
        set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = cookies() as any;
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // If the set method is called from a Server Component, an error may occur
            // This can be ignored if there is middleware refreshing user sessions
          }
        },
        // The remove method is used to delete a cookie by its name
        remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = cookies() as any;
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // If the remove method is called from a Server Component, an error may occur
            // This can be ignored if there is middleware refreshing user sessions
          }
        }
      }
    }
  );
};
