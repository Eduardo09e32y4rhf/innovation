import { AuthService, SubscriptionsService } from '@/services/api';
import { createClientCookie } from '@/lib/supabase-server';

export async function signUp(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
        const supabase = createClientCookie();
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return '/onboarding'; // or email confirmation
    } catch (e: any) {
        console.error('SignUp error:', e);
        return '/signin/signup';
    }
}

export async function updatePassword(formData: FormData): Promise<string> {
    const password = formData.get('password') as string;
    try {
        const supabase = createClientCookie();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        return '/dashboard';
    } catch (e: any) {
        console.error('UpdatePassword error:', e);
        return '/signin/update_password';
    }
}

export async function requestPasswordUpdate(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    try {
        const supabase = createClientCookie();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        });
        if (error) throw error;
        return '/signin/password_signin?message=Check your email';
    } catch (e) {
        return '/signin/forgot_password';
    }
}

export async function signInWithPassword(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
        await AuthService.login({ email, password });
        // Check subscription after login
        const status = await SubscriptionsService.getStatus();
        if (status.active && !status.overdue) {
            return '/dashboard';
        }
        const redirectTo = status.overdue ? '/subscription?status=overdue' : '/subscription';
        return redirectTo;
    } catch (e) {
        return '/signin/password_signin';
    }
}


export async function signInWithEmail(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    try {
        const supabase = createClientCookie();
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        return '/signin/check-email?message=Check your email';
    } catch (e: any) {
        console.error('signInWithEmail error:', e);
        return '/signin/email_signin';
    }
}

export async function SignOut(formData: FormData): Promise<string> {
    try {
        await AuthService.logout();
        return '/';
    } catch (e) {
        return '/signin';
    }
}

export async function updateName(formData: FormData): Promise<string> {
    return '/account';
}

export async function updateEmail(formData: FormData): Promise<string> {
    return '/account';
}
