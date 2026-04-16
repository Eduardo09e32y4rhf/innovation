'use server';

import { createClient } from '@/utils/supabase/server';
import { getURL } from '@/utils/helpers';

export async function signInWithPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return '/signin/password_signin?error=' + encodeURIComponent(error.message);
  }

  return '/dashboard';
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getURL('/auth/callback')
    }
  });

  if (error) {
    return '/signin/email_signin?error=' + encodeURIComponent(error.message);
  }

  return '/signin/email_signin?message=Check your email for the login link.';
}

export async function requestPasswordUpdate(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getURL('/auth/reset_password')
  });

  if (error) {
    return '/signin/forgot_password?error=' + encodeURIComponent(error.message);
  }

  return '/signin/forgot_password?message=Check your email for the password reset link.';
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    return '/signin/update_password?error=' + encodeURIComponent(error.message);
  }

  return '/dashboard';
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getURL('/auth/callback')
    }
  });

  if (error) {
    return '/signin/signup?error=' + encodeURIComponent(error.message);
  }

  return '/signin/signup?message=Check your email for the confirmation link.';
}
