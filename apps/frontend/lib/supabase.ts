

// No database.types needed for basic auth

import { createClientComponentClient } from '@supabase/ssr';

export const createClientComponentClient = () => 
  createClientComponentClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Server-side Supabase client (for server actions/pages)
export const createClientServer = () => 
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {}
    }
  );

// Route handler middleware client
export const createClientRouteHandler = (req: NextRequest) =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            req.cookies.set(
              {
                name,
                value,
                ...options,
              },
              {
                from: 'server',
              }
            );
          } catch {
            // Ignore cookie set errors
          }
        },
        remove(name: string, options: any) {
          try {
            req.cookies.set(
              {
                name,
                value: '',
                ...options,
              },
              {
                from: 'server',
              }
            );
          } catch {
            // Ignore cookie remove errors
          }
        },
      },
    }
  );

// Server component client (pages with cookies)
export const createClientCookie = () =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookies(),
    }
  );

