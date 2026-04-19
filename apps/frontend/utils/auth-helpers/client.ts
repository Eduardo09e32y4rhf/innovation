'use client';

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClientComponentClient } from '@/lib/supabase';

/**
 * Handles form submission for auth actions (signUp, updatePassword, etc.)
 * Submits the form data and redirects if a router is provided.
 */
export async function handleRequest(
  e: React.FormEvent<HTMLFormElement>,
  authAction: (formData: FormData) => Promise<string>,
  router: AppRouterInstance | null
): Promise<void> {
  e.preventDefault();

  const formData = new FormData(e.currentTarget);

  const redirectUrl: string = await authAction(formData);

  if (router) {
    router.push(redirectUrl);
  } else {
    window.location.href = redirectUrl;
  }
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = createClientComponentClient();
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}
