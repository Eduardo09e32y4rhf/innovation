import { AuthService } from '@/services/api';

export async function signUp(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
        await AuthService.login({ email, password }); // Placeholder since register is not public yet
        return '/dashboard';
    } catch (e) {
        return '/signin/password_signin';
    }
}

export async function updatePassword(formData: FormData): Promise<string> {
    try {
        return '/dashboard';
    } catch (e) {
        return '/signin/password_signin';
    }
}

export async function requestPasswordUpdate(formData: FormData): Promise<string> {
    try {
        return '/signin/password_signin';
    } catch (e) {
        return '/signin/password_signin';
    }
}

export async function signInWithPassword(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
        await AuthService.login({ email, password });
        return '/dashboard';
    } catch (e) {
        return '/signin/password_signin';
    }
}

export async function signInWithEmail(formData: FormData): Promise<string> {
    try {
        return '/signin/email_signin';
    } catch (e) {
        return '/signin/email_signin';
    }
}

export async function SignOut(formData: FormData): Promise<string> {
    return '/signin';
}

export async function updateName(formData: FormData): Promise<string> {
    return '/account';
}

export async function updateEmail(formData: FormData): Promise<string> {
    return '/account';
}

// Removed duplicate block
